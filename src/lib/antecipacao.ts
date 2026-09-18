/**
 * Cálculo da antecipação de recebíveis junto à financeira Prudent.
 *
 * Regra de negócio (planilha `taxa smart`, fornecida pela Prudent):
 *   - N  = prazo MÉDIO dos títulos, sempre considerando D+1;
 *   - TX = taxa ao mês;
 *   - N <  30 dias → juros simples:   N * (TX/30)
 *   - N >= 30 dias → juros compostos: ((TX/100 + 1)^(N/30) - 1) * 100
 *
 * O prazo médio é a média dos vencimentos ponderada pelo valor de cada título.
 * Quando todos os títulos têm o mesmo valor, isso equivale à média aritmética dos
 * prazos que a planilha usa — ex.: (31 + 61 + 91 + 121) / 4 = 76 dias.
 *
 * A base do prazo é a DATA DA VENDA (emissão do título), não a data de hoje: os
 * prazos de 30/60/90/120 da planilha são nominais, contados a partir da emissão.
 * Decisão do André (2026-08-07), mantida com as consequências conhecidas: uma venda
 * antiga antecipada hoje exibe o prazo cheio desde a emissão (taxa maior que a de
 * um desconto contado a partir de hoje), e um título já vencido cai para prazo 0,
 * ou seja, taxa 0% e líquido igual ao bruto. Se a Prudent confirmar que conta da
 * data da operação, basta trocar a base em `titulosDeVenda`.
 */

import type { Prisma } from "@/generated/prisma";
import { FORMA_PAGAMENTO } from "@/lib/forma-pagamento";

/** Taxa ao mês praticada pela Prudent (célula "TAXA AO MÊS" da planilha). */
export const TAXA_MENSAL_PADRAO = 3.99;

/** Intervalo de um mês em dias, usado como base das duas fórmulas de juros. */
const DIAS_NO_MES = 30;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

export interface PeriodoAntecipacao {
  inicio: Date;
  fim: Date;
}

/**
 * Converte o par `MM/YYYY` da tela no intervalo UTC que delimita as parcelas.
 *
 * Fonte única para a tela, a server action e os três relatórios: cada um parseava
 * por conta própria e divergia. A action e o XLSX só faziam `Number(...)`, então
 * `13/2025` virava janeiro de 2026 e o lote gravava um período que ninguém pediu.
 * Mês fora de 1..12, ano ausente ou intervalo invertido devolvem `null` — sem período.
 */
export function parsePeriodoMesAno(
  mesInicio: string | null | undefined,
  mesFim: string | null | undefined
): PeriodoAntecipacao | null {
  const parse = (valor: string | null | undefined) => {
    if (!valor) return null;
    const partes = valor.split("/");
    if (partes.length !== 2) return null;
    const mes = Number(partes[0]);
    const ano = Number(partes[1]);
    if (!Number.isInteger(mes) || !Number.isInteger(ano)) return null;
    if (mes < 1 || mes > 12 || ano < 1000 || ano > 9999) return null;
    return { mes, ano };
  };

  const ini = parse(mesInicio);
  const fim = parse(mesFim);
  if (!ini || !fim) return null;

  const inicio = new Date(Date.UTC(ini.ano, ini.mes - 1, 1));
  // 23:59:59.999 — parar em .000 deixaria de fora uma parcela gravada no ultimo
  // segundo do mes. Hoje nao existe dado assim, mas o limite nao custa nada.
  const fimDate = new Date(Date.UTC(fim.ano, fim.mes, 0, 23, 59, 59, 999));
  if (fimDate < inicio) return null;

  return { inicio, fim: fimDate };
}

/** Título já reduzido ao que o cálculo precisa: quanto vale e em quantos dias vence. */
export interface TituloComPrazo {
  valor: number;
  prazoDias: number;
}

export interface ParcelaParaAntecipacao {
  numeroParcela?: number;
  dataVencimento: string | Date;
  valorParcela: number;
  antecipada?: boolean | null;
  /** Já está num lote enviado à Prudent, esperando retorno (2026-09-17). */
  emAndamento?: boolean | null;
}

export interface VendaParaAntecipacao {
  dataVenda: string | Date;
  valorVenda: number | null;
  parcelas: number | null;
  parcelas_detalhes?: ParcelaParaAntecipacao[];
}

export interface ResumoAntecipacao {
  prazoMedioDias: number;
  taxaPercent: number;
  valorBruto: number;
  valorTaxa: number;
  valorLiquido: number;
}

/** Converte uma data para o número do dia em UTC, descartando a hora. */
function diaUtc(value: string | Date): number {
  const d = value instanceof Date ? value : new Date(value);
  const ms = d.getTime();
  if (Number.isNaN(ms)) return Number.NaN;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / MS_POR_DIA;
}

/**
 * Prazo de um título em dias, considerando D+1 — um vencimento no mesmo dia da
 * emissão vale 1 dia. Título já vencido (ou data inválida) vale 0, para não
 * gerar taxa negativa.
 */
export function prazoTituloDias(dataBase: string | Date, dataVencimento: string | Date): number {
  const diff = diaUtc(dataVencimento) - diaUtc(dataBase);
  if (!Number.isFinite(diff) || diff < 0) return 0;
  return diff + 1;
}

/**
 * Reduz uma venda aos títulos que serão de fato antecipados: as parcelas ainda
 * não antecipadas e, se um período for informado, apenas as que vencem dentro dele.
 *
 * Vendas antigas sem `parcelas_detalhes` caem no fallback de 30 dias por parcela,
 * que preserva o número exibido antes desta função existir. O fallback não tem
 * datas reais para confrontar com o período: quando há período ativo ele devolve
 * lista vazia, porque a server action também não conseguiria antecipar nada — ela
 * só enxerga linhas reais de `parcelaVencimento`.
 */
export function titulosDeVenda(
  venda: VendaParaAntecipacao,
  periodo?: { inicio?: Date | null; fim?: Date | null } | null
): TituloComPrazo[] {
  const temPeriodo = Boolean(periodo?.inicio || periodo?.fim);
  const detalhes = venda.parcelas_detalhes;

  if (detalhes && detalhes.length > 0) {
    return detalhes
      // Parcela antecipada ou já num lote em andamento não entra em lote novo.
      .filter((p) => !p.antecipada && !p.emAndamento)
      .filter((p) => {
        const venc = p.dataVencimento instanceof Date ? p.dataVencimento : new Date(p.dataVencimento);
        // Data ilegível é descartada com ou sem período: entrar como prazo 0
        // puxaria a média para baixo e inventaria um desconto menor.
        if (Number.isNaN(venc.getTime())) return false;
        if (!temPeriodo) return true;
        if (periodo?.inicio && venc < periodo.inicio) return false;
        if (periodo?.fim && venc > periodo.fim) return false;
        return true;
      })
      .map((p) => ({
        valor: p.valorParcela || 0,
        prazoDias: prazoTituloDias(venda.dataVenda, p.dataVencimento),
      }));
  }

  if (temPeriodo) return [];

  const total = venda.valorVenda || 0;
  if (total <= 0) return [];

  const qtd = Math.max(1, venda.parcelas || 1);
  const valorParcela = total / qtd;
  return Array.from({ length: qtd }, (_, i) => ({
    valor: valorParcela,
    prazoDias: DIAS_NO_MES * (i + 1) + 1,
  }));
}

/** Média dos prazos ponderada pelo valor de cada título. */
export function calcularPrazoMedioDias(titulos: TituloComPrazo[]): number {
  const totalValor = titulos.reduce((sum, t) => sum + (t.valor || 0), 0);
  if (totalValor <= 0) return 0;

  const ponderado = titulos.reduce((sum, t) => sum + (t.valor || 0) * (t.prazoDias || 0), 0);
  return ponderado / totalValor;
}

/** Taxa total do período: juros simples abaixo de 30 dias, compostos a partir daí. */
export function calcularTaxaPercent(
  prazoMedioDias: number,
  taxaMensal: number = TAXA_MENSAL_PADRAO
): number {
  if (!Number.isFinite(prazoMedioDias) || prazoMedioDias <= 0) return 0;
  if (prazoMedioDias < DIAS_NO_MES) {
    return prazoMedioDias * (taxaMensal / DIAS_NO_MES);
  }
  return (Math.pow(1 + taxaMensal / 100, prazoMedioDias / DIAS_NO_MES) - 1) * 100;
}

/** Prazo médio, taxa, bruto, deságio e líquido de um conjunto de títulos. */
export function calcularAntecipacao(
  titulos: TituloComPrazo[],
  taxaMensal: number = TAXA_MENSAL_PADRAO
): ResumoAntecipacao {
  const valorBruto = titulos.reduce((sum, t) => sum + (t.valor || 0), 0);
  const prazoMedioDias = calcularPrazoMedioDias(titulos);
  const taxaPercent = calcularTaxaPercent(prazoMedioDias, taxaMensal);
  const valorTaxa = valorBruto * (taxaPercent / 100);

  return {
    prazoMedioDias,
    taxaPercent,
    valorBruto,
    valorTaxa,
    valorLiquido: valorBruto - valorTaxa,
  };
}

/**
 * SE desconto em folha, ENTÃO a venda é antecipada junto à Prudent.
 *
 * `formaPagamento` é a fonte de verdade; o flag legado `descontoEmFolha` só decide
 * quando a forma canônica está ausente (vendas anteriores ao backfill). Uma forma
 * presente mas inválida NÃO cai no legado — senão este predicado divergiria do
 * `WHERE_VENDA_ANTECIPAVEL`, que é quem roda de fato no banco.
 *
 * Este é o espelho legível e testável do filtro SQL abaixo: os dois precisam
 * responder o mesmo para qualquer venda.
 */
export function vendaEhAntecipavel(venda: {
  formaPagamento?: string | null;
  descontoEmFolha?: boolean | null;
  status?: string | null;
}): boolean {
  // Venda desfeita não vai para a financeira (mesma regra da planilha de controle).
  if (venda.status === "cancelada" || venda.status === "estornada") return false;
  if (venda.formaPagamento != null) {
    return venda.formaPagamento === FORMA_PAGAMENTO.DESCONTO_FOLHA;
  }
  return Boolean(venda.descontoEmFolha);
}

/**
 * Filtro Prisma equivalente a `vendaEhAntecipavel`, para aplicar no banco em vez de
 * trazer todas as vendas e descartar em memória.
 */
export const WHERE_VENDA_ANTECIPAVEL = {
  status: { notIn: ["cancelada", "estornada"] },
  OR: [
    { formaPagamento: FORMA_PAGAMENTO.DESCONTO_FOLHA },
    { formaPagamento: null, descontoEmFolha: true },
  ],
} satisfies Prisma.VendaWhereInput;
