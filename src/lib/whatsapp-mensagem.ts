/**
 * Registro unificado de mensagens WhatsApp.
 *
 * Fonte de verdade do histórico por cliente, do status de entrega e da janela
 * de 24h da Meta. Consumido por `whatsapp.ts` (saídas) e pelo webhook
 * `/api/webhooks/meta-whatsapp` (entradas e callbacks de status).
 */
import { prisma } from "@/lib/db";
import { nomeSeguro } from "@/lib/whatsapp-midia-politica";
import type { MidiaMeta, TipoMensagem } from "@/lib/meta-webhook-payload";

export type OrigemMensagem =
  | "cron"
  | "campanha"
  | "venda"
  | "boleto"
  | "relatorio"
  | "pre_atendimento"
  | "manual";

export type StatusMensagem = "pendente" | "enviado" | "entregue" | "lido" | "falhou";

/** Progressão permitida. O status nunca retrocede; `falhou` é terminal. */
const ORDEM: Record<StatusMensagem, number> = {
  pendente: 0,
  enviado: 1,
  entregue: 2,
  lido: 3,
  falhou: 99,
};

const JANELA_MS = 24 * 60 * 60 * 1000;

export type RegistroSaida = {
  provedor?: "meta_cloud" | "evolution";
  telefone: string;
  clienteId?: number | null;
  origem: OrigemMensagem;
  templateNome?: string | null;
  corpo: string;
};

export type RegistroEntrada = {
  provedor?: "meta_cloud" | "evolution";
  telefone: string;
  clienteId?: number | null;
  waMessageId?: string | null;
  /** wa_message_id da mensagem que o cliente citou ao responder. */
  respondeAWaId?: string | null;
  corpo: string;
  /** Padrão `texto`. Qualquer outro valor exige `midia`. */
  tipo?: TipoMensagem;
  midia?: MidiaMeta;
};

/** sha256 desconhecido (payload sem valor válido): a coluna é NOT NULL com CHECK de 64 hex. */
const SHA256_DESCONHECIDO = "0".repeat(64);

/** Campos da linha `WhatsAppMidia` inicial (`pendente`) a partir do que o webhook trouxe. */
function dadosMidia(tipo: TipoMensagem, m: MidiaMeta) {
  return {
    tipo: tipo === "texto" ? "documento" : tipo,
    metaMediaId: m.mediaId,
    mime: m.mime ?? "application/octet-stream",
    sha256: m.sha256 ?? SHA256_DESCONHECIDO,
    nomeExibicao: m.nomeArquivo ? nomeSeguro(m.nomeArquivo) : null,
    legenda: m.legenda ?? null,
    voz: m.voz ?? false,
    animada: m.animada ?? false,
    status: "pendente",
  };
}

/** Há mensagem recebida deste número nas últimas 24h? */
export async function dentroDaJanela24h(telefone: string): Promise<boolean> {
  const desde = new Date(Date.now() - JANELA_MS);
  const ultima = await prisma.whatsAppMensagem.findFirst({
    where: { telefone, direcao: "in", criadoEm: { gte: desde }, OR: [{ provedor: null }, { provedor: "meta_cloud" }] },
    select: { id: true },
    orderBy: { criadoEm: "desc" },
  });
  return ultima !== null;
}

/** Registra uma saída como `pendente` e devolve o id para atualização posterior. */
export async function registrarSaida(input: RegistroSaida): Promise<number> {
  const msg = await prisma.whatsAppMensagem.create({
    data: {
      telefone: input.telefone,
      ...(input.provedor ? {provedor:input.provedor} : {}),
      clienteId: input.clienteId ?? null,
      direcao: "out",
      origem: input.origem,
      templateNome: input.templateNome ?? null,
      corpo: input.corpo,
      status: "pendente",
    },
    select: { id: true },
  });
  return msg.id;
}

export async function marcarEnviada(id: number, waMessageId?: string): Promise<void> {
  await prisma.whatsAppMensagem.update({
    where: { id },
    data: { status: "enviado", waMessageId: waMessageId ?? null },
  });
}

export async function marcarFalha(id: number, erroMsg: string, erroCodigo?: number): Promise<void> {
  await prisma.whatsAppMensagem.update({
    where: { id },
    data: { status: "falhou", erroMsg, erroCodigo: erroCodigo ?? null },
  });
}

/**
 * Registra uma mensagem recebida. Idempotente por `waMessageId`: reentrega da
 * Meta não duplica o registro nem faz a IA responder duas vezes.
 * Devolve true se a mensagem é nova (deve ser processada).
 *
 * Mensagem e mídia vão numa única escrita aninhada (uma transação). Duplicado só
 * é sucesso de verdade se a linha de mídia existe: se a mensagem existe sem ela
 * (falha antiga), a mídia que faltou é criada, ainda devolvendo false.
 */
export async function registrarEntradaDetalhada(
  input: RegistroEntrada,
): Promise<{ nova: boolean; midiaId: string | null }> {
  const tipo = input.tipo ?? "texto";
  if (input.waMessageId) {
    const existente = await prisma.whatsAppMensagem.findUnique({
      where: { waMessageId: input.waMessageId },
      select: { id: true, midia: { select: { id: true } } },
    });
    if (existente) {
      if (input.midia && !existente.midia) {
        await prisma.whatsAppMidia.create({
          data: { mensagemId: existente.id, ...dadosMidia(tipo, input.midia) },
        });
      }
      return { nova: false, midiaId: null };
    }
  }
  const criada = await prisma.whatsAppMensagem.create({
    data: {
      telefone: input.telefone,
      ...(input.provedor ? {provedor:input.provedor} : {}),
      clienteId: input.clienteId ?? null,
      direcao: "in",
      origem: "pre_atendimento",
      waMessageId: input.waMessageId ?? null,
      respondeAWaId: input.respondeAWaId ?? null,
      corpo: input.corpo,
      tipo,
      status: "entregue",
      ...(input.midia ? { midia: { create: dadosMidia(tipo, input.midia) } } : {}),
    },
    select: { id: true, midia: { select: { id: true } } },
  });
  // O id da mídia volta da própria escrita: quem agenda o download não precisa reconsultar por waMessageId.
  return { nova: true, midiaId: criada.midia?.id ?? null };
}

/** Versão simples: só diz se a mensagem é nova. */
export async function registrarEntrada(input: RegistroEntrada): Promise<boolean> {
  return (await registrarEntradaDetalhada(input)).nova;
}

/**
 * Avança o status a partir de um callback da Meta. Ignora silenciosamente
 * quando a mensagem ainda não foi gravada (corrida) ou quando o status
 * receberia um retrocesso (callbacks chegam fora de ordem).
 */
export async function avancarStatusPorWaMessageId(
  waMessageId: string,
  novo: StatusMensagem,
  erro?: { codigo?: number; msg?: string }
): Promise<void> {
  const atual = await prisma.whatsAppMensagem.findFirst({
    where: { waMessageId },
    select: { id: true, status: true },
  });
  if (!atual) return;

  const statusAtual = atual.status as StatusMensagem;
  if (statusAtual === "falhou") return;
  if (ORDEM[novo] <= ORDEM[statusAtual]) return;

  await prisma.whatsAppMensagem.update({
    where: { id: atual.id },
    data: {
      status: novo,
      ...(erro?.codigo !== undefined ? { erroCodigo: erro.codigo } : {}),
      ...(erro?.msg !== undefined ? { erroMsg: erro.msg } : {}),
    },
  });
}

/**
 * Quantos números distintos receberam mensagem nas últimas 24h.
 * Usado para respeitar o messaging tier da Meta antes de disparar campanha.
 */
export async function contarContatosUnicos24h(): Promise<number> {
  const desde = new Date(Date.now() - JANELA_MS);
  const linhas = await prisma.whatsAppMensagem.findMany({
    where: { OR: [{ provedor: null }, { provedor: "meta_cloud" }], direcao: "out", criadoEm: { gte: desde }, status: { notIn: ["falhou", "gerando"] } },
    select: { telefone: true },
  });
  return new Set(linhas.map((l) => l.telefone)).size;
}
