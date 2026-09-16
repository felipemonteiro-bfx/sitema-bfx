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

/**
 * `valorParcela` depois de editar a venda. Recalcula com a mesma conta de `criarVendaV2`
 * só quando o número de parcelas ou o total mudou; senão devolve `undefined` e o campo
 * não é tocado. Recalcular sempre reescreveria, num save sem mudança, o valor de venda
 * importada ou legada que não é `total / parcelas` (juros embutidos).
 */
export function valorParcelaAposEdicao(input: {
  antes: { parcelas: number | null; total: number } | null;
  /** `total: null` = o form não trouxe como saber o total (sem itens e sem `valor`). */
  depois: { parcelas: number; total: number | null };
}): number | undefined {
  const { antes, depois } = input;
  if (!antes || depois.total == null) return undefined;
  const mudouParcelas = (antes.parcelas ?? 1) !== depois.parcelas;
  const mudouTotal = Math.abs(antes.total - depois.total) >= 0.01;
  if (!mudouParcelas && !mudouTotal) return undefined;
  return depois.parcelas > 0 ? Math.trunc((depois.total / depois.parcelas) * 100) / 100 : 0;
}
