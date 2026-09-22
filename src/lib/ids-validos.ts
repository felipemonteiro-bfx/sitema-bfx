/** Teto de ids aceitos em uma seleção enviada pelo navegador. */
const LIMITE_IDS = 1000;

/**
 * Normaliza ids de venda vindos de formulário ou de uma action tipada.
 * Remove valores inválidos, duplicados e seleções acima do limite da fila.
 */
export function idsValidos(entrada: (FormDataEntryValue | number)[]): number[] {
  const numeros = entrada.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0);
  return [...new Set(numeros)].slice(0, LIMITE_IDS);
}
