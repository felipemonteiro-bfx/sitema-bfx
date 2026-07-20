import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { getWhatsAppFlags } from "@/lib/whatsapp";
import { getInstanceState } from "@/lib/evolution";

/**
 * GET /api/whatsapp/diagnostico
 * Diagnoses WhatsApp / Evolution API status and configuration.
 */
export async function GET() {
  const ok = await requireAdmin();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    diagnostico.whatsappConfig = flags
      ? {
          baseUrl: cfg?.evolutionApiUrl || null,
          instance: cfg?.evolutionInstance || null,
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
