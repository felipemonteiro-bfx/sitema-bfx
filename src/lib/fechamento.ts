/**
 * Fechamento mensal por empresa (Fase 5) — regras puras: competência, elegibilidade da parcela
 * com o motivo do bloqueio, totais com ajustes e transições de status. As gravações ficam em
 * `@/lib/fechamento-db`.
 * Ver docs/superpowers/specs/2026-09-30-fechamento-pix-prudent-design.md §3.6 e §5.
 */

export const STATUS_FECHAMENTO = {
  emPreparacao: "em_preparacao",
  conferido: "conferido",
  enviado: "enviado",
  pagoParcial: "pago_parcial",
  pago: "pago",
} as const;

export type StatusFechamento = (typeof STATUS_FECHAMENTO)[keyof typeof STATUS_FECHAMENTO];

export const ROTULO_STATUS_FECHAMENTO: Record<string, string> = {
  em_preparacao: "Em preparação",
  conferido: "Conferido",
  enviado: "Enviado ao RH",
  pago_parcial: "Pago parcialmente",
  pago: "Pago",
};

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const FORMATO_COMPETENCIA = /^\d{4}-(0[1-9]|1[0-2])$/;

function partesCompetencia(c: string): { ano: number; mes: number } {
  if (typeof c !== "string" || !FORMATO_COMPETENCIA.test(c)) {
    throw new Error(`Competência inválida: "${c}" (esperado AAAA-MM).`);
  }
  return { ano: Number(c.slice(0, 4)), mes: Number(c.slice(5, 7)) };
}

/** Mês (UTC) de uma data pura → "AAAA-MM". */
export function competenciaDe(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** [1º dia 00:00Z, 1º dia do mês seguinte 00:00Z). Erro se o formato não é "AAAA-MM". */
export function intervaloCompetencia(c: string): { inicio: Date; fim: Date } {
  const { ano, mes } = partesCompetencia(c);
  return { inicio: new Date(Date.UTC(ano, mes - 1, 1)), fim: new Date(Date.UTC(ano, mes, 1)) };
}

/** "2026-10" → "outubro de 2026". */
export function rotuloCompetencia(c: string): string {
  const { ano, mes } = partesCompetencia(c);
  return `${MESES[mes - 1]} de ${ano}`;
}

/** Identificador legível da parcela: "V240-3/4". */
export function identificadorParcela(vendaId: number, numero: number, total: number): string {
  return `V${vendaId}-${numero}/${total}`;
}

/**
 * O que a regra precisa saber de uma parcela. Os campos vêm já resolvidos pelo chamador
 * (status da venda, status do lote, direcionamento do boleto) — sem tipos do Prisma.
 */
export type ParcelaParaFechamento = {
  id: number;
  vendaStatus: string;
  liquidadaEm: Date | null;
  fechamentoId: number | null;
  confirmacaoRh: string | null;
  antecipada: boolean;
  paga: boolean;
  antecipacaoLoteId: number | null;
  loteStatus: string | null;
  boletoDirecionamento: string | null;
  empresaParceiraId: number | null;
};

export type MotivoBloqueio =
  | "venda_inativa"
  | "ja_liquidada"
  | "em_outro_fechamento"
  | "recusada_rh"
  | "boleto_a_empresa"
  | "paga_por_outra_via"
  | "lote_em_andamento"
  | "sem_empresa";

export const ROTULO_MOTIVO: Record<MotivoBloqueio, string> = {
  venda_inativa: "Venda cancelada ou estornada",
  ja_liquidada: "Já paga no fechamento",
  em_outro_fechamento: "Em outro fechamento",
  recusada_rh: "Recusada pelo RH",
  boleto_a_empresa: "Boleto Prudent ainda direcionado à empresa",
  paga_por_outra_via: "Paga por outra via",
  lote_em_andamento: "Lote em andamento na Prudent",
  sem_empresa: "Cliente sem empresa parceira",
};

/**
 * A parcela pode entrar no fechamento `fechamentoId` (null = fechamento ainda não criado)?
 * Checa na ordem da tabela da spec §5.1; o primeiro motivo encontrado é o devolvido.
 */
export function elegibilidadeFechamento(
  p: ParcelaParaFechamento,
  fechamentoId: number | null
): { ok: true } | { ok: false; motivo: MotivoBloqueio } {
  if (p.vendaStatus !== "ativa") return { ok: false, motivo: "venda_inativa" };
  if (p.liquidadaEm !== null) return { ok: false, motivo: "ja_liquidada" };
  if (p.fechamentoId !== null && p.fechamentoId !== fechamentoId) return { ok: false, motivo: "em_outro_fechamento" };
  if (p.confirmacaoRh === "recusada") return { ok: false, motivo: "recusada_rh" };
  // Antecipada sem boleto ou com boleto à empresa: a Prudent cobra a empresa — o Pix cobraria de novo.
  if (p.antecipada && p.boletoDirecionamento !== "bfx") return { ok: false, motivo: "boleto_a_empresa" };
  if (!p.antecipada && p.paga) return { ok: false, motivo: "paga_por_outra_via" };
  if (p.antecipacaoLoteId !== null && p.loteStatus === "em_andamento") return { ok: false, motivo: "lote_em_andamento" };
  if (p.empresaParceiraId === null) return { ok: false, motivo: "sem_empresa" };
  return { ok: true };
}

/** Valor em centavos inteiros, arredondando metade para longe do zero (10,005 → 1001). */
function centavos(valor: number): number {
  const abs = Math.round(Number((Math.abs(valor) * 100).toFixed(6)));
  return valor < 0 ? -abs : abs;
}

/** Totais do demonstrativo, somados em centavos; ajustes removidos não contam. */
export function totaisFechamento(
  linhas: { valor: number }[],
  ajustes: { valor: number; removidoEm: Date | null }[]
): { totalBruto: number; totalAjustes: number; totalFinal: number } {
  const bruto = linhas.reduce((s, l) => s + centavos(l.valor), 0);
  const ajuste = ajustes.filter((a) => a.removidoEm === null).reduce((s, a) => s + centavos(a.valor), 0);
  return { totalBruto: bruto / 100, totalAjustes: ajuste / 100, totalFinal: (bruto + ajuste) / 100 };
}

const JUSTIFICATIVA_MINIMA = 5;

/** Ajuste manual: valor ≠ 0 (em centavos) e finito; justificativa com pelo menos 5 caracteres. */
export function validarAjuste(
  valor: unknown,
  justificativa: unknown
): { ok: true; valor: number; justificativa: string } | { ok: false; erro: string } {
  let numero = Number.NaN;
  if (typeof valor === "number") numero = valor;
  else if (typeof valor === "string" && valor.trim() !== "") numero = Number(valor.trim().split(",").join("."));

  if (!Number.isFinite(numero)) return { ok: false, erro: "Informe o valor do ajuste." };
  const emCentavos = centavos(numero);
  if (emCentavos === 0) return { ok: false, erro: "O valor do ajuste não pode ser zero." };

  const texto = typeof justificativa === "string" ? justificativa.trim() : "";
  if (texto.length < JUSTIFICATIVA_MINIMA) {
    return { ok: false, erro: `A justificativa precisa de pelo menos ${JUSTIFICATIVA_MINIMA} caracteres.` };
  }
  return { ok: true, valor: emCentavos / 100, justificativa: texto };
}

/** Linhas e ajustes só mudam em preparação. */
export function podeEditar(status: string): boolean {
  return status === STATUS_FECHAMENTO.emPreparacao;
}

/** Reabrir para corrigir: de conferido, enviado ou pago parcialmente. */
export function podeReabrir(status: string): boolean {
  return (
    status === STATUS_FECHAMENTO.conferido ||
    status === STATUS_FECHAMENTO.enviado ||
    status === STATUS_FECHAMENTO.pagoParcial
  );
}
