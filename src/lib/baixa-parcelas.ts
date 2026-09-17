/**
 * Regra de baixa de parcela pelo Asaas. Pura: recebe a cobrança como está AGORA no Asaas e as
 * parcelas da venda, e diz o que fazer. O webhook e a sincronização diária usam a mesma regra
 * sobre o status atual — evento fora de ordem ou reenviado não deixa estado errado.
 * Ver docs/superpowers/specs/2026-09-16-baixa-de-parcelas.md.
 */

export type OrigemPagamento = "asaas" | "prudent" | "manual";

/** Campos da cobrança do Asaas (`GET /v3/payments/{id}`) usados na decisão. */
export type PagamentoAsaas = {
  id: string;
  status: string;
  externalReference?: string | null;
  /** Id do parcelamento; ausente em cobrança avulsa. */
  installment?: string | null;
  installmentNumber?: number | null;
  paymentDate?: string | null;
  clientPaymentDate?: string | null;
  confirmedDate?: string | null;
  deleted?: boolean | null;
};

export type ParcelaParaBaixa = {
  id: number;
  vendaId: number;
  numeroParcela: number;
  paga: boolean;
  origemPagamento: string | null;
  asaasPaymentId: string | null;
  vendaStatus: string;
};

export type DecisaoBaixaAsaas =
  | { acao: "baixar"; parcelaId: number; asaasPaymentId: string; dataPagamento: string | null }
  | { acao: "desfazer"; parcelaId: number }
  | { acao: "ignorar"; motivo: string };

const STATUS_PAGO = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH", "DUNNING_RECEIVED"]);

/**
 * `paga` é a visão da BFX: parcela antecipada na Prudent está quitada porque a Prudent pagou. Para
 * o CLIENTE a folha continua descontando essa parcela até o vencimento. Tudo que fala com o cliente
 * ou mede o comprometimento da renda dele (agente de WhatsApp, limite de crédito) usa esta regra.
 */
export function situacaoParaCliente(
  parcela: { paga: boolean; origemPagamento: string | null; dataVencimento: Date },
  hoje: Date,
): "paga" | "a_vencer" | "vencida" {
  if (parcela.origemPagamento === "prudent") return parcela.dataVencimento < hoje ? "paga" : "a_vencer";
  if (parcela.paga) return "paga";
  return parcela.dataVencimento < hoje ? "vencida" : "a_vencer";
}

/** Filtro Prisma de parcela que ainda compromete a renda do cliente (aberta ou quitada pela Prudent). */
export const FILTRO_PARCELA_COMPROMETIDA = { OR: [{ paga: false }, { origemPagamento: "prudent" }] };

export function decidirBaixaAsaas(pagamento: PagamentoAsaas, parcelas: ParcelaParaBaixa[]): DecisaoBaixaAsaas {
  const vendaId = Number(pagamento.externalReference);
  if (!Number.isInteger(vendaId) || vendaId <= 0) return { acao: "ignorar", motivo: "referencia_invalida" };

  // Parcelamento precisa do número; cobrança avulsa é a parcela 1.
  const numero = pagamento.installment ? pagamento.installmentNumber : (pagamento.installmentNumber ?? 1);
  if (numero == null) return { acao: "ignorar", motivo: "sem_numero_parcela" };

  const candidatas = parcelas.filter((p) => p.vendaId === vendaId && p.numeroParcela === numero);
  if (candidatas.length === 0) return { acao: "ignorar", motivo: "sem_parcela" };
  if (candidatas.length > 1) return { acao: "ignorar", motivo: "parcela_ambigua" };
  const parcela = candidatas[0];
  if (parcela.vendaStatus !== "ativa") return { acao: "ignorar", motivo: "venda_inativa" };

  const baixadaPorOutraOrigem = parcela.paga && parcela.origemPagamento !== "asaas";
  const baixadaPorEstaCobranca =
    parcela.paga && parcela.origemPagamento === "asaas" && parcela.asaasPaymentId === pagamento.id;
  const pago = STATUS_PAGO.has(pagamento.status) && !pagamento.deleted;

  if (baixadaPorOutraOrigem) return { acao: "ignorar", motivo: "baixada_por_outra_origem" };

  if (pago) {
    if (baixadaPorEstaCobranca) return { acao: "ignorar", motivo: "sem_mudanca" };
    if (parcela.paga) return { acao: "ignorar", motivo: "baixada_por_outra_cobranca" };
    return {
      acao: "baixar",
      parcelaId: parcela.id,
      asaasPaymentId: pagamento.id,
      dataPagamento: pagamento.paymentDate ?? pagamento.clientPaymentDate ?? pagamento.confirmedDate ?? null,
    };
  }

  if (baixadaPorEstaCobranca) return { acao: "desfazer", parcelaId: parcela.id };
  if (parcela.paga) return { acao: "ignorar", motivo: "baixada_por_outra_cobranca" };
  return { acao: "ignorar", motivo: "sem_mudanca" };
}
