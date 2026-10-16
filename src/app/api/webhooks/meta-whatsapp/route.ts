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
 * Confirma apenas eventos processados. Falha de persistência retorna 503 para
 * permitir reentrega; eventos de outros números não entram no CRM.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processarMensagemRecebida } from "@/lib/whatsapp-pre-atendimento";
import { verificarAssinaturaMeta } from "@/lib/meta-webhook-signature";
import { extrairMensagens, extrairStatuses } from "@/lib/meta-webhook-payload";
import { registrarEntrada, avancarStatusPorWaMessageId } from "@/lib/whatsapp-mensagem";
import { recordMetaWebhook } from '@/lib/meta-webhook-telemetry';

function eventosDoNumero(body: unknown, phoneNumberId: string) {
  const entries = body && typeof body === "object" ? (body as Record<string, unknown>).entry : null;
  if (!Array.isArray(entries)) return { entry: [] };
  return { entry: entries.flatMap((entry: unknown) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    if (!Array.isArray(record.changes)) return [];
    const changes = record.changes.filter((change: unknown) => {
      if (!change || typeof change !== "object") return false;
      const value = (change as Record<string, unknown>).value;
      if (!value || typeof value !== "object") return false;
      const metadata = (value as Record<string, unknown>).metadata;
      return !!metadata && typeof metadata === "object" &&
        (metadata as Record<string, unknown>).phone_number_id === phoneNumberId;
    });
    return changes.length ? [{ ...record, changes }] : [];
  }) };
}

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
    recordMetaWebhook('signature_rejected');
    console.warn("[Webhook Meta] Assinatura inválida — payload descartado");
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  const rawPhoneId = (cfg as Record<string, unknown> | null)?.metaWhatsappPhoneNumberId;
  const phoneNumberId = (typeof rawPhoneId === "string" ? rawPhoneId.trim() : "") ||
    process.env.META_WHATSAPP_PHONE_NUMBER_ID?.trim() || "";
  if (!/^\d+$/.test(phoneNumberId)) {
    recordMetaWebhook('number_missing');
    return NextResponse.json({ error: "Número Meta não configurado" }, { status: 503 });
  }

  try {
    const body = eventosDoNumero(JSON.parse(rawBody) as unknown, phoneNumberId);
    const acceptedChanges = body.entry.reduce((count, entry) => count + entry.changes.length, 0);
    let storedMessages = 0;

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
      if (nova) storedMessages++;
      // `nova === false` é reentrega da Meta: não responder duas vezes.
      if (nova && preAtendimentoAtivo) {
        void processarMensagemRecebida(m.telefone, m.texto, m.nome);
      }
    }

    recordMetaWebhook('processed', acceptedChanges, storedMessages);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    recordMetaWebhook('processing_failed');
    console.error("[Webhook Meta]", err);
    return NextResponse.json({ error: "Falha temporária ao registrar evento" }, { status: 503 });
  }
}
