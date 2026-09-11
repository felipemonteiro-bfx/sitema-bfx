/**
 * Destaque de teclado numa lista de opções (dropdowns do `FormSelect`): setas
 * andam com volta nas pontas, Home/End vão direto. `-1` = nenhum destaque.
 */

export type TeclaLista = "ArrowDown" | "ArrowUp" | "Home" | "End";

export function moverDestaque(atual: number, total: number, tecla: TeclaLista): number {
  if (total <= 0) return -1;
  switch (tecla) {
    case "Home":
      return 0;
    case "End":
      return total - 1;
    case "ArrowDown":
      return atual < 0 ? 0 : (atual + 1) % total;
    case "ArrowUp":
      return atual < 0 ? total - 1 : (atual - 1 + total) % total;
  }
}
