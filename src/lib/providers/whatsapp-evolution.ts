/**
 * Provider WhatsApp via Evolution API (Baileys, não-oficial).
 * Move o corpo original de `enviarWhatsAppTexto`/`enviarWhatsAppArquivo` de whatsapp.ts.
 *
 * Evolution não tem templates: `sendTemplate` cai para `sendText(fallbackText)`.
 */
import type {
  WhatsAppProvider,
  WhatsAppSendResult,
  WhatsAppDocument,
  WhatsAppTemplate,
} from "@/lib/whatsapp-provider";

export type EvolutionConfig = {
  baseUrl: string; // sem barra final
  apiKey: string;
  instance: string;
};

export class EvolutionProvider implements WhatsAppProvider {
  readonly name = "evolution" as const;

  constructor(private readonly cfg: EvolutionConfig) {}

  async sendText(numeroE164: string, texto: string): Promise<WhatsAppSendResult> {
    const url = `${this.cfg.baseUrl}/message/sendText/${this.cfg.instance}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: this.cfg.apiKey },
        body: JSON.stringify({ number: numeroE164, text: texto, linkPreview: true }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error("[WhatsApp/evolution] Erro sendText:", res.status, body);
        return { ok: false, error: `HTTP ${res.status}`, provider: this.name };
      }
      return { ok: true, provider: this.name };
    } catch (err) {
      console.error("[WhatsApp/evolution] Erro sendText:", err);
      return { ok: false, error: String(err), provider: this.name };
    }
  }

  async sendDocument(numeroE164: string, doc: WhatsAppDocument): Promise<WhatsAppSendResult> {
    const media = doc.url ?? doc.base64;
    if (!media) return { ok: false, error: "documento sem url/base64", provider: this.name };
    const url = `${this.cfg.baseUrl}/message/sendMedia/${this.cfg.instance}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: this.cfg.apiKey },
        body: JSON.stringify({
          number: numeroE164,
          mediatype: "document",
          media,
          fileName: doc.filename,
          caption: doc.caption || "",
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error("[WhatsApp/evolution] Erro sendMedia:", res.status, body);
        return { ok: false, error: `HTTP ${res.status}`, provider: this.name };
      }
      return { ok: true, provider: this.name };
    } catch (err) {
      console.error("[WhatsApp/evolution] Erro sendMedia:", err);
      return { ok: false, error: String(err), provider: this.name };
    }
  }

  /** Evolution não suporta templates aprovados — envia o texto de fallback renderizado. */
  async sendTemplate(numeroE164: string, tpl: WhatsAppTemplate): Promise<WhatsAppSendResult> {
    return this.sendText(numeroE164, tpl.fallbackText);
  }
}
