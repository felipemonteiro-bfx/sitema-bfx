/**
 * Regras de exibição da agenda `/obrigacoes` (2026-09-30, Fase 4) — puras. Em que aba o boleto
 * aparece, o rótulo da situação, quando o valor/vencimento do documento diverge do esperado e o
 * que entra na projeção de caixa (`projetarCaixa`).
 */
import { DIRECIONAMENTO, STATUS_BOLETO, divergencia, saldoDoBoleto } from "@/lib/boleto-prudent";
import type { projetarCaixa } from "@/lib/projecao-caixa";

export type PagamentoAgenda = { valorPrincipal: number; estornadoEm: Date | null; dataPagamento: Date };

export type BoletoAgenda = {
  id: number;
  status: string;
  direcionamento: string;
  vencimento: Date;
  valorEsperado: number;
  valorDocumento: number | null;
  vencimentoDocumento: Date | null;
  divergenciaJustificativa: string | null;
  pagamentos: PagamentoAgenda[];
};

export type AbaBoleto = "a_pagar" | "sem_boleto" | "pagos" | "historico";
export type TomSituacao = "warning" | "neutro" | "error" | "info" | "success" | "muted";

const diaUtc = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
const ddmm = (d: Date) => d.toISOString().slice(5, 10).split("-").reverse().join("/");

const morto = (status: string) => status === STATUS_BOLETO.substituido || status === STATUS_BOLETO.cancelado;

/**
 * Substituído, cancelado e boleto que a empresa paga só aparecem em "Todos" (aba `historico`):
 * as outras abas são as ações da BFX.
 */
export function abaDoBoleto(b: Pick<BoletoAgenda, "status" | "direcionamento">): AbaBoleto {
  if (b.direcionamento !== DIRECIONAMENTO.bfx) return "historico";
  if (b.status === STATUS_BOLETO.aguardandoDocumento) return "sem_boleto";
  if (b.status === STATUS_BOLETO.aPagar || b.status === STATUS_BOLETO.pagoParcial) return "a_pagar";
  if (b.status === STATUS_BOLETO.pago) return "pagos";
  return "historico";
}

/** O vencimento que vale para pagar: o do documento quando já foi lido; senão o contratual. */
export function vencimentoEfetivo(b: Pick<BoletoAgenda, "vencimento" | "vencimentoDocumento">): Date {
  return b.vencimentoDocumento ?? b.vencimento;
}

export function situacaoDoBoleto(b: BoletoAgenda, hoje: Date): { rotulo: string; tom: TomSituacao } {
  if (b.status === STATUS_BOLETO.substituido) return { rotulo: "substituído", tom: "muted" };
  if (b.status === STATUS_BOLETO.cancelado) return { rotulo: "cancelado", tom: "muted" };
  if (b.direcionamento !== DIRECIONAMENTO.bfx) return { rotulo: "a empresa paga", tom: "muted" };
  if (b.status === STATUS_BOLETO.aguardandoDocumento) return { rotulo: "sem boleto", tom: "warning" };
  if (b.status === STATUS_BOLETO.pago) {
    const vivos = b.pagamentos.filter((p) => p.estornadoEm == null);
    const ultimo = vivos.reduce<Date | null>(
      (max, p) => (max == null || p.dataPagamento.getTime() > max.getTime() ? p.dataPagamento : max),
      null
    );
    return { rotulo: ultimo ? `pago em ${ddmm(ultimo)}` : "pago", tom: "success" };
  }
  if (b.status === STATUS_BOLETO.pagoParcial) return { rotulo: "pago em parte", tom: "info" };
  if (diaUtc(vencimentoEfetivo(b)) < diaUtc(hoje)) return { rotulo: "vencido", tom: "error" };
  return { rotulo: b.divergenciaJustificativa ? "a pagar · diferença justificada" : "a pagar", tom: "neutro" };
}

export function documentoDiverge(b: BoletoAgenda): boolean {
  const div = divergencia(b, { valor: b.valorDocumento, vencimento: b.vencimentoDocumento });
  return div.valor || div.vencimento;
}

/** O dia do Pix (regra da empresa) no mês do vencimento, como data pura. */
export function dataPixDoMes(vencimento: Date, diaPix: number): Date {
  return new Date(Date.UTC(vencimento.getUTCFullYear(), vencimento.getUTCMonth(), diaPix));
}

export const DIAS_PROJECAO = 60;

/**
 * Entrada de `projetarCaixa`: só boletos vivos que a BFX paga (saldo > 0, no vencimento efetivo)
 * e o depósito previsto de cada lote em andamento (`valorAprovado ?? valorLiquidoSolicitado`).
 * O Pix esperado dos fechamentos entra na Fase 6.
 */
export function entradaDaProjecao(entrada: {
  hoje: Date;
  boletos: (BoletoAgenda & { dataPix: Date | null })[];
  lotesEmAndamento: {
    valorAprovado: number | null;
    valorLiquidoSolicitado: number | null;
    dataDepositoPrevista: Date | null;
  }[];
}): Parameters<typeof projetarCaixa>[0] {
  const boletos = entrada.boletos
    .filter((b) => !morto(b.status) && b.direcionamento === DIRECIONAMENTO.bfx)
    .map((b) => ({ vencimento: vencimentoEfetivo(b), saldo: saldoDoBoleto(b, b.pagamentos), dataPix: b.dataPix }))
    .filter((b) => b.saldo > 0);
  const depositosPrevistos = entrada.lotesEmAndamento.flatMap((l) => {
    const valor = l.valorAprovado ?? l.valorLiquidoSolicitado;
    return l.dataDepositoPrevista && valor != null ? [{ data: l.dataDepositoPrevista, valor }] : [];
  });
  return { hoje: entrada.hoje, dias: DIAS_PROJECAO, boletos, pixEsperados: [], depositosPrevistos };
}
