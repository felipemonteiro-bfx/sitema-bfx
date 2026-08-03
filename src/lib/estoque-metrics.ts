// UXP-03 / D-04: metricas de estoque da aba Estoque do `/financeiro`.
//
// Este modulo foi extraido de `financeiro/page.tsx:106-121` SEM ALTERAR AS FORMULAS.
// Mudar qualquer uma das quatro formulas abaixo (capital imobilizado, potencial de
// receita, margem percentual, itens zerados) e REGRESSAO DE RELATORIO FINANCEIRO,
// nao refatoracao. Ver `08-CONTEXT.md` (D-04) e a suite de nao-regressao em
// `src/__tests__/estoque-metrics-nao-regressao.test.ts`.
//
// Zero imports de proposito: precisa continuar importavel por
// `node --input-type=module` nesta maquina (sem node_modules) para servir de gate
// local, complementando o gate real do CI (`npx vitest run`).

export type ProdutoEstoque = {
  nome: string;
  custoPadrao: number | null;
  qtdEstoque: number | null;
  valorVenda: number | null;
};

export type MetricasEstoque<T extends ProdutoEstoque> = {
  produtosOrdenados: T[];
  estoqueImobilizado: number;
  estoquePotencialReceita: number;
  estoqueMargemPct: number;
  estoqueItensZerados: number;
};

// Transplantado de `financeiro/page.tsx:106-121`, sem edicao semantica.
export function calcularMetricasEstoque<T extends ProdutoEstoque>(
  produtos: readonly T[],
): MetricasEstoque<T> {
  const produtosOrdenados = [...produtos].sort((a, b) => {
    const imobA = (a.custoPadrao ?? 0) * (a.qtdEstoque ?? 0);
    const imobB = (b.custoPadrao ?? 0) * (b.qtdEstoque ?? 0);
    return imobB - imobA;
  });

  const estoqueImobilizado = produtos.reduce(
    (s, p) => s + (p.custoPadrao ?? 0) * (p.qtdEstoque ?? 0), 0
  );
  const estoquePotencialReceita = produtos.reduce(
    (s, p) => s + (p.valorVenda ?? 0) * (p.qtdEstoque ?? 0), 0
  );
  const estoqueMargemPct = estoquePotencialReceita > 0
    ? ((estoquePotencialReceita - estoqueImobilizado) / estoquePotencialReceita) * 100
    : 0;
  const estoqueItensZerados = produtos.filter(p => (p.qtdEstoque ?? 0) === 0).length;

  return {
    produtosOrdenados,
    estoqueImobilizado,
    estoquePotencialReceita,
    estoqueMargemPct,
    estoqueItensZerados,
  };
}
