/**
 * Gravações do boleto Prudent (spec 2026-09-30 §3.4). As regras puras estão em
 * `@/lib/boleto-prudent`; aqui só o que toca o banco.
 */
import type { prisma } from "@/lib/db";
import { DIRECIONAMENTO, STATUS_BOLETO, agruparParcelasPorVencimento } from "@/lib/boleto-prudent";
import { inicioDoMes, regraVigente } from "@/lib/regra-empresa";
import { ROTULO_STATUS_FECHAMENTO, STATUS_FECHAMENTO, rotuloCompetencia } from "@/lib/fechamento";
import { parcelasComPixEmJogo } from "@/lib/fechamento-pix-em-jogo";
import { regrasDaEmpresa } from "@/lib/regra-empresa-db";

export type TxBoleto = Pick<typeof prisma, "boletoPrudent" | "parcelaVencimento">;

/**
 * Cria os boletos esperados de um lote que acabou de ser concluído: um por dia de vencimento das
 * parcelas, aguardando o documento da Prudent. O direcionamento sai da regra vigente da empresa
 * no dia 1º do mês do vencimento — a mesma data que o fechamento da competência usa
 * (`cobrancaViaBfx` → "bfx"); lote sem empresa fica "empresa".
 *
 * Roda dentro da transação de `concluirLote`. A ligação exige `boletoPrudentId: null`: parcela
 * que já tem boleto aborta a conclusão em vez de trocar de boleto em silêncio.
 */
export async function criarBoletosDoLote(
  tx: TxBoleto,
  lote: { id: number; empresaParceiraId: number | null },
  parcelas: { id: number; dataVencimento: Date; valorParcela: number }[]
): Promise<number[]> {
  const grupos = agruparParcelasPorVencimento(parcelas);
  if (grupos.length === 0) return [];
  const regras = lote.empresaParceiraId ? await regrasDaEmpresa(lote.empresaParceiraId) : [];

  const ids: number[] = [];
  for (const g of grupos) {
    const viaBfx = lote.empresaParceiraId != null && regraVigente(regras, inicioDoMes(g.vencimento)).cobrancaViaBfx;
    const boleto = await tx.boletoPrudent.create({
      data: {
        loteId: lote.id,
        empresaParceiraId: lote.empresaParceiraId,
        vencimento: g.vencimento,
        valorEsperado: g.valorEsperado,
        direcionamento: viaBfx ? DIRECIONAMENTO.bfx : DIRECIONAMENTO.empresa,
        status: STATUS_BOLETO.aguardandoDocumento,
      },
      select: { id: true },
    });
    const { count } = await tx.parcelaVencimento.updateMany({
      where: { id: { in: g.parcelaIds }, boletoPrudentId: null },
      data: { boletoPrudentId: boleto.id },
    });
    if (count !== g.parcelaIds.length) {
      throw new Error("Parte das parcelas deste lote já tem boleto da Prudent. Recarregue e confira o lote.");
    }
    ids.push(boleto.id);
  }
  return ids;
}

/** Recusa do cancelamento com mensagem para o usuário (lançada dentro da transação para desfazê-la). */
export class ErroCancelamentoBoleto extends Error {}

const MOTIVO_MINIMO = 5;

export type TxCancelarBoleto = Pick<typeof prisma, "boletoPrudent" | "parcelaVencimento" | "fechamento" | "fechamentoLinha">;

/** Motivo do cancelamento (vai para o audit): 5 caracteres ou mais. */
export function validarMotivoCancelamento(motivo: unknown): { ok: true; valor: string } | { ok: false; erro: string } {
  const texto = typeof motivo === "string" ? motivo.trim() : "";
  if (texto.length < MOTIVO_MINIMO) {
    return { ok: false, erro: `Escreva o motivo do cancelamento (${MOTIVO_MINIMO} caracteres ou mais).` };
  }
  return { ok: true, valor: texto.slice(0, 500) };
}

/**
 * Cancela um boleto vivo (ajuste de 30/09): a Prudent cancelou o boleto, ou o lote foi concluído por
 * engano. Só sem pagamento vivo e sem parcela em fechamento conferido ou posterior. Rodar dentro de
 * uma transação: o boleto é travado primeiro (status e `atualizadoEm` lidos no where — o conferir
 * trava os mesmos boletos, então um espera o outro), depois os fechamentos são conferidos, os em
 * preparação ficam desatualizados e as parcelas ficam sem boleto (a antecipação pode então ser
 * desfeita pela baixa).
 */
export async function cancelarBoletoPrudent(
  tx: TxCancelarBoleto,
  boletoId: number
): Promise<{ parcelas: number; fechamentosDesatualizados: number[] }> {
  const b = await tx.boletoPrudent.findUnique({
    where: { id: boletoId },
    select: { id: true, status: true, atualizadoEm: true, pagamentos: { select: { estornadoEm: true } } },
  });
  if (!b) throw new ErroCancelamentoBoleto("Boleto não encontrado.");
  if (b.status === STATUS_BOLETO.substituido || b.status === STATUS_BOLETO.cancelado) {
    throw new ErroCancelamentoBoleto("Este boleto já foi substituído ou cancelado.");
  }
  if (b.pagamentos.some((p) => p.estornadoEm == null)) {
    throw new ErroCancelamentoBoleto("Boleto com pagamento registrado não pode ser cancelado. Estorne o pagamento antes.");
  }

  const { count } = await tx.boletoPrudent.updateMany({
    where: { id: b.id, status: b.status, atualizadoEm: b.atualizadoEm },
    data: { status: STATUS_BOLETO.cancelado, atualizadoEm: new Date() },
  });
  if (count === 0) throw new ErroCancelamentoBoleto("O boleto mudou enquanto você cancelava. Recarregue.");

  const travada = await tx.parcelaVencimento.findFirst({
    where: { boletoPrudentId: b.id, fechamento: { status: { not: STATUS_FECHAMENTO.emPreparacao } } },
    select: { vendaId: true, numeroParcela: true, fechamento: { select: { status: true, competencia: true } } },
  });
  if (travada?.fechamento) {
    const status = ROTULO_STATUS_FECHAMENTO[travada.fechamento.status] ?? travada.fechamento.status;
    throw new ErroCancelamentoBoleto(
      `Parcela V${travada.vendaId}-${travada.numeroParcela} deste boleto está no fechamento de ` +
        `${rotuloCompetencia(travada.fechamento.competencia)} (${status}). Reabra o fechamento antes de cancelar o boleto.`
    );
  }

  // Reaberto depois de enviado, com Pix ativo ou recebimento (mesma trava do "devolver à empresa"):
  // sem boleto a parcela sai do demonstrativo que o RH já recebeu (ou pagou).
  const doBoleto = await tx.parcelaVencimento.findMany({
    where: { boletoPrudentId: b.id },
    select: { vendaId: true, numeroParcela: true },
  });
  const [presa] = await parcelasComPixEmJogo(tx, doBoleto);
  if (presa) {
    throw new ErroCancelamentoBoleto(
      `Parcela V${presa.vendaId}-${presa.numeroParcela} deste boleto está no demonstrativo de ` +
        `${rotuloCompetencia(presa.competencia)} já enviado ao RH, e o fechamento tem Pix ativo ou recebimento ` +
        "confirmado. Resolva o recebimento no fechamento antes de cancelar o boleto."
    );
  }

  // Reservada em preparação: sem boleto, a antecipada deixa de ser elegível — o fechamento pede
  // "Atualizar parcelas" (e a conferência em paralelo, que exige não desatualizado, é derrubada).
  const reservadas = await tx.parcelaVencimento.findMany({
    where: { boletoPrudentId: b.id, fechamentoId: { not: null } },
    select: { fechamentoId: true },
  });
  const fechamentos = [...new Set(reservadas.map((p) => p.fechamentoId).filter((id): id is number => id != null))];
  if (fechamentos.length > 0) {
    const marcados = await tx.fechamento.updateMany({
      where: { id: { in: fechamentos }, status: STATUS_FECHAMENTO.emPreparacao },
      data: { desatualizado: true },
    });
    if (marcados.count !== fechamentos.length) {
      throw new ErroCancelamentoBoleto("O fechamento destas parcelas mudou enquanto você cancelava. Recarregue.");
    }
  }

  const soltas = await tx.parcelaVencimento.updateMany({
    where: { boletoPrudentId: b.id },
    data: { boletoPrudentId: null },
  });
  return { parcelas: soltas.count, fechamentosDesatualizados: fechamentos };
}
