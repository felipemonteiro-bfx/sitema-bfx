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
  WhatsAppTextOpcoes,
} from "@/lib/whatsapp-provider";

export type EvolutionConfig = {
  baseUrl: string; // sem barra final
  apiKey: string;
  instance: string;
};

export class EvolutionProvider implements WhatsAppProvider {
  readonly name = "evolution" as const;

  constructor(private readonly cfg: EvolutionConfig) {}

  async isConnected(): Promise<boolean> {
    try {
      const res = await fetch(`${this.cfg.baseUrl}/instance/connectionState/${encodeURIComponent(this.cfg.instance)}`, {headers:{apikey:this.cfg.apiKey},cache:'no-store',signal:AbortSignal.timeout(5000)});
      if (!res.ok) return false;
      const data = await res.json();
      return (data.instance?.state ?? data.state) === 'open';
    } catch { return false; }
  }

  async sendText(numeroE164: string, texto: string, opcoes?: WhatsAppTextOpcoes): Promise<WhatsAppSendResult> {
    try {
      const res = await fetch(`${this.cfg.baseUrl}/message/sendText/${encodeURIComponent(this.cfg.instance)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', apikey: this.cfg.apiKey },
        body: JSON.stringify({ number: numeroE164, text: texto, linkPreview: opcoes?.previewUrl ?? true }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        console.error('[WhatsApp/evolution] HTTP', res.status);
        return {ok:false,error:`Evolution recusou o envio (HTTP ${res.status}).`,incerto:res.status>=500,provider:this.name};
      }
      const data = await res.json().catch(() => null);
      const id = data?.key?.id;
      if (typeof id !== 'string' || !id) return {ok:false,incerto:true,error:'Aceite da Evolution sem identificador; confira o histórico antes de repetir.',provider:this.name};
      return {ok:true,messageId:`evolution:${id}`,provider:this.name};
    } catch {
      console.error('[WhatsApp/evolution] Resultado de envio incerto');
      return {ok:false,incerto:true,error:'Não foi possível confirmar o envio pela Evolution.',provider:this.name};
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
