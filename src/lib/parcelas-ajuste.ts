/**
 * Regra pura de ajuste da lista de parcelas na edicao de uma venda (D-01, D-02, D-03).
 *
 * O bug que motivou este modulo: `edit-parcelas-section.tsx` passava
 * `disableAutoInit={initialParcelas.length > 0}`, um booleano fixo que travava a geracao
 * da lista de datas de vencimento pra sempre em qualquer venda ja parcelada. Trocar o
 * campo Parcelas de 2 para 4 mudava so o cabecalho (`venda.parcelas`), nunca as linhas
 * (`parcelas_vencimento`) — a venda 182 em producao ficou com `parcelas = 4` e 5 linhas
 * gravadas.
 *
 * Este arquivo nao importa nada de React nem de `@/components`: e o unico lugar com a
 * regra de ajuste e de redistribuicao de valores, reaproveitado pela tela de edicao.
 *
 * Aritmetica de data em UTC, sem `new Date("YYYY-MM-DD")` seguido de getters locais
 * (ja houve bug de data aparecendo um dia antes — commit d9064ee). Parseia com
 * `.split("-")`, monta com `Date.UTC` e formata de volta com `.toISOString().slice(0, 10)`.
 */
import { calcularPrimeiroVencimento } from "@/lib/utils";

export type ParcelaAjuste = {
  numeroParcela: number;
  dataVencimento: string; // YYYY-MM-DD
  valorParcela: number;
};

/**
 * Divide `valorTotal` entre as parcelas: trunc de duas casas para todas menos a
 * ultima, e a ultima absorve o resto — a soma sempre fecha o total exato, mesmo
 * quando a divisao nao e exata (ex.: 100 em 3 -> 33.33 / 33.33 / 33.34).
 *
 * Regra movida de `edit-parcelas-section.tsx` (useEffect de total), sem alterar o
 * algoritmo — este passa a ser o unico lugar que a implementa (D-01).
 */
export function redistribuirValores(parcelas: ParcelaAjuste[], valorTotal: number): ParcelaAjuste[] {
  const n = parcelas.length;
  if (n === 0) return [];
  const base = Math.trunc((valorTotal / n) * 100) / 100;
  return parcelas.map((p, i) => ({
    ...p,
    valorParcela: i === n - 1 ? Math.round((valorTotal - base * (n - 1)) * 100) / 100 : base,
  }));
}

function parseDataPura(valor: string): { ano: number; mes: number; dia: number } {
  const [ano, mes, dia] = valor.split("-").map(Number);
  return { ano, mes: mes - 1, dia };
}

function formatarDataUtc(ano: number, mes: number, dia: number): string {
  return new Date(Date.UTC(ano, mes, dia)).toISOString().slice(0, 10);
}

/**
 * Soma `meses` a uma data YYYY-MM-DD preservando o DIA DA ANCORA, sem transbordar
 * para o mes seguinte quando esse dia nao existe no mes de destino.
 *
 * Somar de um em um a partir da parcela anterior fazia o dia encolher para sempre:
 * 31/01 virava 28/02 e, dai em diante, toda parcela seguinte herdava o 28 — a lista
 * saia 31, 28, 28, 28 em vez de 31, 28, 31, 30. Contando sempre a partir da ancora,
 * o encolhimento vale so para o mes curto e o dia volta ao original depois.
 */
function somarMeses(dataAncora: string, meses: number): string {
  const { ano, mes, dia } = parseDataPura(dataAncora);
  const ultimoDiaDoMesAlvo = new Date(Date.UTC(ano, mes + meses + 1, 0)).getUTCDate();
  return formatarDataUtc(ano, mes + meses, Math.min(dia, ultimoDiaDoMesAlvo));
}

function dataVendaParaDate(dataVenda?: string): Date {
  // Sem fallback para `new Date()`: o modulo se declara puro e em UTC, e o relogio
  // local do servidor tornaria a saida nao-determinista justamente no caminho que
  // GERA datas de vencimento do zero.
  if (!dataVenda) {
    throw new Error("ajustarParcelas: dataVenda e obrigatoria para gerar parcelas de uma lista vazia.");
  }
  const { ano, mes, dia } = parseDataPura(dataVenda);
  return new Date(Date.UTC(ano, mes, dia));
}

/**
 * Ajusta a lista de parcelas para o numero-alvo solicitado, preservando datas ja
 * combinadas com o cliente e nunca descartando uma parcela ja marcada como paga.
 *
 * - Se alguma `parcelasPagas` for maior que `numeroParcelas`, o alvo real vira essa
 *   maior parcela paga e `minimoPorPagas` reporta o clamp (D-01).
 * - Lista vazia: gera `alvo` linhas a partir de `calcularPrimeiroVencimento(dataVenda)`,
 *   dia 10, cadencia mensal — mesma regra da auto-init de `parcelas-vencimento-form.tsx`,
 *   para nao regredir a venda antiga sem linhas gravadas.
 * - Alvo menor que a lista atual: corta do fim, preservando as datas das que restam.
 * - Alvo maior: mantem as existentes intactas e acrescenta as faltantes, cada uma um
 *   mes depois da anterior, no mesmo dia do mes.
 * - Alvo igual: mantem as datas como estao (nenhum recalculo — a regressao que o
 *   `disableAutoInit` original existia para evitar).
 */
export function ajustarParcelas(input: {
  parcelas: ParcelaAjuste[];
  numeroParcelas: number;
  valorTotal: number;
  dataVenda?: string;
  parcelasPagas?: number[];
}): { parcelas: ParcelaAjuste[]; minimoPorPagas: number | null } {
  const { parcelas, numeroParcelas, valorTotal, dataVenda, parcelasPagas } = input;

  let alvo = numeroParcelas;
  let minimoPorPagas: number | null = null;
  if (parcelasPagas && parcelasPagas.length > 0) {
    const maiorPaga = Math.max(...parcelasPagas);
    if (maiorPaga > alvo) {
      alvo = maiorPaga;
      minimoPorPagas = maiorPaga;
    }
  }

  let resultado: ParcelaAjuste[];

  if (parcelas.length === 0) {
    const primeiroVencimento = calcularPrimeiroVencimento(dataVendaParaDate(dataVenda));
    resultado = Array.from({ length: alvo }).map((_, i) => ({
      numeroParcela: i + 1,
      dataVencimento: formatarDataUtc(
        primeiroVencimento.getUTCFullYear(),
        primeiroVencimento.getUTCMonth() + i,
        10,
      ),
      valorParcela: 0,
    }));
  } else if (alvo < parcelas.length) {
    resultado = parcelas.slice(0, alvo);
  } else if (alvo > parcelas.length) {
    resultado = [...parcelas];
    // Ancora fixa na ultima parcela que ja existia: cada nova conta N meses a
    // partir dela, e nao um mes a partir da anterior recem-criada.
    const ancora = parcelas[parcelas.length - 1].dataVencimento;
    let passo = 1;
    while (resultado.length < alvo) {
      resultado.push({
        numeroParcela: resultado.length + 1,
        dataVencimento: somarMeses(ancora, passo),
        valorParcela: 0,
      });
      passo += 1;
    }
  } else {
    resultado = [...parcelas];
  }

  resultado = resultado.map((p, i) => ({ ...p, numeroParcela: i + 1 }));

  return {
    parcelas: redistribuirValores(resultado, valorTotal),
    minimoPorPagas,
  };
}
