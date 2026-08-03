const TOLERANCIA_CENTAVOS = 0.01;

export type ItemVendaParaValidar = {
  produtoNome: string;
  custoProduto: number;
  valorVenda: number;
  quantidade: number;
  subtotal: number;
};

export type CatalogoProduto = {
  nome: string;
  custoPadrao: number | null;
};

/**
 * Valida itens de uma venda antes de gravar no banco:
 *
 * 1. subtotal deve ser exatamente valorVenda x quantidade (evita venda registrada
 *    com subtotal dissociado do preço/quantidade real).
 *
 * O piso de custo (custoProduto < custoPadrao do catálogo) foi removido por
 * PDV-14/D-01: decisão de negócio D-03 libera o custo digitado pelo vendedor sem
 * consulta ao catálogo, para qualquer perfil, revertendo o commit `a63dc04`.
 * Está marcado `⚠️ Revisit` no PROJECT.md. O segundo parâmetro é mantido de
 * propósito (compatibilidade de assinatura com os chamadores e com a suite de
 * testes que prova a ausência do piso), mas deliberadamente ignorado.
 *
 * Retorna a primeira mensagem de erro encontrada, ou null se tudo estiver OK.
 */
export function validarItensContraCatalogo(
  itens: ItemVendaParaValidar[],
  _catalogo: CatalogoProduto[] = []
): string | null {
  for (const item of itens) {
    const subtotalEsperado = item.valorVenda * item.quantidade;
    if (Math.abs(subtotalEsperado - item.subtotal) > TOLERANCIA_CENTAVOS) {
      return `Subtotal do produto "${item.produtoNome}" não confere com valor de venda × quantidade.`;
    }
  }

  return null;
}
