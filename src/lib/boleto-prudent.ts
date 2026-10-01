/**
 * Regras puras do boleto Prudent (spec §3.4 e §3.5): agrupamento das parcelas de um lote por
 * vencimento, status pelos pagamentos e validação de pagamento novo. Sem banco.
 *
 * Toda conta de dinheiro é feita em centavos inteiros; a tolerância é de 1 centavo.
 */

export const STATUS_BOLETO = {
  aguardandoDocumento: "aguardando_documento",
  aPagar: "a_pagar",
  pagoParcial: "pago_parcial",
  pago: "pago",
  substituido: "substituido",
  cancelado: "cancelado",
} as const;

export const DIRECIONAMENTO = { empresa: "empresa", bfx: "bfx" } as const;

type BoletoValor = { valorDocumento: number | null; valorEsperado: number };
type BoletoComStatus = BoletoValor & { status: string };
type Pagamento = { valorPrincipal: number; estornadoEm: Date | null };

const TOLERANCIA_CENTAVOS = 1;

const centavos = (v: number) => Math.round(v * 100);

/** Chave de data pura (YYYY-MM-DD) pelo dia UTC. */
const chaveDia = (d: Date) => d.toISOString().slice(0, 10);

const formatarReais = (c: number) =>
  `R$ ${(c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Um grupo por dia de vencimento (data pura UTC), em ordem cronológica. */
export function agruparParcelasPorVencimento(
  parcelas: { id: number; dataVencimento: Date; valorParcela: number }[],
): { vencimento: Date; parcelaIds: number[]; valorEsperado: number }[] {
  const grupos = new Map<string, { parcelaIds: number[]; centavos: number }>();
  for (const p of parcelas) {
    const chave = chaveDia(p.dataVencimento);
    const g = grupos.get(chave) ?? { parcelaIds: [], centavos: 0 };
    g.parcelaIds.push(p.id);
    g.centavos += centavos(p.valorParcela);
    grupos.set(chave, g);
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([chave, g]) => ({
      vencimento: new Date(`${chave}T00:00:00.000Z`),
      parcelaIds: g.parcelaIds,
      valorEsperado: g.centavos / 100,
    }));
}

/** O valor a pagar é o do documento quando já foi lido; antes disso, o esperado. */
export function valorDoBoleto(b: BoletoValor): number {
  return b.valorDocumento ?? b.valorEsperado;
}

function centavosPagos(pagamentos: Pagamento[]): number {
  return pagamentos
    .filter((p) => p.estornadoEm == null)
    .reduce((soma, p) => soma + centavos(p.valorPrincipal), 0);
}

/** O que falta pagar. Falta de até 1 centavo conta como quitado, igual a `statusPorPagamentos`. */
export function saldoDoBoleto(b: BoletoValor, pagamentos: Pagamento[]): number {
  const falta = centavos(valorDoBoleto(b)) - centavosPagos(pagamentos);
  return falta > TOLERANCIA_CENTAVOS ? falta / 100 : 0;
}

/**
 * Status depois de um pagamento ou estorno. Substituído, cancelado e aguardando documento não
 * mudam por pagamento; os demais saem da soma do principal não estornado.
 */
export function statusPorPagamentos(b: BoletoComStatus, pagamentos: Pagamento[]): string {
  if (
    b.status === STATUS_BOLETO.substituido ||
    b.status === STATUS_BOLETO.cancelado ||
    b.status === STATUS_BOLETO.aguardandoDocumento
  ) {
    return b.status;
  }
  const pago = centavosPagos(pagamentos);
  if (pago <= 0) return STATUS_BOLETO.aPagar;
  if (pago >= centavos(valorDoBoleto(b)) - TOLERANCIA_CENTAVOS) return STATUS_BOLETO.pago;
  return STATUS_BOLETO.pagoParcial;
}

export function validarNovoPagamento(
  b: BoletoComStatus,
  pagos: Pagamento[],
  novoPrincipal: number,
): { ok: true } | { ok: false; erro: string } {
  if (b.status === STATUS_BOLETO.substituido || b.status === STATUS_BOLETO.cancelado) {
    return { ok: false, erro: "Boleto substituído ou cancelado não recebe pagamento." };
  }
  if (b.status === STATUS_BOLETO.aguardandoDocumento) {
    return { ok: false, erro: "Anexe o boleto antes de registrar o pagamento." };
  }
  if (b.status === STATUS_BOLETO.pago) {
    return { ok: false, erro: "Este boleto já está pago." };
  }
  if (!Number.isFinite(novoPrincipal) || centavos(novoPrincipal) <= 0) {
    return { ok: false, erro: "Informe um valor principal maior que zero." };
  }
  const excesso = centavosPagos(pagos) + centavos(novoPrincipal) - centavos(valorDoBoleto(b));
  if (excesso > TOLERANCIA_CENTAVOS) {
    return { ok: false, erro: `O pagamento passa do valor do boleto em ${formatarReais(excesso)}.` };
  }
  return { ok: true };
}

/** Documento × esperado. Campo que o documento não informa (null) não diverge. */
export function divergencia(
  b: { valorEsperado: number; vencimento: Date },
  doc: { valor: number | null; vencimento: Date | null },
): { valor: boolean; vencimento: boolean } {
  return {
    valor: doc.valor != null && centavos(doc.valor) !== centavos(b.valorEsperado),
    vencimento: doc.vencimento != null && chaveDia(doc.vencimento) !== chaveDia(b.vencimento),
  };
}
