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
  // Sem nada visivel nao ha o que alternar; devolver a mesma referencia evita
  // um re-render sem mudanca de conteudo.
  if (idsVisiveis.length === 0) return selecionados as Set<number>;
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

/**
 * Quantos itens selecionados NAO estao na pagina visivel.
 *
 * A selecao sobrevive a troca de pagina e ao filtro de busca de proposito, mas
 * isso cria um caminho para excluir o que nao se ve: marcar 15 na pagina 1, ir
 * para a pagina 2 e clicar em excluir apaga 15 registros fora da tela. A UI usa
 * este numero para dizer isso na barra e no dialogo de confirmacao, em vez de
 * so mostrar o total.
 */
export function contarSelecionadosForaDaPagina(
  selecionados: ReadonlySet<number>,
  idsVisiveis: readonly number[]
): number {
  const visiveis = new Set(idsVisiveis);
  let fora = 0;
  for (const id of selecionados) {
    if (!visiveis.has(id)) fora++;
  }
  return fora;
}
