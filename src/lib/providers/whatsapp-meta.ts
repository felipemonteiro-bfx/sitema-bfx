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
  WhatsAppMedia,
  WhatsAppTemplate,
  WhatsAppTextOpcoes,
} from "@/lib/whatsapp-provider";
import { nomeSeguro } from "@/lib/whatsapp-midia-politica";

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

/** Mensagens curtas por código da Meta; nada do texto cru da resposta é gravado ou logado. */
const ERROS_META: Record<number, string> = {
  190: "Token da Meta inválido ou expirado.",
  100: "Parâmetro rejeitado pela Meta.",
  130429: "Limite de envios da Meta atingido.",
  131026: "Mensagem não entregável a este número.",
  131047: "Fora da janela de 24 horas.",
  131051: "Tipo de mensagem não suportado.",
  131053: "Mídia não suportada ou com falha na Meta.",
  131056: "Muitos envios ao mesmo número; aguarde.",
};

/** Texto curto e fixo para o erro; sem dados da requisição. */
function erroMetaCurto(status: number, code?: number): string {
  if (code !== undefined && ERROS_META[code]) return ERROS_META[code];
  return `Meta recusou o envio (HTTP ${status}).`;
}

/** Citação da Cloud API: `context.message_id` aponta para o wa_message_id da mensagem respondida. */
const contexto = (id?: string) => (id ? { context: { message_id: id } } : {});

export class MetaProvider implements WhatsAppProvider {
  readonly name = "meta_cloud" as const;

  constructor(private readonly cfg: MetaConfig) {}

  get freeServiceOnly(): boolean { return this.cfg.freeServiceOnly === true; }

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
        const code = typeof data.error?.code === "number" ? data.error.code : undefined;
        // Log só com status HTTP e código da Meta: nunca token, URL nem corpo cru.
        console.error("[WhatsApp/meta] Erro: status", res.status, "code", code ?? "-");
        return { ok: false, error: erroMetaCurto(res.status, code), codigo: code, provider: this.name };
      }
      return { ok: true, messageId: data.messages?.[0]?.id, provider: this.name };
    } catch (err) {
      // Só o nome do erro: a mensagem pode carregar URL ou cabeçalhos.
      console.error("[WhatsApp/meta] Falha de rede:", err instanceof Error ? err.name : "desconhecido");
      return { ok: false, error: "Falha de rede ao falar com a Meta.", provider: this.name };
    }
  }

  async sendText(numeroE164: string, texto: string, opcoes?: WhatsAppTextOpcoes): Promise<WhatsAppSendResult> {
    return this.post({
      to: numeroE164,
      type: "text",
      text: { body: texto, preview_url: opcoes?.previewUrl ?? true },
      ...contexto(opcoes?.respondeAWaId),
    });
  }

  async sendButtons(numeroE164:string,texto:string,botoes:{id:string;title:string}[]):Promise<WhatsAppSendResult>{
    if(!botoes.length||botoes.length>3||texto.length>1024||botoes.some(b=>!b.title||b.title.length>20||!b.id||b.id.length>256))return {ok:false,error:'botoes_invalidos',provider:this.name};
    return this.post({to:numeroE164,type:'interactive',interactive:{type:'button',body:{text:texto},action:{buttons:botoes.map(reply=>({type:'reply',reply}))}}});
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

  /** Mídia por `id` (upload prévio em `/media`); passa pelo `post()`, então respeita `freeServiceOnly` e a janela. */
  async sendMedia(numeroE164: string, media: WhatsAppMedia): Promise<WhatsAppSendResult> {
    const tipoMeta = { imagem: "image", video: "video", audio: "audio", figurinha: "sticker", documento: "document" }[media.tipo];
    const legenda = media.legenda?.trim();
    const objeto: Record<string, unknown> = { id: media.mediaId };
    if (legenda && media.tipo !== "audio" && media.tipo !== "figurinha") objeto.caption = legenda;
    if (media.tipo === "audio" && media.voz === true) objeto.voice = true;
    if (media.tipo === "documento" && media.nomeArquivo) objeto.filename = nomeSeguro(media.nomeArquivo);
    return this.post({ to: numeroE164, type: tipoMeta, [tipoMeta]: objeto, ...contexto(media.respondeAWaId) });
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
