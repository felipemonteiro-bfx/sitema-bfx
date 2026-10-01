/**
 * Cálculos da fila de antecipação que rodam no SERVIDOR (2026-09-11).
 *
 * Pedido do André: "de forma alguma os cálculos vêm do front, tudo deve vir do
 * backend, o front só mostra". `page.tsx` usa `contagensDaFila` e
 * `mesesEmAberto` ao montar a tela; a server action da seleção usa
 * `calcularSelecao`. A fórmula da Prudent continua em `@/lib/antecipacao` —
 * aqui só a composição, pura e testada.
 */

import {
  calcularAntecipacao,
  titulosDeVenda,
  type PeriodoAntecipacao,
  type VendaParaAntecipacao,
} from "@/lib/antecipacao";
import type { ParcelaParaResumo } from "@/lib/antecipacao-compradores";

export interface ResultadoSelecao {
  vendas: number;
  /** Títulos que o lote levaria (parcelas não antecipadas, no período). */
  parcelas: number;
  valorBruto: number;
  valorTaxa: number;
  valorLiquido: number;
  prazoMedioDias: number;
  taxaPercent: number;
  /** Dessas parcelas, quantas já venceram — o desconto em folha delas já ocorreu. */
  vencidas: number;
  /** Vendas sem parcela cadastrada: a action não consegue antecipá-las. */
  vendasSemParcelas: number;
  /**
   * Dos títulos, quantos vêm de parcela cadastrada — os únicos que a action
   * `antecipar` enxerga. Zero com `parcelas > 0` = só venda legada (prazo de 30
   * dias estimado): o Antecipar precisa ser bloqueado.
   */
  parcelasCadastradas: number;
}

export interface ContagensFila {
  total: number;
  porEmpresa: Record<string, number>;
  porStatus: Record<string, number>;
}

/** Quantas vendas da fila cada opção dos dropdowns traz — sobre a fila inteira. */
export function contagensDaFila(vendas: { empresa: string | null; status: string }[]): ContagensFila {
  const porEmpresa: Record<string, number> = {};
  const porStatus: Record<string, number> = {};
  for (const v of vendas) {
    if (v.empresa) porEmpresa[v.empresa] = (porEmpresa[v.empresa] ?? 0) + 1;
    porStatus[v.status] = (porStatus[v.status] ?? 0) + 1;
  }
  return { total: vendas.length, porEmpresa, porStatus };
}

function paraData(valor: string | Date): Date | null {
  const d = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Meses (YYYY-MM, UTC — vencimento é data pura) com parcela ainda não
 * antecipada. A tela só compara com o mês escolhido no filtro de vencimento.
 */
export function mesesEmAberto(parcelas: ParcelaParaResumo[]): string[] {
  const meses = new Set<string>();
  for (const p of parcelas) {
    // Em andamento também não: já está num lote na Prudent.
    if (p.antecipada || p.emAndamento || p.paga) continue;
    const d = paraData(p.dataVencimento);
    if (d) meses.add(d.toISOString().slice(0, 7));
  }
  return [...meses].sort();
}

/**
 * O card de seleção: o que o lote levaria para as vendas marcadas. Mesmos
 * títulos (`titulosDeVenda`) e fórmula (`calcularAntecipacao`) de antes — só
 * saiu do navegador. `hoje` é YYYY-MM-DD (dia civil de Manaus).
 */
export function calcularSelecao(
  vendas: VendaParaAntecipacao[],
  periodo: PeriodoAntecipacao | null,
  hoje: string
): ResultadoSelecao {
  const porVenda = vendas.map((v) => ({ v, titulos: titulosDeVenda(v, periodo) }));
  const titulos = porVenda.flatMap((x) => x.titulos);
  const resumo = calcularAntecipacao(titulos);
  const parcelasCadastradas = porVenda
    .filter((x) => (x.v.parcelas_detalhes ?? []).length > 0)
    .reduce((soma, x) => soma + x.titulos.length, 0);
  const hojeMs = Date.parse(`${hoje}T00:00:00.000Z`);

  let vencidas = 0;
  let vendasSemParcelas = 0;
  for (const v of vendas) {
    const parcelas = v.parcelas_detalhes ?? [];
    if (parcelas.length === 0) {
      vendasSemParcelas += 1;
      continue;
    }
    for (const p of parcelas) {
      if (p.antecipada || p.emAndamento || p.paga || p.bloqueadaRh || p.excluida) continue;
      const d = paraData(p.dataVencimento);
      if (!d) continue;
      if (periodo && (d < periodo.inicio || d > periodo.fim)) continue;
      if (d.getTime() < hojeMs) vencidas += 1;
    }
  }

  return {
    vendas: vendas.length,
    parcelas: titulos.length,
    valorBruto: resumo.valorBruto,
    valorTaxa: resumo.valorTaxa,
    valorLiquido: resumo.valorLiquido,
    prazoMedioDias: resumo.prazoMedioDias,
    taxaPercent: resumo.taxaPercent,
    vencidas,
    vendasSemParcelas,
    parcelasCadastradas,
  };
}
