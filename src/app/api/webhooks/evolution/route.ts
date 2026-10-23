/**
 * Webhook para Evolution API - MESSAGES_UPSERT.
 * Só registra a pausa quando um humano responde pelo aparelho (fromMe); não responde mais ao cliente.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { marcarAtendimentoHumano } from "@/lib/whatsapp-pre-atendimento";

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
    if (!apiKey) return NextResponse.json({ error: "Webhook não configurado." }, { status: 503 });
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
      source?: string;
    };

    const jid = extrairRemoteJid(d.key) || (d as { key?: { remoteJid?: string } }).key?.remoteJid;

    const fromMe = d.key?.fromMe === true;
    if (fromMe) {
      // Só marca takeover humano se foi enviado por um dispositivo real (não pela IA via API)
      const source = typeof d.source === "string" ? d.source.toLowerCase() : "unknown";
      const enviadoPorHumano = source !== "unknown" && source !== "";
      if (enviadoPorHumano && jid) {
        const telefone = normalizarTelefone(jid);
        void marcarAtendimentoHumano(telefone);
      }
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Mensagem do cliente: as respostas automáticas só rodam pelo webhook oficial da Meta; aqui nada a fazer.
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[Webhook Evolution]", err);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
