/**
 * Custo de antecipação Prudent aplicado a uma venda.
 *
 * Regra do André: TODA venda em desconto em folha vai ser antecipada na
 * Prudent. Logo o deságio não é hipótese — é custo certo daquela venda, desde
 * o dia em que ela é criada. Por isso o valor é gravado direto em
 * `Venda.taxaFinanceiraValor` (uma coluna que já existe no schema e que hoje
 * nada em `src/` lê ou escreve) em vez de virar um lançamento avulso de
 * despesa: um lançamento avulso permitiria o mesmo deságio entrar duas vezes
 * no DRE — uma vez pela coluna da venda, outra pela tabela de despesas
 * (`finance.ts` já soma `variaveis`, que vem de despesas, dentro de
 * `custosVar`). Nenhum caminho deste módulo cria `Despesa`.
 *
 * A fórmula em si — 3,99% a.m., prazo médio D+1, juros simples abaixo de 30
 * dias e compostos a partir daí — NÃO é reescrita aqui. Este módulo só
 * traduz uma venda para o formato que `titulosDeVenda`/`calcularAntecipacao`
 * (`@/lib/antecipacao`) já sabem calcular, e não importa nada de banco.
 */
import {
  titulosDeVenda,
  calcularAntecipacao,
  vendaEhAntecipavel,
  TAXA_MENSAL_PADRAO,
} from "@/lib/antecipacao";

export interface VendaParaCustoAntecipacao {
  formaPagamento?: string | null;
  descontoEmFolha?: boolean | null;
  dataVenda: string | Date;
  /**
   * TOTAL da venda — nunca o valor unitário. Quando `parcelas_detalhes` não é
   * informado, o fallback de `titulosDeVenda` divide este número pelas
   * parcelas para reconstruir cada título.
   */
  valorVenda: number | null;
  parcelas: number | null;
  parcelas_detalhes?: {
    dataVencimento: string | Date;
    valorParcela: number;
    /** Aceito mas ignorado — ver comentário em `custoAntecipacaoVenda`. */
    antecipada?: boolean | null;
  }[];
}

/**
 * Custo (deságio) da antecipação de uma venda, arredondado a centavo.
 *
 * Devolve `null` quando a venda não vai para a Prudent (`vendaEhAntecipavel`
 * falso) — nulo, não zero: zero significaria "passou pela Prudent e não
 * custou nada". Quando vai, monta os títulos com `titulosDeVenda`, ignorando
 * de propósito o flag `antecipada` de cada parcela: esse flag é escrito
 * DEPOIS, quando o lote da fila da Prudent roda
 * (`src/app/(app)/prudent/page.tsx`), e descreve se a parcela já foi
 * fisicamente antecipada — não se ela deve gerar custo. O custo é da venda
 * inteira desde a criação, então o flag é neutralizado (forçado a `false`)
 * antes de chamar `titulosDeVenda`. Sem isso, o custo de uma venda evaporaria
 * do DRE justamente quando o lote roda e ele vira real (QK-LGJ-01).
 */
export function custoAntecipacaoVenda(
  venda: VendaParaCustoAntecipacao,
  taxaMensal: number = TAXA_MENSAL_PADRAO
): number | null {
  if (!vendaEhAntecipavel(venda)) return null;

  const titulos = titulosDeVenda({
    dataVenda: venda.dataVenda,
    valorVenda: venda.valorVenda,
    parcelas: venda.parcelas,
    parcelas_detalhes: venda.parcelas_detalhes?.map((p) => ({
      dataVencimento: p.dataVencimento,
      valorParcela: p.valorParcela,
      antecipada: false,
    })),
  });

  const { valorTaxa } = calcularAntecipacao(titulos, taxaMensal);
  if (!Number.isFinite(valorTaxa)) return 0;
  return Math.round(valorTaxa * 100) / 100;
}

/**
 * Lucro líquido de uma venda já descontado do custo de antecipação, quando há
 * custo. Quando `custoAntecipacao` é nulo (venda não foi para a Prudent), o
 * lucro volta intacto.
 */
export function lucroLiquidoComAntecipacao(
  lucroSemAntecipacao: number,
  custoAntecipacao: number | null
): number {
  if (custoAntecipacao == null) return lucroSemAntecipacao;
  return Math.round((lucroSemAntecipacao - custoAntecipacao) * 100) / 100;
}
