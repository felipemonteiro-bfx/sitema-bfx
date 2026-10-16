/**
 * Provider WhatsApp via Meta WhatsApp Business Cloud API (oficial).
 * REST puro em graph.facebook.com com Bearer token — sem risco de ban do número.
 *
 * Ver docs/whatsapp-cloud-api.md para o processo de migração e templates.
 */
import type {
  WhatsAppProvider,
  WhatsAppSendResult,
  WhatsAppDocument,
  WhatsAppTemplate,
} from "@/lib/whatsapp-provider";

export type MetaConfig = {
  token: string;
  phoneNumberId: string;
  apiVersion: string; // ex.: "v21.0"
  /** Restringe saídas a serviço na franquia gratuita; nunca envia templates. */
  freeServiceOnly?: boolean;
};

type MetaResponse = {
  messages?: { id: string }[];
  error?: { message?: string; code?: number };
};

export class MetaProvider implements WhatsAppProvider {
  readonly name = "meta_cloud" as const;

  constructor(private readonly cfg: MetaConfig) {}

  private get endpoint(): string {
    return `https://graph.facebook.com/${this.cfg.apiVersion}/${this.cfg.phoneNumberId}/messages`;
  }

  private async post(payload: Record<string, unknown>): Promise<WhatsAppSendResult> {
    try {
      if (this.cfg.freeServiceOnly) {
        if (payload.type === "template") {
          return { ok: false, error: "tarifa_nao_autorizada_template", provider: this.name };
        }
        // A franquia mensal é compartilhada por todos os aplicativos do número.
        // Sem forma de pagamento, a Meta interrompe entregas ao esgotá-la.
        // Não tratar templates de utilidade na janela como gratuitos (out/2026).
        const { dentroDaJanela24h } = await import("@/lib/whatsapp-mensagem");
        if (!(await dentroDaJanela24h(String(payload.to)))) {
          return { ok: false, error: "janela_gratuita_indisponivel", provider: this.name };
        }
      }
      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.cfg.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
      });
      const data = (await res.json().catch(() => ({}))) as MetaResponse;
      if (!res.ok || data.error) {
        const msg = data.error?.message || `HTTP ${res.status}`;
        console.error("[WhatsApp/meta] Erro:", res.status, msg);
        return { ok: false, error: msg, provider: this.name };
      }
      return { ok: true, messageId: data.messages?.[0]?.id, provider: this.name };
    } catch (err) {
      console.error("[WhatsApp/meta] Erro:", err);
      return { ok: false, error: String(err), provider: this.name };
    }
  }

  async sendText(numeroE164: string, texto: string): Promise<WhatsAppSendResult> {
    return this.post({
      to: numeroE164,
      type: "text",
      text: { body: texto, preview_url: true },
    });
  }

  async sendDocument(numeroE164: string, doc: WhatsAppDocument): Promise<WhatsAppSendResult> {
    if (!doc.url) {
      // A Cloud API aceita link público ou media_id; base64 exigiria upload prévio (/media).
      return { ok: false, error: "Meta Cloud API requer URL pública do documento", provider: this.name };
    }
    return this.post({
      to: numeroE164,
      type: "document",
      document: { link: doc.url, filename: doc.filename, caption: doc.caption },
    });
  }

  async sendTemplate(numeroE164: string, tpl: WhatsAppTemplate): Promise<WhatsAppSendResult> {
    const components: Record<string, unknown>[] = [];
    if (tpl.headerDocumentUrl) {
      components.push({
        type: "header",
        parameters: [{ type: "document", document: { link: tpl.headerDocumentUrl } }],
      });
    }
    if (tpl.bodyParams.length > 0) {
      components.push({
        type: "body",
        parameters: tpl.bodyParams.map((text) => ({ type: "text", text })),
      });
    }
    return this.post({
      to: numeroE164,
      type: "template",
      template: {
        name: tpl.name,
        language: { code: tpl.language },
        ...(components.length > 0 ? { components } : {}),
      },
    });
  }
}
