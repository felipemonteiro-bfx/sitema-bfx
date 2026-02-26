/**
 * Calcula o valor total de uma venda, considerando itens (múltiplos produtos) ou campos legados.
 */
export function valorTotalVenda(v: {
  itens?: { subtotal: number }[];
  valorVenda?: number | null;
  quantidade?: number | null;
  valorFrete?: number | null;
}): number {
  const frete = v.valorFrete ?? 0;
  if (v.itens && v.itens.length > 0) {
    return v.itens.reduce((s, i) => s + i.subtotal, 0) + frete;
  }
  return ((v.valorVenda ?? 0) * (v.quantidade ?? 1)) + frete;
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
