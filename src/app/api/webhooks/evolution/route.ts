/**
 * Webhook para Evolution API - MESSAGES_UPSERT.
 * Recebe mensagens WhatsApp e responde com IA de pré-atendimento (se ativado).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processarMensagemRecebida } from "@/lib/whatsapp-pre-atendimento";

function extrairTexto(msg: unknown): string | null {
  if (!msg || typeof msg !== "object") return null;
  const m = msg as Record<string, unknown>;
  if (typeof m.conversation === "string") return m.conversation;
  const ext = m.extendedTextMessage;
  if (ext && typeof ext === "object" && typeof (ext as { text?: string }).text === "string") {
    return (ext as { text: string }).text;
  }
  return null;
}

function extrairRemoteJid(key: unknown): string | null {
  if (!key || typeof key !== "object") return null;
  const k = key as { remoteJid?: string };
  if (typeof k.remoteJid === "string") return k.remoteJid;
  return null;
}

function normalizarTelefone(jid: string): string {
  const nums = jid.replace(/\D/g, "");
  if (nums.startsWith("55") && nums.length >= 12) return nums;
  if (nums.length >= 10) return "55" + nums;
  return jid;
}

export async function POST(req: Request) {
  try {
    const cfg = await prisma.config.findFirst();
    const apiKey = cfg?.evolutionApiKey?.trim() || process.env.EVOLUTION_API_KEY?.trim();
    if (apiKey) {
      const incomingKey = req.headers.get("apikey") || req.headers.get("x-evolution-apikey");
      if (incomingKey !== apiKey) {
        return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: true }, { status: 200 });

    const event = (body as { event?: string }).event;
    if (event !== "MESSAGES_UPSERT") return NextResponse.json({ ok: true }, { status: 200 });

    const data = (body as { data?: unknown }).data;
    if (!data || typeof data !== "object") return NextResponse.json({ ok: true }, { status: 200 });

    const d = data as {
      key?: { remoteJid?: string; fromMe?: boolean };
      message?: unknown;
      pushName?: string;
    };

    const fromMe = d.key?.fromMe === true;
    if (fromMe) return NextResponse.json({ ok: true }, { status: 200 });

    const texto = extrairTexto(d.message);
    if (!texto || !texto.trim()) return NextResponse.json({ ok: true }, { status: 200 });

    const jid = extrairRemoteJid(d.key) || (d as { key?: { remoteJid?: string } }).key?.remoteJid;
    if (!jid) return NextResponse.json({ ok: true }, { status: 200 });

    const telefone = normalizarTelefone(jid);
    const nomeContato = typeof d.pushName === "string" ? d.pushName : undefined;

    const preAtendimentoAtivo = cfg?.whatsappPreAtendimento === 1;
    if (!preAtendimentoAtivo) return NextResponse.json({ ok: true }, { status: 200 });

    void processarMensagemRecebida(telefone, texto.trim(), nomeContato);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[Webhook Evolution]", err);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
