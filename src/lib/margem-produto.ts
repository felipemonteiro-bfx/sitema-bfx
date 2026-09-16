const STATUS_FORA = new Set(["cancelada", "estornada"]);

export type VendaParaMargem = {
  status: string;
  produtoNome: string | null;
  valorVenda: number | null;
  quantidade: number | null;
  custoProduto: number | null;
  itens: { produtoNome: string; subtotal: number; custoProduto: number; quantidade: number }[];
};

export type LinhaMargemProduto = {
  produto: string;
  quantidade: number;
  custoTotal: number;
  receitaTotal: number;
  lucro: number;
  margemPct: number;
};

/**
 * Margem por produto de um conjunto de vendas. Fonte única do relatório
 * `/api/relatorios/margem-produto` e da ferramenta `resumo_margem_produto` da IA.
 *
 * - Venda cancelada/estornada fica de fora (mesma regra do DRE).
 * - Venda com itens: cada item conta pelo subtotal e custo unitário × quantidade.
 * - Venda só de cabeçalho (sem itens): conta como um produto, valor × quantidade e custo
 *   unitário × quantidade — antes essas vendas sumiam do relatório.
 *
 * Receita é o valor do produto, sem frete nem desconto da venda. Ordenado por lucro.
 */
export function agregarMargemPorProduto(vendas: VendaParaMargem[]): LinhaMargemProduto[] {
  const porProduto = new Map<string, { quantidade: number; custoTotal: number; receitaTotal: number }>();
  const somar = (nome: string | null, receita: number, custo: number, quantidade: number) => {
    const chave = nome?.trim() ? nome.trim() : "Sem nome";
    const atual = porProduto.get(chave) ?? { quantidade: 0, custoTotal: 0, receitaTotal: 0 };
    atual.quantidade += quantidade;
    atual.custoTotal += custo;
    atual.receitaTotal += receita;
    porProduto.set(chave, atual);
  };

  for (const v of vendas) {
    if (STATUS_FORA.has(v.status)) continue;
    if (v.itens.length > 0) {
      for (const i of v.itens) {
        const qtd = i.quantidade || 1;
        somar(i.produtoNome, i.subtotal || 0, (i.custoProduto || 0) * qtd, qtd);
      }
    } else {
      const qtd = v.quantidade || 1;
      somar(v.produtoNome, (v.valorVenda || 0) * qtd, (v.custoProduto || 0) * qtd, qtd);
    }
  }

  return [...porProduto.entries()]
    .map(([produto, d]) => {
      const lucro = d.receitaTotal - d.custoTotal;
      return {
        produto,
        quantidade: d.quantidade,
        custoTotal: d.custoTotal,
        receitaTotal: d.receitaTotal,
        lucro,
        margemPct: d.receitaTotal > 0 ? (lucro / d.receitaTotal) * 100 : 0,
      };
    })
    .sort((a, b) => b.lucro - a.lucro);
}
