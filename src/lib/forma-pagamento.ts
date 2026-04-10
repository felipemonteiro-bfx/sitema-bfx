/**
 * Forma de pagamento canônica de uma venda.
 *
 * O sistema mantém os flags legados `descontoEmFolha` e `boleto` na tabela `vendas`
 * para compatibilidade com integrações antigas (ex.: Asaas, importador, relatórios).
 * Este módulo centraliza a conversão entre o enum canônico e os flags derivados,
 * garantindo que toda venda nova/atualizada grave os dois lados em sincronia.
 */

export const FORMA_PAGAMENTO = {
  DESCONTO_FOLHA: "DESCONTO_FOLHA",
  BOLETO: "BOLETO",
  PIX: "PIX",
  DINHEIRO: "DINHEIRO",
  CARTAO_CREDITO: "CARTAO_CREDITO",
  CARTAO_DEBITO: "CARTAO_DEBITO",
  TRANSFERENCIA: "TRANSFERENCIA",
  OUTRO: "OUTRO",
} as const;

export type FormaPagamento = (typeof FORMA_PAGAMENTO)[keyof typeof FORMA_PAGAMENTO];

export const FORMAS_PAGAMENTO_LIST: FormaPagamento[] = [
  FORMA_PAGAMENTO.DESCONTO_FOLHA,
  FORMA_PAGAMENTO.BOLETO,
  FORMA_PAGAMENTO.PIX,
  FORMA_PAGAMENTO.DINHEIRO,
  FORMA_PAGAMENTO.CARTAO_CREDITO,
  FORMA_PAGAMENTO.CARTAO_DEBITO,
  FORMA_PAGAMENTO.TRANSFERENCIA,
  FORMA_PAGAMENTO.OUTRO,
];

/** Label amigável (PT-BR) para uso em selects, tabelas e PDF. */
export function formaPagamentoLabel(forma: FormaPagamento | null | undefined): string {
  switch (forma) {
    case FORMA_PAGAMENTO.DESCONTO_FOLHA:
      return "Desconto em folha";
    case FORMA_PAGAMENTO.BOLETO:
      return "Boleto";
    case FORMA_PAGAMENTO.PIX:
      return "Pix";
    case FORMA_PAGAMENTO.DINHEIRO:
      return "Dinheiro";
    case FORMA_PAGAMENTO.CARTAO_CREDITO:
      return "Cartão de crédito";
    case FORMA_PAGAMENTO.CARTAO_DEBITO:
      return "Cartão de débito";
    case FORMA_PAGAMENTO.TRANSFERENCIA:
      return "Transferência";
    case FORMA_PAGAMENTO.OUTRO:
      return "Outro";
    default:
      return "—";
  }
}

/** Verifica se uma string é uma forma de pagamento válida. */
export function isFormaPagamento(value: unknown): value is FormaPagamento {
  return typeof value === "string" && (FORMAS_PAGAMENTO_LIST as string[]).includes(value);
}

/**
 * Deriva os flags legados (`descontoEmFolha`, `boleto`) a partir da forma canônica.
 * Use ao gravar uma venda — sempre passe os dois lados ao Prisma para manter consistência.
 */
export function legacyFlagsFromForma(forma: FormaPagamento | null | undefined): {
  descontoEmFolha: boolean;
  boleto: boolean;
} {
  return {
    descontoEmFolha: forma === FORMA_PAGAMENTO.DESCONTO_FOLHA,
    boleto: forma === FORMA_PAGAMENTO.BOLETO,
  };
}

/**
 * Recupera a forma canônica a partir dos flags legados (para vendas antigas
 * onde `formaPagamento` é NULL em runtime, embora o backfill cubra isso).
 * Não distingue Pix/Dinheiro — retorna OUTRO no caso ambíguo.
 */
export function formaFromLegacyFlags(v: {
  descontoEmFolha?: boolean | null;
  boleto?: boolean | null;
  parcelas?: number | null;
}): FormaPagamento {
  if (v.descontoEmFolha) return FORMA_PAGAMENTO.DESCONTO_FOLHA;
  if (v.boleto) return FORMA_PAGAMENTO.BOLETO;
  if ((v.parcelas ?? 1) > 1) return FORMA_PAGAMENTO.CARTAO_CREDITO;
  return FORMA_PAGAMENTO.OUTRO;
}
