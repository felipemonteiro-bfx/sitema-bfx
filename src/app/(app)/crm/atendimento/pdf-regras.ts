// Regras puras do visualizador de PDF: PDF de milhares de páginas não pode travar a aba.

/** Máximo de páginas montadas no visualizador (o resto vem pelo download). */
export const LIMITE_PAGINAS_EXIBIDAS = 500;
/** Proporção altura/largura assumida (A4) até a página ser medida ao ficar visível. */
export const RAZAO_PADRAO = 1.4142;

export const paginasExibidas = (total: number): number => Math.min(Math.max(total, 0), LIMITE_PAGINAS_EXIBIDAS);

export function avisoLimitePaginas(total: number): string | null {
  return total > LIMITE_PAGINAS_EXIBIDAS ? `Mostrando as ${LIMITE_PAGINAS_EXIBIDAS} primeiras páginas. Baixe para ver o resto.` : null;
}
