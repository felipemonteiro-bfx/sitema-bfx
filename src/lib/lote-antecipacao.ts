/**
 * Lote de antecipação (2026-09-17): o envio à Prudent abre um lote `em_andamento` e só o retorno
 * confirmado marca as parcelas como antecipadas e quitadas. Aqui ficam as constantes e as regras
 * puras; as gravações estão em `@/lib/lote-antecipacao-db`.
 * Ver docs/superpowers/specs/2026-09-17-antecipacao-em-andamento.md.
 */
import { formatarMesAnoPuro } from "@/lib/data-pura";

export const STATUS_LOTE = {
  emAndamento: "em_andamento",
  concluido: "concluido",
  cancelado: "cancelado",
} as const;

export type StatusLote = (typeof STATUS_LOTE)[keyof typeof STATUS_LOTE];

export const ORIGEM_LOTE = {
  /** Seleção na fila que gerou o Excel da financeira. */
  envio: "envio",
  /** Antecipação que já tinha acontecido antes de o sistema saber. */
  registro: "registro",
  /** Conciliação com a planilha de controle da equipe. */
  conciliacao: "conciliacao",
} as const;

export type OrigemLote = (typeof ORIGEM_LOTE)[keyof typeof ORIGEM_LOTE];

export const ROTULO_STATUS_LOTE: Record<StatusLote, string> = {
  em_andamento: "Em andamento",
  concluido: "Concluída",
  cancelado: "Cancelada",
};

/**
 * O flag legado `vendas.antecipada` a partir das parcelas: 1 = todas antecipadas, 3 = algumas,
 * 2 = nenhuma antecipada mas há parcela num lote em andamento, 0 = nada. A fila e a planilha de
 * controle leem esse flag, então ele tem de acompanhar o que as parcelas dizem.
 */
export function flagDaVenda(parcelas: { antecipada: boolean; emAndamento: boolean }[]): 0 | 1 | 2 | 3 {
  if (parcelas.length === 0) return 0;
  const antecipadas = parcelas.filter((p) => p.antecipada).length;
  if (antecipadas === parcelas.length) return 1;
  if (antecipadas > 0) return 3;
  return parcelas.some((p) => p.emAndamento) ? 2 : 0;
}

/**
 * O período que aparece no histórico do lote. Sem filtro de meses, ele sai das próprias parcelas
 * escolhidas — era o que a action antiga fazia, e o histórico não pode ficar sem período por
 * causa da mudança.
 */
export function periodoDoLote(
  filtro: { inicio: Date; fim: Date } | null,
  vencimentos: Date[]
): { inicio: Date; fim: Date; descricao: string } | null {
  const datas = [...vencimentos].filter((d) => !Number.isNaN(d.getTime())).sort((a, b) => a.getTime() - b.getTime());
  const inicio = filtro?.inicio ?? datas[0] ?? null;
  const fim = filtro?.fim ?? datas[datas.length - 1] ?? null;
  if (!inicio || !fim) return null;
  const de = formatarMesAnoPuro(inicio);
  const ate = formatarMesAnoPuro(fim);
  return { inicio, fim, descricao: de === ate ? de : `${de} - ${ate}` };
}

/** "YYYY-MM-DD" → meia-noite UTC (data pura, como o resto do sistema); null se ilegível. */
export function dataPuraOuNula(valor: string): Date | null {
  const partes = valor.trim().split("-");
  if (partes.length !== 3 || partes[0].length !== 4 || partes[1].length !== 2 || partes[2].length !== 2) return null;
  const data = new Date(`${valor.trim()}T00:00:00.000Z`);
  return Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor.trim() ? null : data;
}
