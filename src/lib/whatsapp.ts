/**
 * Integração com Evolution API para envio de mensagens WhatsApp.
 * Documentação: https://doc.evolution-api.com/v2/api-reference/message-controller/send-text
 */

import { prisma } from "@/lib/db";

export type WhatsAppConfig = {
  baseUrl: string;
  apiKey: string;
  instance: string;
  enabled: boolean;
  autoRecibo: boolean;
  autoBoleto: boolean;
  autoLembrete: boolean;
  autoReativacao: boolean;
  autoAniversario: boolean;
  autoInadimplencia: boolean;
  autoNPS: boolean;
  autoBoasVindas: boolean;
  autoAgradecimento: boolean;
  diasInativo: number;
};

/** Obtém configuração do WhatsApp (Evolution API) - prioriza Config do DB, fallback para env. */
export async function getWhatsAppConfig(): Promise<WhatsAppConfig | null> {
  const cfg = await prisma.config.findFirst();
  const url =
    cfg?.evolutionApiUrl?.trim() || process.env.EVOLUTION_API_URL?.trim();
  const key =
    cfg?.evolutionApiKey?.trim() || process.env.EVOLUTION_API_KEY?.trim();
  const instance =
    cfg?.evolutionInstance?.trim() || process.env.EVOLUTION_INSTANCE?.trim() || "bfx";
  const enabled =
    cfg?.whatsappAutoEnabled !== undefined
      ? cfg.whatsappAutoEnabled === 1
      : process.env.WHATSAPP_AUTO_ENABLED !== "0";
  const autoRecibo = cfg?.whatsappAutoRecibo !== 0;
  const autoBoleto = cfg?.whatsappAutoBoleto !== 0;
  const autoLembrete = cfg?.whatsappAutoLembrete !== 0;
  const autoReativacao = cfg?.whatsappAutoReativacao === 1;
  const autoAniversario = cfg?.whatsappAutoAniversario === 1;
  const autoInadimplencia = cfg?.whatsappAutoInadimplencia === 1;
  const autoNPS = cfg?.whatsappAutoNPS === 1;
  const autoBoasVindas = cfg?.whatsappAutoBoasVindas === 1;
  const autoAgradecimento = cfg?.whatsappAutoAgradecimento === 1;
  const diasInativo = cfg?.whatsappDiasInativo ?? 60;

  if (!url || !key || !instance || !enabled) return null;
  return {
    baseUrl: url.replace(/\/$/, ""),
    apiKey: key,
    instance,
    enabled,
    autoRecibo,
    autoBoleto,
    autoLembrete,
    autoReativacao,
    autoAniversario,
    autoInadimplencia,
    autoNPS,
    autoBoasVindas,
    autoAgradecimento,
    diasInativo,
  };
}

/** Normaliza telefone para formato 55DDD9XXXXXXXX (sem + ou espaços). */
function normalizarTelefone(telefone: string | null | undefined): string | null {
  if (!telefone || typeof telefone !== "string") return null;
  const nums = telefone.replace(/\D/g, "");
  if (nums.length < 10) return null;
  // Se começa com 55 e tem 12+ dígitos, assume já formatado
  if (nums.startsWith("55") && nums.length >= 12) return nums;
  // Se tem 10-11 dígitos (DDD + 8 ou 9 dígitos), adiciona 55
  if (nums.length === 10 || nums.length === 11) return "55" + nums;
  return nums;
}

/**
 * Envia mensagem de texto via Evolution API.
 * Retorna true se enviado com sucesso, false caso contrário (sem throw).
 */
export async function enviarWhatsAppTexto(
  telefone: string | null | undefined,
  texto: string
): Promise<boolean> {
  const config = await getWhatsAppConfig();
  if (!config) return false;

  const numero = normalizarTelefone(telefone);
  if (!numero) return false;

  const url = `${config.baseUrl}/message/sendText/${config.instance}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.apiKey,
      },
      body: JSON.stringify({
        number: numero,
        text: texto,
        linkPreview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[WhatsApp] Erro Evolution API:", res.status, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[WhatsApp] Erro ao enviar:", err);
    return false;
  }
}

/**
 * Envia arquivo (URL) via Evolution API - sendMedia.
 * Útil para enviar link de PDF (recibo, boleto).
 */
export async function enviarWhatsAppArquivo(
  telefone: string | null | undefined,
  urlArquivo: string,
  legenda?: string
): Promise<boolean> {
  const config = await getWhatsAppConfig();
  if (!config) return false;

  const numero = normalizarTelefone(telefone);
  if (!numero) return false;

  const url = `${config.baseUrl}/message/sendMedia/${config.instance}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.apiKey,
      },
      body: JSON.stringify({
        number: numero,
        mediatype: "document",
        media: urlArquivo,
        caption: legenda || "",
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[WhatsApp] Erro Evolution API (sendMedia):", res.status, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[WhatsApp] Erro ao enviar arquivo:", err);
    return false;
  }
}
