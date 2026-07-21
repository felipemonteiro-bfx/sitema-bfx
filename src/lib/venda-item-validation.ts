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

function normalizaNome(nome: string) {
  return nome.trim().toLowerCase();
}

/**
 * Valida itens de uma venda antes de gravar no banco:
 *
 * 1. subtotal deve ser exatamente valorVenda x quantidade (evita venda registrada
 *    com subtotal dissociado do preço/quantidade real).
 * 2. Quando o nome do item bate com um produto do catálogo, o custo informado não
 *    pode ser menor que o custo cadastrado (evita inflar lucro/comissão alegando
 *    um custo mais baixo do que o real). O preço de venda fica livre — o vendedor
 *    pode dar desconto — não há teto nem piso comparado ao catálogo.
 *
 * Retorna a primeira mensagem de erro encontrada, ou null se tudo estiver OK.
 */
export function validarItensContraCatalogo(
  itens: ItemVendaParaValidar[],
  catalogo: CatalogoProduto[]
): string | null {
  for (const item of itens) {
    const subtotalEsperado = item.valorVenda * item.quantidade;
    if (Math.abs(subtotalEsperado - item.subtotal) > TOLERANCIA_CENTAVOS) {
      return `Subtotal do produto "${item.produtoNome}" não confere com valor de venda × quantidade.`;
    }

    const candidatos = catalogo.filter(
      (c) => normalizaNome(c.nome) === normalizaNome(item.produtoNome)
    );
    if (candidatos.length === 0) continue;

    const custoValido = candidatos.some(
      (c) => c.custoPadrao == null || item.custoProduto >= c.custoPadrao - TOLERANCIA_CENTAVOS
    );
    if (!custoValido) {
      return `Custo informado para "${item.produtoNome}" é menor que o custo cadastrado no catálogo.`;
    }
  }

  return null;
}
