/**
 * Extração dos payloads do webhook da Meta.
 *
 * Um mesmo POST pode trazer mensagens recebidas (`messages`) ou callbacks de
 * status de entrega (`statuses`). Ambos são tolerantes a payload malformado —
 * a rota nunca deve levantar 5xx por causa de um shape inesperado.
 */
import { nomeSeguro } from "@/lib/whatsapp-midia-politica";
import type { StatusMensagem } from "@/lib/whatsapp-mensagem";

export type TipoMensagem = "texto" | "audio" | "imagem" | "video" | "figurinha" | "documento";

/** Dados da mídia recebida. A `url` do payload nunca é guardada: vence em 5 min; o id vale 7 dias. */
export type MidiaMeta = {
  mediaId: string;
  mime?: string;
  /** Hex minúsculo de 64 caracteres; ausente quando o payload não trouxe um valor válido. */
  sha256?: string;
  legenda?: string;
  nomeArquivo?: string;
  voz?: boolean;
  animada?: boolean;
};

export type InboundMeta = {
  telefone: string;
  /** Texto da mensagem; para mídia, o rótulo fixo (`[Foto] legenda`), usado como `corpo`. */
  texto: string;
  nome?: string;
  waMessageId?: string;
  /** `context.id` da Meta: wa_message_id da mensagem que o cliente respondeu (citação). */
  respondeAWaId?: string;
  tipo: TipoMensagem;
  midia?: MidiaMeta;
};

export type StatusMeta = {
  waMessageId: string;
  status: StatusMensagem;
  erroCodigo?: number;
  erroMsg?: string;
};

type MetaMedia = {
  id?: unknown;
  mime_type?: unknown;
  sha256?: unknown;
  caption?: unknown;
  filename?: unknown;
  voice?: unknown;
  animated?: unknown;
};

type MetaMessage = {
  from?: string;
  id?: string;
  type?: string;
  context?: unknown;
  text?: { body?: string };
  audio?: MetaMedia;
  image?: MetaMedia;
  video?: MetaMedia;
  sticker?: MetaMedia;
  document?: MetaMedia;
  interactive?: { button_reply?: {id?:string;title?:string}; list_reply?: {id?:string;title?:string} };
};

type MetaContact = { profile?: { name?: string }; wa_id?: string };

type MetaStatus = {
  id?: string;
  status?: string;
  errors?: { code?: number; title?: string; message?: string }[];
};

type MetaValue = {
  messages?: MetaMessage[];
  contacts?: MetaContact[];
  statuses?: MetaStatus[];
};

/** Percorre entry[].changes[].value e devolve cada `value` encontrado. */
function valores(body: unknown): MetaValue[] {
  const out: MetaValue[] = [];
  if (!body || typeof body !== "object") return out;
  const entries = (body as { entry?: unknown }).entry;
  if (!Array.isArray(entries)) return out;

  for (const entry of entries) {
    const changes = (entry as { changes?: unknown }).changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const value = (change as { value?: unknown }).value;
      if (value && typeof value === "object") out.push(value as MetaValue);
    }
  }
  return out;
}

const LEGENDA_MAX = 4096;

/** Hex minúsculo de 64; aceita base64 (formato antigo da Meta) e converte. Qualquer outra coisa vira undefined. */
function normalizarSha256(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (t.split(/[^0-9a-fA-F]/).join("") === t && t.length === 64) return t.toLowerCase();
  if (t.length === 44 && t.split(/[^A-Za-z0-9+/=]/).join("") === t) {
    const hex = Buffer.from(t, "base64").toString("hex");
    if (hex.length === 64) return hex;
  }
  return undefined;
}

const texto = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

const MIDIAS = {
  audio: { tipo: "audio", rotulo: "[Áudio]" },
  image: { tipo: "imagem", rotulo: "[Foto]" },
  video: { tipo: "video", rotulo: "[Vídeo]" },
  sticker: { tipo: "figurinha", rotulo: "[Figurinha]" },
  document: { tipo: "documento", rotulo: "[Documento]" },
} as const;

/** Extrai a mídia de uma mensagem; devolve null quando o id não é só dígitos (descartada). */
function extrairMidia(msg: MetaMessage): { tipo: TipoMensagem; texto: string; midia: MidiaMeta } | null {
  const chave = msg.type as keyof typeof MIDIAS;
  const def = MIDIAS[chave];
  if (!def) return null;
  const m = msg[chave];
  if (!m || typeof m !== "object") return null;
  const id = typeof m.id === "string" ? m.id.trim() : "";
  if (!/^\d+$/.test(id)) {
    console.warn(`[Webhook Meta] Mídia ${msg.type} sem id válido; descartada`);
    return null;
  }
  const legenda = texto(m.caption)?.slice(0, LEGENDA_MAX);
  const nomeBruto = texto(m.filename);
  // Nome de terceiro: sem caminho, bidi nem controle antes de gravar e de exibir.
  const nomeArquivo = nomeBruto ? nomeSeguro(nomeBruto) : undefined;
  const midia: MidiaMeta = { mediaId: id };
  const mime = texto(m.mime_type);
  if (mime) midia.mime = mime;
  const sha = normalizarSha256(m.sha256);
  if (sha) midia.sha256 = sha;
  if (legenda && chave !== "audio" && chave !== "sticker") midia.legenda = legenda;
  if (nomeArquivo) midia.nomeArquivo = nomeArquivo;
  if (chave === "audio") midia.voz = m.voice === true;
  if (chave === "sticker") midia.animada = m.animated === true;
  const detalhe = chave === "document" ? nomeArquivo : midia.legenda;
  return { tipo: def.tipo, texto: detalhe ? `${def.rotulo} ${detalhe}` : def.rotulo, midia };
}

/** `context.id` (resposta com citação); qualquer coisa que não seja texto não vazio é ignorada. */
function respondeA(msg: MetaMessage): string | undefined {
  const ctx = msg.context;
  if (!ctx || typeof ctx !== "object") return undefined;
  const id = texto((ctx as { id?: unknown }).id);
  return id && id.length <= 256 && id.split(/[A-Za-z0-9=._:+/-]/).join("") === "" ? id : undefined;
}

export function extrairMensagens(body: unknown): InboundMeta[] {
  const out: InboundMeta[] = [];
  for (const value of valores(body)) {
    if (!Array.isArray(value.messages)) continue;

    const nomePorWaId = new Map<string, string>();
    for (const c of value.contacts ?? []) {
      if (c.wa_id && c.profile?.name) nomePorWaId.set(c.wa_id, c.profile.name);
    }

    for (const msg of value.messages) {
      if (!msg.from) continue;
      if (msg.type && msg.type in MIDIAS) {
        const m = extrairMidia(msg);
        if (m) out.push({ telefone: msg.from, texto: m.texto, nome: nomePorWaId.get(msg.from), waMessageId: msg.id, ...(respondeA(msg) ? { respondeAWaId: respondeA(msg) } : {}), tipo: m.tipo, midia: m.midia });
        continue;
      }
      const reply=msg.interactive?.button_reply||msg.interactive?.list_reply;
      const acoes:Record<string,string>={bfx_orcamento:'Orçamento',bfx_pedido:'Pedido',bfx_atendente:'Atendente'};
      const texto=(msg.type==='text'?msg.text?.body:msg.type==='interactive'&&reply?(acoes[reply.id||'']||reply.title):undefined)?.trim();
      if (!texto) continue;
      out.push({
        telefone: msg.from,
        texto,
        nome: nomePorWaId.get(msg.from),
        waMessageId: msg.id,
        ...(respondeA(msg) ? { respondeAWaId: respondeA(msg) } : {}),
        tipo: "texto",
      });
    }
  }
  return out;
}

/** Mapeamento dos status da Meta para os internos. */
const MAPA_STATUS: Record<string, StatusMensagem> = {
  sent: "enviado",
  delivered: "entregue",
  read: "lido",
  failed: "falhou",
};

export function extrairStatuses(body: unknown): StatusMeta[] {
  const out: StatusMeta[] = [];
  for (const value of valores(body)) {
    if (!Array.isArray(value.statuses)) continue;
    for (const s of value.statuses) {
      if (!s.id || !s.status) continue;
      const interno = MAPA_STATUS[s.status];
      if (!interno) continue;

      const erro = s.errors?.[0];
      // 131052: o cliente mandou arquivo acima do limite da Meta; sem isso ficaria sem bolha e sem aviso.
      const erroTitulo = erro?.code === 131052 ? "Arquivo acima do limite de tamanho da Meta" : erro?.title || erro?.message;
      out.push({
        waMessageId: s.id,
        status: interno,
        ...(erro?.code !== undefined ? { erroCodigo: erro.code } : {}),
        ...(erroTitulo ? { erroMsg: erroTitulo } : {}),
      });
    }
  }
  return out;
}
