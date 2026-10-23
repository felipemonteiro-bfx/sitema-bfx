/**
 * Detecção de assunto da mensagem do cliente no WhatsApp. Fica separada para que o atendimento
 * determinístico (`whatsapp-manager-consultas.ts`) e o assistente de IA (`whatsapp-assistente-ia.ts`)
 * usem exatamente a mesma regra, sem um importar o outro.
 */
const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export interface Assunto {
  /** Pagamento, boleto, parcela, comprovante, saldo, limite, dívida, vencimento, pix. */
  financeiro: boolean;
  /** Pedido, compras, histórico, cadastro. */
  compras: boolean;
  /** Produto, preço, orçamento, estoque. */
  produto: boolean;
}

export function classificarAssunto(texto: string): Assunto {
  const t = normalizar(texto);
  const financeiro =
    /\b(paguei|pago|pagar|pagamento|pagamentos|comprovante|boleto|boletos|fatura|parcela|parcelas|limite|margem|devo|deve|divida|dividas|vence|vencem|vencimento|vencimentos|vencida|vencidas|atraso|atrasado|atrasada|atrasados|pix|deposito|depositei|transferi|transferencia)\b/.test(t) ||
    (/\bsaldo\b/.test(t) && !/\b(estoque|produto|catalogo)\b/.test(t));
  const compras =
    /\b(pedido|pedidos|compras|historico|cadastro)\b/.test(t) ||
    /\b(minha|minhas|meu|meus|ultima|ultimas)\s+compra/.test(t);
  const produto = /\b(preco|valor|orcamento|comprar|produto|estoque|iphone|celular)\b/.test(t);
  return { financeiro, compras, produto };
}
