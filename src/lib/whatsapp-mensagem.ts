/**
 * Registro unificado de mensagens WhatsApp.
 *
 * Fonte de verdade do histórico por cliente, do status de entrega e da janela
 * de 24h da Meta. Consumido por `whatsapp.ts` (saídas) e pelo webhook
 * `/api/webhooks/meta-whatsapp` (entradas e callbacks de status).
 */
import { prisma } from "@/lib/db";

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
  telefone: string;
  clienteId?: number | null;
  origem: OrigemMensagem;
  templateNome?: string | null;
  corpo: string;
};

export type RegistroEntrada = {
  telefone: string;
  clienteId?: number | null;
  waMessageId?: string | null;
  corpo: string;
};

/** Há mensagem recebida deste número nas últimas 24h? */
export async function dentroDaJanela24h(telefone: string): Promise<boolean> {
  const desde = new Date(Date.now() - JANELA_MS);
  const ultima = await prisma.whatsAppMensagem.findFirst({
    where: { telefone, direcao: "in", criadoEm: { gte: desde } },
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
 */
export async function registrarEntrada(input: RegistroEntrada): Promise<boolean> {
  if (input.waMessageId) {
    const existente = await prisma.whatsAppMensagem.findUnique({
      where: { waMessageId: input.waMessageId },
      select: { id: true },
    });
    if (existente) return false;
  }
  await prisma.whatsAppMensagem.create({
    data: {
      telefone: input.telefone,
      clienteId: input.clienteId ?? null,
      direcao: "in",
      origem: "pre_atendimento",
      waMessageId: input.waMessageId ?? null,
      corpo: input.corpo,
      status: "entregue",
    },
  });
  return true;
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
    where: { direcao: "out", criadoEm: { gte: desde }, status: { not: "falhou" } },
    select: { telefone: true },
  });
  return new Set(linhas.map((l) => l.telefone)).size;
}
