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

// RED (TDD): stub deliberado que ainda nao implementa as formulas — existe so
// para provar que o one-liner de `<verify>` falha por causa de valores errados
// (nao por "modulo nao existe"), antes da implementacao real chegar no proximo
// commit (GREEN).
export function calcularMetricasEstoque<T extends ProdutoEstoque>(
  produtos: readonly T[],
): MetricasEstoque<T> {
  return {
    produtosOrdenados: [...produtos],
    estoqueImobilizado: 0,
    estoquePotencialReceita: 0,
    estoqueMargemPct: 0,
    estoqueItensZerados: 0,
  };
}
