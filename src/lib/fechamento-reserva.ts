/**
 * Reserva do fechamento × edição e exclusão de venda (2026-09-30, Fase 5; spec §3.2). Puro: recebe
 * as parcelas gravadas (com o fechamento de cada uma) e as que a edição vai gravar, e diz se a
 * edição pode seguir, quais reservas sobrevivem e quais fechamentos ficam desatualizados.
 *
 * - Parcela com boleto Prudent: valor e vencimento não mudam (a Prudent já emitiu o boleto).
 * - Fechamento conferido ou posterior: mudar valor/vencimento da parcela reservada, apagá-la ou
 *   mudar a quantidade de parcelas da venda é recusado. Sem mudança, a reserva é preservada.
 * - Fechamento em preparação: a parcela que mudou (ou a venda que mudou de quantidade) perde a
 *   reserva e o fechamento é marcado desatualizado; sem mudança, a reserva é preservada.
 */
import {
  ROTULO_STATUS_FECHAMENTO,
  STATUS_FECHAMENTO,
  identificadorParcela,
  rotuloCompetencia,
} from "@/lib/fechamento";

export type FechamentoDaParcela = { id: number; status: string; competencia: string };

export type ParcelaGravada = {
  numeroParcela: number;
  dataVencimento: Date;
  valorParcela: number;
  boletoPrudentId?: number | null;
  fechamentoId?: number | null;
  fechamento?: FechamentoDaParcela | null;
};

export type ParcelaNova = { numeroParcela: number; dataVencimento: Date; valorParcela: number };

export type AvaliacaoEdicao =
  | { ok: false; erro: string }
  | {
      ok: true;
      /** Número da parcela → fechamentoId que a linha recriada mantém. */
      reservaPreservada: Map<number, number>;
      /** Fechamentos em preparação que perderam parcela (marcar `desatualizado`). */
      fechamentosDesatualizados: number[];
    };

const dia = (d: Date) => d.toISOString().slice(0, 10);
const centavos = (v: number) => Math.round(v * 100);

function mudou(antes: ParcelaGravada, depois: ParcelaNova | undefined): boolean {
  if (!depois) return true;
  if (Number.isNaN(depois.dataVencimento.getTime())) return true;
  return dia(antes.dataVencimento) !== dia(depois.dataVencimento) || centavos(antes.valorParcela) !== centavos(depois.valorParcela);
}

function rotuloStatus(status: string): string {
  return ROTULO_STATUS_FECHAMENTO[status] ?? status;
}

/** Mensagem da recusa por parcela reservada em fechamento já conferido (ou posterior). */
export function mensagemParcelaTravadaNoFechamento(
  vendaId: number,
  p: { numeroParcela: number },
  totalParcelas: number,
  f: FechamentoDaParcela
): string {
  return (
    `Parcela ${identificadorParcela(vendaId, p.numeroParcela, totalParcelas)} está no fechamento de ` +
    `${rotuloCompetencia(f.competencia)} (${rotuloStatus(f.status)}). Reabra o fechamento e retire-a antes.`
  );
}

/**
 * `novas` = as linhas que a edição vai gravar no lugar das atuais; `null` = a edição não mexe nas
 * parcelas (nada a avaliar, tudo preservado).
 */
export function avaliarEdicaoDeParcelas(vendaId: number, gravadas: ParcelaGravada[], novas: ParcelaNova[] | null): AvaliacaoEdicao {
  const reservaPreservada = new Map<number, number>();
  if (novas === null) {
    for (const p of gravadas) if (p.fechamentoId != null) reservaPreservada.set(p.numeroParcela, p.fechamentoId);
    return { ok: true, reservaPreservada, fechamentosDesatualizados: [] };
  }

  const porNumero = new Map(novas.map((p) => [p.numeroParcela, p]));
  const quantidadeMudou = novas.length !== gravadas.length;
  const desatualizados = new Set<number>();

  for (const p of gravadas) {
    const mudouEsta = mudou(p, porNumero.get(p.numeroParcela));
    if (p.boletoPrudentId != null && mudouEsta) {
      return { ok: false, erro: `A Prudent já emitiu boleto da parcela ${p.numeroParcela}: valor e vencimento não podem mudar.` };
    }
    if (p.fechamentoId == null) continue;
    const f = p.fechamento;
    if (!f) continue; // FK SetNull: sem fechamento, não há reserva a guardar
    if (f.status !== STATUS_FECHAMENTO.emPreparacao) {
      if (mudouEsta || quantidadeMudou) {
        return { ok: false, erro: mensagemParcelaTravadaNoFechamento(vendaId, p, gravadas.length, f) };
      }
      reservaPreservada.set(p.numeroParcela, p.fechamentoId);
    } else if (mudouEsta || quantidadeMudou) {
      desatualizados.add(f.id);
    } else {
      reservaPreservada.set(p.numeroParcela, p.fechamentoId);
    }
  }
  return { ok: true, reservaPreservada, fechamentosDesatualizados: [...desatualizados] };
}

/**
 * Exclusão de venda: recusada se alguma parcela tem boleto Prudent ou está em fechamento conferido
 * ou posterior. Fechamentos em preparação que perdem parcela ficam desatualizados.
 */
export function avaliarExclusaoDeVenda(
  vendaId: number,
  gravadas: ParcelaGravada[]
): { ok: false; erro: string } | { ok: true; fechamentosDesatualizados: number[] } {
  const desatualizados = new Set<number>();
  for (const p of gravadas) {
    if (p.boletoPrudentId != null) {
      return { ok: false, erro: `A Prudent já emitiu boleto da parcela ${p.numeroParcela}; a venda não pode ser excluída.` };
    }
    const f = p.fechamento;
    if (p.fechamentoId == null || !f) continue;
    if (f.status !== STATUS_FECHAMENTO.emPreparacao) {
      return { ok: false, erro: mensagemParcelaTravadaNoFechamento(vendaId, p, gravadas.length, f) };
    }
    desatualizados.add(f.id);
  }
  return { ok: true, fechamentosDesatualizados: [...desatualizados] };
}
