/**
 * Simulação da margem de uma venda rápida antes de finalizar (spec §7, Fase 2).
 *
 * Função pura: recebe o que o formulário já tem e devolve os números do painel
 * "Resumo financeiro". Nada aqui é gravado — `lucroLiquido` e `taxaFinanceiraValor`
 * da venda seguem a regra atual de `criarVendaV2`.
 *
 * A taxa da Prudent vem de `@/lib/antecipacao` (fórmula inalterada).
 */

import {
  TAXA_MENSAL_PADRAO,
  calcularAntecipacao,
  titulosDeVenda,
  vendaEhAntecipavel,
} from "@/lib/antecipacao";
import { FORMA_PAGAMENTO } from "@/lib/forma-pagamento";
import { parcelaUnicaDaFolha } from "@/lib/parcelas";
import type { RegraVencimento } from "@/lib/regra-empresa";

export type CenarioAntecipacao = {
  chave: "nenhuma" | "menosUltima" | "todas";
  rotulo: string;
  taxa: number;
  dinheiroJa: number;
  lucro: number;
};

export type SimulacaoMargem = {
  total: number;
  valorParcela: number;
  custos: { produtos: number; envio: number; nota: number; comissao: number; desconto: number };
  repasse: { pct: number; valor: number } | null;
  limite: { antes: number; depois: number } | null;
  cenarios: CenarioAntecipacao[];
  semParcelas: boolean;
};

export type ParcelaSimulada = { numeroParcela: number; dataVencimento: string; valorParcela: number };

export type EntradaSimulacaoMargem = {
  /** YYYY-MM-DD */
  dataVenda: string;
  formaPagamento: string | null;
  subtotalProdutos: number;
  /** Σ custoProduto × quantidade */
  custoProdutos: number;
  /** Cobrado do cliente. */
  frete: number;
  /** Custo de envio. */
  envio: number;
  /** Manual + pontos. */
  desconto: number;
  temNota: boolean;
  taxaNotaPct: number;
  comissaoPct: number;
  parcelas: ParcelaSimulada[];
  numParcelas: number;
  repassePct: number | null;
  /** Do card de limite; null = sem limite conhecido. */
  disponivelAntes: number | null;
};

/** Formas em que o dinheiro entra na hora, sem antecipação. */
const FORMAS_DINHEIRO_JA: string[] = [
  FORMA_PAGAMENTO.PIX,
  FORMA_PAGAMENTO.DINHEIRO,
  FORMA_PAGAMENTO.CARTAO_DEBITO,
  FORMA_PAGAMENTO.TRANSFERENCIA,
];

const centavos = (x: number) => Math.round((Number.isFinite(x) ? x : 0) * 100) / 100;

export function simularMargemVenda(input: EntradaSimulacaoMargem): SimulacaoMargem {
  const total = input.subtotalProdutos + input.frete - input.desconto;
  const nota = input.temNota ? (input.subtotalProdutos * input.taxaNotaPct) / 100 : 0;
  const lucroBruto = total - input.custoProdutos - input.envio - nota;
  // Mesma fórmula que o formulário já mostra no tile de comissão.
  const comissao = (lucroBruto * input.comissaoPct) / 100;
  const repasse = input.repassePct
    ? { pct: input.repassePct, valor: centavos((total * input.repassePct) / 100) }
    : null;
  const base = lucroBruto - comissao - (repasse?.valor ?? 0);

  const valorParcela = input.numParcelas > 0 ? total / input.numParcelas : 0;
  const limite =
    input.disponivelAntes === null
      ? null
      : { antes: centavos(input.disponivelAntes), depois: centavos(input.disponivelAntes - valorParcela) };

  // Data ilegível (campo apagado) não é parcela informada: `titulosDeVenda` a descartaria e a
  // taxa sairia zerada sem o aviso.
  const parcelas = input.parcelas.filter((p) => !Number.isNaN(new Date(p.dataVencimento).getTime()));
  const semParcelas = parcelas.length === 0;
  const cenarios: CenarioAntecipacao[] = [];

  if (!vendaEhAntecipavel({ formaPagamento: input.formaPagamento })) {
    const dinheiroJa =
      input.formaPagamento !== null && FORMAS_DINHEIRO_JA.includes(input.formaPagamento) ? total : 0;
    cenarios.push({ chave: "nenhuma", rotulo: "Nenhuma", taxa: 0, dinheiroJa: centavos(dinheiroJa), lucro: centavos(base) });
  } else {
    const antecipar = (subconjunto: ParcelaSimulada[]) => {
      // Lista vazia não passa por `titulosDeVenda`: ela cairia no fallback de 30 dias
      // por parcela e inventaria uma taxa sem vencimento informado.
      if (subconjunto.length === 0) return { taxa: 0, liquido: 0 };
      const titulos = titulosDeVenda({
        dataVenda: input.dataVenda,
        valorVenda: total,
        parcelas: subconjunto.length,
        parcelas_detalhes: subconjunto.map((p) => ({ ...p, antecipada: false })),
      });
      const r = calcularAntecipacao(titulos, TAXA_MENSAL_PADRAO);
      return { taxa: r.valorTaxa, liquido: r.valorLiquido };
    };
    const cenario = (chave: CenarioAntecipacao["chave"], rotulo: string, subconjunto: ParcelaSimulada[]) => {
      const { taxa, liquido } = antecipar(subconjunto);
      return { chave, rotulo, taxa: centavos(taxa), dinheiroJa: centavos(liquido), lucro: centavos(base - taxa) };
    };

    cenarios.push({ chave: "nenhuma", rotulo: "Nenhuma", taxa: 0, dinheiroJa: 0, lucro: centavos(base) });
    const n = parcelas.length;
    if (n >= 2) {
      const ultima = Math.max(...parcelas.map((p) => p.numeroParcela));
      const semUltima = parcelas.filter((p) => p.numeroParcela !== ultima);
      cenarios.push(cenario("menosUltima", `${n - 1} de ${n}`, semUltima));
    }
    cenarios.push(cenario("todas", "Todas", parcelas));
  }

  return {
    total: centavos(total),
    valorParcela: centavos(valorParcela),
    custos: {
      produtos: centavos(input.custoProdutos),
      envio: centavos(input.envio),
      nota: centavos(nota),
      comissao: centavos(comissao),
      desconto: centavos(input.desconto),
    },
    repasse,
    limite,
    cenarios,
    semParcelas,
  };
}

/**
 * Parcelas que a simulação deve usar. Em 1x o formulário não mostra datas e a lista dele fica
 * vazia, ou velha de quando a venda era Nx (o formulário só a envia com mais de uma parcela).
 * O servidor grava, nesse caso, a parcela única da folha pela regra — a simulação usa a mesma.
 */
export function parcelasParaSimulacao(input: {
  numParcelas: number;
  informadas: ParcelaSimulada[];
  emFolha: boolean;
  /** YYYY-MM-DD */
  dataVenda: string;
  total: number;
  regra?: RegraVencimento;
}): ParcelaSimulada[] {
  if (input.numParcelas > 1) return input.informadas;
  return parcelaUnicaDaFolha({
    emFolha: input.emFolha,
    dataVenda: new Date(`${input.dataVenda}T00:00:00.000Z`),
    total: input.total,
    regra: input.regra,
  }).map((p) => ({
    numeroParcela: p.numeroParcela,
    dataVencimento: p.dataVencimento.toISOString().slice(0, 10),
    valorParcela: p.valorParcela,
  }));
}
