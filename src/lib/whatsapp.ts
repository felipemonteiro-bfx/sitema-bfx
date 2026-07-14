/**
 * Envio de mensagens WhatsApp.
 *
 * Este módulo é o ponto de entrada estável para todos os consumidores (crons,
 * email.ts, boleto-actions.ts, fluxo de venda). O transporte real é escolhido
 * pela abstração de provider (`whatsapp-provider.ts`): Evolution (padrão) ou
 * Meta WhatsApp Business Cloud API (oficial). As assinaturas públicas abaixo
 * NÃO mudam ao trocar de provider.
 */

import { prisma } from "@/lib/db";
import {
  resolveWhatsAppProviders,
  type WhatsAppTemplate,
} from "@/lib/whatsapp-provider";

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

/** Deriva um nome de arquivo a partir da URL (para o campo filename dos providers). */
function filenameFromUrl(url: string): string {
  const semQuery = url.split("?")[0] ?? url;
  const partes = semQuery.split("/");
  const nome = partes[partes.length - 1];
  return nome && nome.length > 0 ? nome : "arquivo.pdf";
}

/**
 * Envia mensagem de texto pelo provider configurado (Evolution ou Meta).
 * Retorna true se enviado, false caso contrário (sem throw). Com Meta como
 * primário e fallback ligado, retenta via Evolution se o Meta falhar.
 */
export async function enviarWhatsAppTexto(
  telefone: string | null | undefined,
  texto: string
): Promise<boolean> {
  const numero = normalizarTelefone(telefone);
  if (!numero) return false;

  const { primary, fallback } = await resolveWhatsAppProviders();
  if (!primary) return false;

  const result = await primary.sendText(numero, texto);
  if (result.ok) return true;
  if (fallback) {
    const fb = await fallback.sendText(numero, texto);
    return fb.ok;
  }
  return false;
}

/**
 * Envia arquivo por URL (PDF de recibo/boleto) pelo provider configurado.
 * Útil para enviar link de documento. Retorna true se enviado.
 */
export async function enviarWhatsAppArquivo(
  telefone: string | null | undefined,
  urlArquivo: string,
  legenda?: string
): Promise<boolean> {
  const numero = normalizarTelefone(telefone);
  if (!numero) return false;

  const { primary, fallback } = await resolveWhatsAppProviders();
  if (!primary) return false;

  const doc = {
    url: urlArquivo,
    filename: filenameFromUrl(urlArquivo),
    mimetype: "application/pdf",
    caption: legenda || "",
  };
  const result = await primary.sendDocument(numero, doc);
  if (result.ok) return true;
  if (fallback) {
    const fb = await fallback.sendDocument(numero, doc);
    return fb.ok;
  }
  return false;
}

/**
 * Envia um template aprovado (mensagens business-initiated na Meta Cloud API).
 * No Evolution, cai para texto livre (`fallbackText`). Retorna true se enviado.
 */
export async function enviarWhatsAppTemplate(
  telefone: string | null | undefined,
  template: WhatsAppTemplate
): Promise<boolean> {
  const numero = normalizarTelefone(telefone);
  if (!numero) return false;

  const { primary, fallback } = await resolveWhatsAppProviders();
  if (!primary) return false;

  const result = await primary.sendTemplate(numero, template);
  if (result.ok) return true;
  if (fallback) {
    const fb = await fallback.sendTemplate(numero, template);
    return fb.ok;
  }
  return false;
}
