/**
 * Webhook do WhatsApp Business Cloud API (Meta).
 *
 * GET  — handshake de verificação (hub.mode / hub.verify_token / hub.challenge).
 * POST — valida X-Hub-Signature-256, persiste mensagens recebidas, processa
 *        callbacks de status e (se habilitado) aciona o pré-atendimento por IA.
 *
 * A rota é isenta do middleware de sessão (`/api/webhooks`), então a assinatura
 * HMAC é a única barreira de autenticação — sem ela, qualquer um acionaria a IA
 * e provocaria envio de WhatsApp para um número escolhido pelo atacante.
 *
 * Responde sempre 200 (exceto assinatura inválida → 401): 5xx faz a Meta
 * reentregar com backoff e, com falhas repetidas, desativar a inscrição.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processarMensagemRecebida } from "@/lib/whatsapp-pre-atendimento";
import { verificarAssinaturaMeta } from "@/lib/meta-webhook-signature";
import { extrairMensagens, extrairStatuses } from "@/lib/meta-webhook-payload";
import { registrarEntrada, avancarStatusPorWaMessageId } from "@/lib/whatsapp-mensagem";

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

export async function POST(req: Request) {
  // Lê o corpo cru UMA vez: o HMAC é sobre os bytes exatos enviados pela Meta.
  const rawBody = await req.text();

  const cfg = await prisma.config.findFirst();
  const appSecret =
    ((cfg as Record<string, unknown> | null)?.metaAppSecret as string | undefined)?.trim() ||
    process.env.META_APP_SECRET?.trim() ||
    "";

  const assinatura = req.headers.get("x-hub-signature-256");
  if (!verificarAssinaturaMeta(rawBody, assinatura, appSecret)) {
    console.warn("[Webhook Meta] Assinatura inválida — payload descartado");
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  try {
    const body = JSON.parse(rawBody) as unknown;

    // Callbacks de status: avançam o estado da mensagem já registrada.
    for (const s of extrairStatuses(body)) {
      await avancarStatusPorWaMessageId(s.waMessageId, s.status, {
        codigo: s.erroCodigo,
        msg: s.erroMsg,
      });
    }

    // Mensagens recebidas: persistidas SEMPRE — alimentam a janela de 24h e o
    // histórico, independentemente de o pré-atendimento estar ligado.
    const preAtendimentoAtivo = cfg?.whatsappPreAtendimento === 1;
    for (const m of extrairMensagens(body)) {
      const nova = await registrarEntrada({
        telefone: m.telefone,
        waMessageId: m.waMessageId,
        corpo: m.texto,
      });
      // `nova === false` é reentrega da Meta: não responder duas vezes.
      if (nova && preAtendimentoAtivo) {
        void processarMensagemRecebida(m.telefone, m.texto, m.nome);
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[Webhook Meta]", err);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
