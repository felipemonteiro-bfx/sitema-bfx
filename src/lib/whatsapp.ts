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
import {
  registrarSaida,
  marcarEnviada,
  marcarFalha,
  dentroDaJanela24h,
  type OrigemMensagem,
} from "@/lib/whatsapp-mensagem";

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

export type EnvioWhatsApp = {
  telefone: string | null | undefined;
  clienteId?: number | null;
  origem: OrigemMensagem;
  template: WhatsAppTemplate;
};

/**
 * Ponto de entrada único de envio.
 *
 * Dentro da janela de 24h (houve inbound do cliente) envia texto livre, que é
 * mais barato e é o único formato que comporta resposta gerada por IA. Fora da
 * janela, a Meta só aceita template aprovado. Todo envio é registrado em
 * `WhatsAppMensagem` antes da chamada, para que o callback de status tenha onde
 * pousar.
 */
export async function enviarWhatsAppDetalhado(
  input: EnvioWhatsApp
): Promise<{ ok: boolean; mensagemId: number | null }> {
  const numero = normalizarTelefone(input.telefone);
  if (!numero) return { ok: false, mensagemId: null };

  const naJanela = await dentroDaJanela24h(numero);
  const usaTemplate = !naJanela;
  const corpo = input.template.fallbackText;

  const mensagemId = await registrarSaida({
    telefone: numero,
    clienteId: input.clienteId ?? null,
    origem: input.origem,
    templateNome: usaTemplate ? input.template.name : null,
    corpo,
  });

  if (usaTemplate && !input.template.name) {
    await marcarFalha(mensagemId, "janela_expirada");
    return { ok: false, mensagemId };
  }

  const { primary } = await resolveWhatsAppProviders();
  if (!primary) {
    await marcarFalha(mensagemId, "provider_nao_configurado");
    return { ok: false, mensagemId };
  }

  const resultado = usaTemplate
    ? await primary.sendTemplate(numero, input.template)
    : await primary.sendText(numero, corpo);

  if (resultado.ok) {
    await marcarEnviada(mensagemId, resultado.messageId);
    return { ok: true, mensagemId };
  }
  await marcarFalha(mensagemId, resultado.error || "erro_desconhecido");
  return { ok: false, mensagemId };
}

/** Invólucro para quem só precisa saber se o envio deu certo. */
export async function enviarWhatsApp(input: EnvioWhatsApp): Promise<boolean> {
  const { ok } = await enviarWhatsAppDetalhado(input);
  return ok;
}
