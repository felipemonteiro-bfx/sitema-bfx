/**
 * Linhas da tabela de produtos de uma venda (popover da fila de antecipação).
 *
 * O popover mostrava "CROPPED BÁSIC MARROM (2x) R$ 90,00" e o "2x" parecia
 * número de parcelas. Agora é Produto | Qtd. | Valor, com o preço de cada
 * unidade quando a quantidade passa de 1 e o total no rodapé. Somas em
 * centavos inteiros. Puro e testado.
 */

export interface ItemParaTabela {
  produtoNome: string;
  quantidade: number;
  subtotal: number;
}

export interface LinhaItem extends ItemParaTabela {
  /** Preço de uma unidade; `null` quando a quantidade é 1 (ou inválida). */
  unitario: number | null;
}

const centavos = (valor: number) => (Number.isFinite(valor) ? Math.round(valor * 100) : 0);

export function linhasDosItens(itens: ItemParaTabela[]): {
  linhas: LinhaItem[];
  totais: { quantidade: number; valor: number };
} {
  let quantidade = 0;
  let valor = 0;
  const linhas = itens.map((item) => {
    const qtd = Number.isFinite(item.quantidade) && item.quantidade > 0 ? item.quantidade : 0;
    quantidade += qtd;
    valor += centavos(item.subtotal);
    return {
      ...item,
      unitario: qtd > 1 ? Math.round(centavos(item.subtotal) / qtd) / 100 : null,
    };
  });
  return { linhas, totais: { quantidade, valor: valor / 100 } };
}
