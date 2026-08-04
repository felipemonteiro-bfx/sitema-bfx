/**
 * Selecao em massa nas tabelas de Cadastros.
 *
 * O checkbox do cabecalho vale para a PAGINA VISIVEL, nao para o dataset
 * inteiro. Antes disso ser explicito, "Selecionar todos" com 15 linhas na tela
 * marcava os 834 registros do banco, e o bulk delete seguinte apagaria todos.
 *
 * A selecao de outras paginas e' preservada de proposito: quem marcou itens na
 * pagina 1, foi para a pagina 2 e voltou nao deveria perder o que marcou.
 */

/** Marca ou desmarca os ids visiveis, sem tocar no resto da selecao. */
export function alternarSelecaoDaPagina(
  selecionados: ReadonlySet<number>,
  idsVisiveis: readonly number[],
  marcar: boolean
): Set<number> {
  const proximo = new Set(selecionados);
  for (const id of idsVisiveis) {
    if (marcar) proximo.add(id);
    else proximo.delete(id);
  }
  return proximo;
}

/**
 * Estado do checkbox do cabecalho, olhando so para a pagina visivel.
 * Selecao de outras paginas nao influencia — senao o cabecalho apareceria
 * marcado numa pagina em que nada esta selecionado.
 */
export function estadoCheckboxDaPagina(
  selecionados: ReadonlySet<number>,
  idsVisiveis: readonly number[]
): boolean | "indeterminate" {
  if (idsVisiveis.length === 0) return false;
  let marcados = 0;
  for (const id of idsVisiveis) {
    if (selecionados.has(id)) marcados++;
  }
  if (marcados === 0) return false;
  return marcados === idsVisiveis.length ? true : "indeterminate";
}
