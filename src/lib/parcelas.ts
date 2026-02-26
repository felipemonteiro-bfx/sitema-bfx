export const VALOR_PARCELA_MIN = 200; // parcela mínima (configurável)
export const VALOR_PARCELA_MAX = 475; // parcela máxima / teto (configurável)

/**
 * Sugere o número de parcelas para vendas com desconto em folha.
 * Garante que nenhuma parcela exceda VALOR_PARCELA_MAX.
 * Apenas para uso quando descontoEmFolha === true.
 */
export function sugerirParcelasDescontoEmFolha(valorTotal: number, maxParcelas = 12): number {
  if (valorTotal <= 0) return 1;
  return Math.min(maxParcelas, Math.max(1, Math.ceil(valorTotal / VALOR_PARCELA_MAX)));
}
