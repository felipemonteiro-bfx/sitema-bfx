/**
 * Extração dos payloads do webhook da Meta.
 *
 * Um mesmo POST pode trazer mensagens recebidas (`messages`) ou callbacks de
 * status de entrega (`statuses`). Ambos são tolerantes a payload malformado —
 * a rota nunca deve levantar 5xx por causa de um shape inesperado.
 */
import type { StatusMensagem } from "@/lib/whatsapp-mensagem";

export type InboundMeta = {
  telefone: string;
  texto: string;
  nome?: string;
  waMessageId?: string;
};

export type StatusMeta = {
  waMessageId: string;
  status: StatusMensagem;
  erroCodigo?: number;
  erroMsg?: string;
};

type MetaMessage = {
  from?: string;
  id?: string;
  type?: string;
  text?: { body?: string };
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
      const reply=msg.interactive?.button_reply||msg.interactive?.list_reply;
      const acoes:Record<string,string>={bfx_orcamento:'Orçamento',bfx_pedido:'Pedido',bfx_atendente:'Atendente'};
      const texto=(msg.type==='text'?msg.text?.body:msg.type==='interactive'&&reply?(acoes[reply.id||'']||reply.title):undefined)?.trim();
      if (!texto) continue;
      out.push({
        telefone: msg.from,
        texto,
        nome: nomePorWaId.get(msg.from),
        waMessageId: msg.id,
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
      out.push({
        waMessageId: s.id,
        status: interno,
        ...(erro?.code !== undefined ? { erroCodigo: erro.code } : {}),
        ...(erro?.title || erro?.message
          ? { erroMsg: erro.title || erro.message }
          : {}),
      });
    }
  }
  return out;
}
