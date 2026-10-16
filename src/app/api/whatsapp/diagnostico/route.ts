import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { getWhatsAppFlags } from "@/lib/whatsapp";
import { getInstanceState } from "@/lib/evolution";
import { metaWebhookTelemetry } from '@/lib/meta-webhook-telemetry';

/**
 * GET /api/whatsapp/diagnostico
 * Diagnoses WhatsApp / Evolution API status and configuration.
 */
export async function GET() {
  const ok = await requireAdmin();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const selected = await prisma.config.findFirst() as Record<string, unknown> | null;
  if ((selected?.whatsappProvider || process.env.WHATSAPP_PROVIDER) === "meta_cloud") {
    const text = (v: unknown) => typeof v === "string" ? v.trim() : "";
    const token = text(selected?.metaWhatsappToken) || process.env.META_WHATSAPP_TOKEN?.trim();
    const phoneId = text(selected?.metaWhatsappPhoneNumberId) || process.env.META_WHATSAPP_PHONE_NUMBER_ID?.trim() || "";
    const rawVersion = text(selected?.metaWhatsappApiVersion) || "v21.0";
    const version = /^v\d+\.\d+$/.test(rawVersion) ? rawVersion : "v21.0";
    let tokenCheck: Record<string, unknown> = { ok: false, reason: "TOKEN_OU_NUMERO_AUSENTE" };
    if (token && /^\d+$/.test(phoneId)) {
      try {
        // Somente leitura. A chave permanece no servidor, fora de URLs/logs/resposta.
        const res = await fetch(`https://graph.facebook.com/${version}/${phoneId}?fields=id,display_phone_number,verified_name`, {
          method: "GET", headers: { Authorization: `Bearer ${token}` },
          cache: "no-store", signal: AbortSignal.timeout(10000),
        });
        const data = await res.json();
        tokenCheck = res.ok ? {
          ok: data.id === phoneId, phoneMatches: data.id === phoneId,
          displayPhoneNumber: data.display_phone_number, verifiedName: data.verified_name,
        } : { ok: false, httpStatus: res.status, errorCode: typeof data.error?.code === "number" ? data.error.code : null };
      } catch {
        tokenCheck = { ok: false, reason: "CONSULTA_META_INDISPONIVEL" };
      }
    }
    let reception: Record<string, unknown>;
    try {
      const recent = await prisma.whatsAppMensagem.findMany({
        where: { direcao: "in", criadoEm: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        orderBy: { criadoEm: "desc" }, take: 5, select: { id: true, criadoEm: true },
      });
      reception = { recentCount: recent.length, sampleLimit: 5, windowHours: 24,
        latestReceivedAt: recent[0]?.criadoEm ?? null,
        note: "Registros de entrada no Manager; confirme horário e origem com uma mensagem nova para provar o teste do8250." };
    } catch {
      reception = { available: false, reason: "CONSULTA_DE_ENTRADAS_INDISPONIVEL" };
    }
    return NextResponse.json({ provider: "meta_cloud", checkedAt: new Date().toISOString(),
      sendingEnabled: selected?.whatsappAutoEnabled !== undefined
        ? selected.whatsappAutoEnabled === 1 : process.env.WHATSAPP_AUTO_ENABLED !== "0",
      tokenCheck, reception, webhookTelemetry: metaWebhookTelemetry(),
      status: tokenCheck.ok ? "AUTENTICACAO_CONFIRMADA" : "AUTENTICACAO_NAO_CONFIRMADA",
      note: "Autenticação não comprova envio/entrega. Este diagnóstico não envia mensagens nem ativa automações.",
    }, { headers: { "Cache-Control": "no-store" } });
  }

  const diagnostico: Record<string, unknown> = {};

  // 1. Check config
  try {
    const cfg = await prisma.config.findFirst();
    diagnostico.config = {
      evolutionApiUrl: cfg?.evolutionApiUrl ? "configurado" : "VAZIO",
      evolutionApiKey: cfg?.evolutionApiKey ? "configurado" : "VAZIO",
      evolutionInstance: cfg?.evolutionInstance || "VAZIO",
      whatsappAutoEnabled: cfg?.whatsappAutoEnabled,
      whatsappAutoRecibo: cfg?.whatsappAutoRecibo,
      whatsappAutoBoleto: cfg?.whatsappAutoBoleto,
      whatsappAutoLembrete: cfg?.whatsappAutoLembrete,
      whatsappAutoReativacao: cfg?.whatsappAutoReativacao,
      whatsappAutoAniversario: cfg?.whatsappAutoAniversario,
    };
  } catch (err) {
    diagnostico.config = { error: String(err) };
  }

  // 2. Check WhatsApp flags/master switch (dados de conexao ficam a cargo de
  // whatsapp-provider.ts; aqui reaproveitamos o cfg bruto so para exibicao).
  try {
    const flags = await getWhatsAppFlags();
    const cfg = await prisma.config.findFirst();
    // Resolve baseUrl/instance com o mesmo fallback env + default "bfx" de
    // whatsapp-provider.ts::buildEvolution, senao o diagnostico mostraria
    // null quando a config vem de variaveis de ambiente (falso negativo).
    diagnostico.whatsappConfig = flags
      ? {
          baseUrl:
            cfg?.evolutionApiUrl?.trim() || process.env.EVOLUTION_API_URL?.trim() || null,
          instance:
            cfg?.evolutionInstance?.trim() ||
            process.env.EVOLUTION_INSTANCE?.trim() ||
            "bfx",
          enabled: flags.enabled,
        }
      : { error: "WhatsApp desabilitado (whatsappAutoEnabled=0)" };
  } catch (err) {
    diagnostico.whatsappConfig = { error: String(err) };
  }

  // 3. Check instance state
  try {
    const state = await getInstanceState();
    diagnostico.instanceState = state;
  } catch (err) {
    diagnostico.instanceState = { error: String(err) };
  }

  // 4. Check recent WhatsApp logs
  try {
    const recentLogs = await prisma.whatsAppEnvioLog.findMany({
      orderBy: { dataEnvio: "desc" },
      take: 10,
      select: { id: true, tipo: true, dataEnvio: true, clienteId: true },
    });
    diagnostico.recentLogs = {
      count: recentLogs.length,
      logs: recentLogs,
    };
  } catch (err) {
    diagnostico.recentLogs = { error: String(err) };
  }

  // 5. Summary
  const issues: string[] = [];
  const cfg = diagnostico.config as Record<string, unknown>;
  if (cfg?.evolutionApiUrl === "VAZIO") issues.push("Evolution API URL nao configurada");
  if (cfg?.evolutionApiKey === "VAZIO") issues.push("Evolution API Key nao configurada");
  if (cfg?.evolutionInstance === "VAZIO") issues.push("Evolution Instance nao configurada");
  if (cfg?.whatsappAutoEnabled === 0) issues.push("WhatsApp auto desabilitado (whatsappAutoEnabled=0)");

  const state = diagnostico.instanceState as Record<string, unknown>;
  if (state?.state === "close") issues.push("Instancia desconectada — precisa escanear QR code");
  if (state?.state === "unknown") issues.push("Instancia nao encontrada — pode ser necessario recriar");
  if (state?.error) issues.push("Erro ao verificar instancia: " + String(state.error));

  diagnostico.issues = issues;
  diagnostico.status = issues.length === 0 ? "OK" : "PROBLEMAS_ENCONTRADOS";

  return NextResponse.json(diagnostico);
}
