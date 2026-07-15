/**
 * Registry de templates do WhatsApp Business Cloud API (Meta).
 *
 * Mensagens business-initiated (crons de lembrete, cobrança, aniversário, etc.)
 * exigem templates APROVADOS no Meta. Os `name` abaixo DEVEM bater exatamente com
 * os templates aprovados na sua conta Meta Business.
 *
 * No provider Evolution (padrão atual), `enviarWhatsAppTemplate` cai para texto
 * livre usando o `fallbackText` — então adotar isto nos crons NÃO muda o
 * comportamento atual; só deixa tudo pronto para o Meta.
 */
import type { WhatsAppTemplate } from "@/lib/whatsapp-provider";

/** Idioma dos templates aprovados (ex.: "pt_BR"). Configurável por env. */
const LANG = process.env.META_TEMPLATE_LANG || "pt_BR";

/** Nomes dos templates — alinhe com os aprovados no seu Meta Business. */
export const TEMPLATES = {
  lembreteParcela: "bfx_lembrete_parcela",
  parcelaVencida: "bfx_parcela_vencida",
  aniversario: "bfx_aniversario",
  agradecimento: "bfx_agradecimento",
  nps: "bfx_nps",
  reativacao: "bfx_reativacao",
  boasVindas: "bfx_boas_vindas",
} as const;

/**
 * Monta um WhatsAppTemplate com fallback.
 * @param name        nome do template aprovado no Meta
 * @param bodyParams  variáveis do corpo ({{1}}, {{2}}, ...) na ordem do template
 * @param fallbackText texto completo enviado quando o provider não suporta template (Evolution)
 */
export function comFallback(name: string, bodyParams: string[], fallbackText: string): WhatsAppTemplate {
  return { name, language: LANG, bodyParams, fallbackText };
}
