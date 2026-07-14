/**
 * Webhook do WhatsApp Business Cloud API (Meta).
 *
 * GET  — handshake de verificação (hub.mode / hub.verify_token / hub.challenge).
 * POST — mensagens recebidas; normaliza o payload da Meta para o mesmo shape que
 *        o webhook da Evolution entrega e delega a `processarMensagemRecebida`.
 *
 * Ativado apenas se `Config.whatsappPreAtendimento === 1` (igual à Evolution).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processarMensagemRecebida } from "@/lib/whatsapp-pre-atendimento";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const cfg = await prisma.config.findFirst();
  const rawToken = (cfg as Record<string, unknown> | null)?.metaWebhookVerifyToken;
  const verifyToken =
    (typeof rawToken === "string" ? rawToken.trim() : "") ||
    process.env.META_WHATSAPP_VERIFY_TOKEN?.trim();

  if (mode === "subscribe" && token && verifyToken && token === verifyToken) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "Verificação inválida" }, { status: 403 });
}

type MetaMessage = {
  from?: string;
  id?: string;
  type?: string;
  text?: { body?: string };
};

type MetaContact = { profile?: { name?: string }; wa_id?: string };

/** Extrai (telefone, texto, nomeContato) de mensagens de texto recebidas. */
function extrairMensagens(body: unknown): { telefone: string; texto: string; nome?: string }[] {
  const out: { telefone: string; texto: string; nome?: string }[] = [];
  if (!body || typeof body !== "object") return out;
  const entries = (body as { entry?: unknown[] }).entry;
  if (!Array.isArray(entries)) return out;

  for (const entry of entries) {
    const changes = (entry as { changes?: unknown[] }).changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const value = (change as { value?: unknown }).value as
        | { messages?: MetaMessage[]; contacts?: MetaContact[] }
        | undefined;
      if (!value?.messages) continue;
      const nomePorWaId = new Map<string, string>();
      for (const c of value.contacts ?? []) {
        if (c.wa_id && c.profile?.name) nomePorWaId.set(c.wa_id, c.profile.name);
      }
      for (const msg of value.messages) {
        if (msg.type !== "text" || !msg.from) continue;
        const texto = msg.text?.body?.trim();
        if (!texto) continue;
        out.push({ telefone: msg.from, texto, nome: nomePorWaId.get(msg.from) });
      }
    }
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: true }, { status: 200 });

    const cfg = await prisma.config.findFirst();
    const preAtendimentoAtivo = cfg?.whatsappPreAtendimento === 1;
    if (!preAtendimentoAtivo) return NextResponse.json({ ok: true }, { status: 200 });

    const mensagens = extrairMensagens(body);
    for (const m of mensagens) {
      void processarMensagemRecebida(m.telefone, m.texto, m.nome);
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[Webhook Meta]", err);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
