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
import { REGRA_PADRAO, type RegraVencimento } from "@/lib/regra-empresa";

export type ParcelaAjuste = {
  numeroParcela: number;
  dataVencimento: string; // YYYY-MM-DD
  valorParcela: number;
};

/**
 * Total que as parcelas da edição de venda devem somar: itens + frete − desconto, o
 * mesmo de `valorTotalVenda`. Arredondado em centavos para a montagem da tela não
 * enxergar uma "mudança" de ponto flutuante e redistribuir parcelas sem motivo.
 */
export function totalParaParcelas(input: { subtotalItens: number; frete: number; desconto: number }): number {
  return Math.round((input.subtotalItens + input.frete - input.desconto) * 100) / 100;
}

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
 * - Lista vazia: gera `alvo` linhas a partir de `calcularPrimeiroVencimento(dataVenda, regra)`,
 *   no dia de vencimento da regra da empresa (default dia 10), cadencia mensal — mesma regra da auto-init de `parcelas-vencimento-form.tsx`,
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
  regra?: RegraVencimento;
}): { parcelas: ParcelaAjuste[]; minimoPorPagas: number | null } {
  const { parcelas, numeroParcelas, valorTotal, dataVenda, parcelasPagas, regra } = input;

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
    const primeiroVencimento = calcularPrimeiroVencimento(dataVendaParaDate(dataVenda), regra);
    resultado = Array.from({ length: alvo }).map((_, i) => ({
      numeroParcela: i + 1,
      dataVencimento: formatarDataUtc(
        primeiroVencimento.getUTCFullYear(),
        primeiroVencimento.getUTCMonth() + i,
        regra?.diaVencimento ?? 10,
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

function mesmaRegra(a?: RegraVencimento, b?: RegraVencimento): boolean {
  const x = a ?? REGRA_PADRAO;
  const y = b ?? REGRA_PADRAO;
  return x.diaCorte === y.diaCorte && x.diaVencimento === y.diaVencimento;
}

/**
 * Decide o que a auto-init de `parcelas-vencimento-form.tsx` deve fazer a cada
 * render. `parcelas: null` significa "nada a fazer" — o componente so chama
 * `onChange` quando vem uma lista.
 *
 * O bug que motivou a funcao (relatado em 2026-08-27): a condicao da auto-init era
 *
 *   parcelas.length !== numeroParcelas ||
 *   parcelas[0]?.valorParcela !== Math.trunc((valorTotal / numeroParcelas) * 100) / 100
 *
 * isto e, o VALOR DA PRIMEIRA PARCELA servia de sentinela de "a lista esta
 * desatualizada". Ajustar o valor da 1a parcela — o proprio campo diz "ajustar se
 * necessario" — tornava a condicao verdadeira e o effect regenerava a lista inteira,
 * descartando a edicao e reescrevendo TODAS as datas de vencimento ja escolhidas. Da
 * 2a parcela em diante ninguem olhava, por isso so a primeira parecia travada.
 *
 * A sentinela correta e o que de fato invalida a lista: o numero de parcelas (muda o
 * tamanho) e o valor total (muda a divisao, nunca as datas).
 *
 * `valorTotalObservado` e o valor que o chamador deve guardar para o proximo render.
 * Ele NAO e sempre `valorTotal`: quando a funcao pula sem olhar o total (venda em uma
 * parcela so, entrada invalida), o anterior tem que continuar valendo. Avancar mesmo
 * assim engole a mudanca — achado do review: carrinho de 1400 em 3x, cai para 400 e o
 * campo Parcelas vai a 1, volta para 1400 em 3x, e a lista fica presa em 3x 133,33.
 */
export function sincronizarParcelasAuto(input: {
  parcelas: ParcelaAjuste[];
  numeroParcelas: number;
  valorTotal: number;
  /** Total do render anterior. `null` no primeiro render — sem "mudanca" a detectar. */
  valorTotalAnterior: number | null;
  dataVenda?: string;
  /** Corte e dia de vencimento da empresa do cliente; sem ela, corte 20 / dia 10. */
  regra?: RegraVencimento;
  /**
   * Regra usada no render anterior (`undefined` = padrão 20/10). Só é considerada quando a chave
   * vem no input: o formulário da venda rápida a passa sempre; quem não passa não re-sincroniza.
   */
  regraAnterior?: RegraVencimento;
}): { parcelas: ParcelaAjuste[] | null; valorTotalObservado: number | null } {
  const { parcelas, numeroParcelas, valorTotal, valorTotalAnterior, dataVenda, regra, regraAnterior } = input;
  const pular = { parcelas: null, valorTotalObservado: valorTotalAnterior };

  // Pagamento unico: o card nem aparece e nao existe lista a manter.
  if (numeroParcelas <= 1) return pular;

  // Entrada corrompida (querystring solta, campo em branco). Sem os guardas, cada um
  // destes e um loop de render: com NaN, `valorTotalAnterior !== valorTotal` e sempre
  // verdadeiro; com 2.5 parcelas, `Array.from({ length: 2.5 })` gera 2 e o tamanho
  // nunca fecha. A auto-init antiga tinha os mesmos dois loops.
  if (!Number.isFinite(valorTotal)) return pular;
  if (!Number.isInteger(numeroParcelas)) return pular;

  if (parcelas.length !== numeroParcelas) {
    return {
      parcelas: ajustarParcelas({ parcelas, numeroParcelas, valorTotal, dataVenda, regra }).parcelas,
      valorTotalObservado: valorTotal,
    };
  }

  // A regra da empresa chega por fetch depois que a lista já foi gerada com o padrão (ou a de
  // outro cliente). Se a lista ainda é exatamente a que a regra anterior geraria, ninguém mexeu
  // nas datas: troca pelas da regra nova, mantendo os valores. Se alguma data difere, é escolha
  // do usuário e fica (2026-09-30).
  if ("regraAnterior" in input && dataVenda && !mesmaRegra(regra, regraAnterior)) {
    const geradasAntes = ajustarParcelas({ parcelas: [], numeroParcelas, valorTotal, dataVenda, regra: regraAnterior }).parcelas;
    const intocada = geradasAntes.every((p, i) => p.dataVencimento === parcelas[i]?.dataVencimento);
    if (intocada) {
      const geradasAgora = ajustarParcelas({ parcelas: [], numeroParcelas, valorTotal, dataVenda, regra }).parcelas;
      const novas = parcelas.map((p, i) => ({ ...p, dataVencimento: geradasAgora[i].dataVencimento }));
      const totalMudou = valorTotalAnterior !== null && valorTotalAnterior !== valorTotal;
      return {
        parcelas: totalMudou ? redistribuirValores(novas, valorTotal) : novas,
        valorTotalObservado: valorTotal,
      };
    }
  }

  if (valorTotalAnterior !== null && valorTotalAnterior !== valorTotal) {
    return {
      parcelas: redistribuirValores(parcelas, valorTotal),
      valorTotalObservado: valorTotal,
    };
  }

  // Mesmo tamanho e mesmo total: qualquer diferenca aqui e edicao do usuario
  // (valor de uma parcela ou data de vencimento) e precisa ser preservada.
  return { parcelas: null, valorTotalObservado: valorTotal };
}
