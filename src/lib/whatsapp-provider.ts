/**
 * Abstração de provider de WhatsApp.
 *
 * Permite alternar entre Evolution API (não-oficial) e Meta WhatsApp Business
 * Cloud API (oficial, sem risco de ban) sem tocar nos consumidores — os crons,
 * `email.ts`, `boleto-actions.ts` e o fluxo de venda continuam chamando as
 * funções públicas de `whatsapp.ts`, que roteiam por aqui.
 *
 * O provider é escolhido por `Config.whatsappProvider` ("evolution" | "meta_cloud").
 * Com "meta_cloud" e `Config.whatsappFallbackEvolution = 1`, um envio que falha
 * no Meta é retentado via Evolution (migração gradual).
 */
import { prisma } from "@/lib/db";
import { EvolutionProvider } from "@/lib/providers/whatsapp-evolution";
import { MetaProvider } from "@/lib/providers/whatsapp-meta";

export type WhatsAppSendResult = {
  ok: boolean;
  messageId?: string;
  error?: string;
  provider: string;
};

export type WhatsAppDocument = {
  url?: string;
  base64?: string;
  filename: string;
  mimetype: string;
  caption?: string;
};

export type WhatsAppTemplate = {
  name: string;
  language: string;
  bodyParams: string[];
  headerDocumentUrl?: string;
  /** Texto renderizado usado quando o provider não suporta templates (Evolution). */
  fallbackText: string;
};

export interface WhatsAppProvider {
  readonly name: "evolution" | "meta_cloud";
  sendText(numeroE164: string, texto: string): Promise<WhatsAppSendResult>;
  sendButtons?(numeroE164:string,texto:string,botoes:{id:string;title:string}[]):Promise<WhatsAppSendResult>;
  sendDocument(numeroE164: string, doc: WhatsAppDocument): Promise<WhatsAppSendResult>;
  sendTemplate(numeroE164: string, tpl: WhatsAppTemplate): Promise<WhatsAppSendResult>;
}

export type ResolvedProviders = {
  primary: WhatsAppProvider | null;
  /** Evolution como fallback quando o primário é Meta e o fallback está ligado. */
  fallback: WhatsAppProvider | null;
  providerName: "evolution" | "meta_cloud";
};

type ConfigLike = Record<string, unknown> | null;

function str(v: unknown): string | undefined {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > 0 ? s : undefined;
}

/** Constrói o provider Evolution a partir de Config/env, ou null se não configurado. */
function buildEvolution(cfg: ConfigLike, enabled: boolean): EvolutionProvider | null {
  const url = str(cfg?.evolutionApiUrl) || str(process.env.EVOLUTION_API_URL);
  const key = str(cfg?.evolutionApiKey) || str(process.env.EVOLUTION_API_KEY);
  const instance = str(cfg?.evolutionInstance) || str(process.env.EVOLUTION_INSTANCE) || "bfx";
  if (!enabled || !url || !key || !instance) return null;
  return new EvolutionProvider({ baseUrl: url.replace(/\/$/, ""), apiKey: key, instance });
}

/** Constrói o provider Meta Cloud a partir de Config/env, ou null se não configurado. */
function buildMeta(cfg: ConfigLike, enabled: boolean): MetaProvider | null {
  const token = str(cfg?.metaWhatsappToken) || str(process.env.META_WHATSAPP_TOKEN);
  const phoneNumberId = str(cfg?.metaWhatsappPhoneNumberId) || str(process.env.META_WHATSAPP_PHONE_NUMBER_ID);
  const apiVersion =
    str(cfg?.metaWhatsappApiVersion) || str(process.env.META_WHATSAPP_API_VERSION) || "v21.0";
  if (!enabled || !token || !phoneNumberId) return null;
  return new MetaProvider({ token, phoneNumberId, apiVersion, freeServiceOnly: true });
}

/**
 * Resolve o provider primário e o fallback com base na tabela Config.
 * Preserva o master switch `whatsappAutoEnabled` — quando desligado, nada é enviado.
 */
export async function resolveWhatsAppProviders(): Promise<ResolvedProviders> {
  const cfg = (await prisma.config.findFirst()) as ConfigLike;

  const enabled =
    cfg?.whatsappAutoEnabled !== undefined
      ? cfg.whatsappAutoEnabled === 1
      : process.env.WHATSAPP_AUTO_ENABLED !== "0";

  const providerName = ((str(cfg?.whatsappProvider) ||
    str(process.env.WHATSAPP_PROVIDER) ||
    "evolution") === "meta_cloud"
    ? "meta_cloud"
    : "evolution") as "evolution" | "meta_cloud";

  const evolution = buildEvolution(cfg, enabled);
  const meta = buildMeta(cfg, enabled);

  if (providerName === "meta_cloud") {
    const fallbackEnabled = cfg?.whatsappFallbackEvolution !== 0;
    return { primary: meta, fallback: fallbackEnabled ? evolution : null, providerName };
  }
  return { primary: evolution, fallback: null, providerName: "evolution" };
}
