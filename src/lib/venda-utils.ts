/**
 * Calcula o valor total de uma venda, considerando itens (múltiplos produtos) ou campos legados.
 */
export function valorTotalVenda(v: {
  itens?: { subtotal: number }[];
  valorVenda?: number | null;
  quantidade?: number | null;
  valorFrete?: number | null;
  desconto?: number | null;
}): number {
  const frete = v.valorFrete ?? 0;
  const desconto = v.desconto ?? 0;
  if (v.itens && v.itens.length > 0) {
    return v.itens.reduce((s, i) => s + i.subtotal, 0) + frete - desconto;
  }
  return ((v.valorVenda ?? 0) * (v.quantidade ?? 1)) + frete - desconto;
}

/**
 * Texto dos produtos: lista de itens ou campo legado.
 */
export function produtosTexto(v: {
  itens?: { produtoNome: string; quantidade: number }[];
  produtoNome?: string | null;
  quantidade?: number | null;
}): string {
  if (v.itens && v.itens.length > 0) {
    return v.itens.map((i) => `${i.produtoNome}${i.quantidade > 1 ? ` (${i.quantidade}x)` : ""}`).join(", ");
  }
  return v.produtoNome ?? "—";
}

/**
 * Quantidade total: soma dos itens ou campo legado.
 */
export function quantidadeTotal(v: {
  itens?: { quantidade: number }[];
  quantidade?: number | null;
}): number {
  if (v.itens && v.itens.length > 0) {
    return v.itens.reduce((s, i) => s + i.quantidade, 0);
  }
  return v.quantidade ?? 1;
}

/**
 * Custo total (CMV) de uma venda: soma dos custos dos itens ou campo legado.
 * Retorna null quando dados de custo nao estao disponíveis.
 */
export function custoTotalVenda(v: {
  itens?: { custoProduto: number; quantidade: number }[];
  custoProduto?: number | null;
  quantidade?: number | null;
}): number | null {
  if (v.itens && v.itens.length > 0) {
    const hasCusto = v.itens.some((i) => i.custoProduto != null && i.custoProduto > 0);
    if (!hasCusto) return null;
    return v.itens.reduce((s, i) => s + (i.custoProduto || 0) * (i.quantidade || 1), 0);
  }
  if (v.custoProduto == null) return null;
  return v.custoProduto * (v.quantidade ?? 1);
}

/**
 * Margem bruta (%) de uma venda: (receita - CMV) / receita * 100.
 * Retorna null quando dados de custo nao estao disponíveis ou receita <= 0.
 */
export function margemVenda(v: {
  itens?: { custoProduto: number; quantidade: number; subtotal: number }[];
  custoProduto?: number | null;
  valorVenda?: number | null;
  quantidade?: number | null;
  valorFrete?: number | null;
}): number | null {
  const custo = custoTotalVenda(v);
  if (custo == null) return null;
  const receita = valorTotalVenda(v);
  if (receita <= 0) return null;
  return ((receita - custo) / receita) * 100;
}
