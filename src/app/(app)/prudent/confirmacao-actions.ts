"use server";

// Confirmação do RH por parcela (2026-09-30, Fase 3). A BFX registra à mão a resposta do RH ao
// consolidado semanal; só parcela confirmada entra na fila da Prudent.
// Guarda própria em cada action: o Action ID vive no bundle e é invocável sem passar pelo layout.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdminOrThrow } from "@/lib/guards";
import { createAuditLog } from "@/lib/audit";
import { idsValidos } from "@/lib/ids-validos";
import { CONFIRMACAO, ORIGEM_CONFIRMACAO, podeRecusar, validarMotivo } from "@/lib/confirmacao-rh";
import { ROTULO_STATUS_FECHAMENTO, STATUS_FECHAMENTO, rotuloCompetencia } from "@/lib/fechamento";

const SEM_SELECAO = "Nenhum título selecionado.";
const ERRO_NA_PRUDENT = "A parcela já está na Prudent; cancele o lote antes.";

const ERRO_FECHAMENTO_MUDOU = "O fechamento desta parcela mudou enquanto você recusava. Recarregue.";

/** Desfaz a transação da recusa quando parte das parcelas foi para um lote no meio do caminho. */
class RecusaParcial extends Error {}
/** Desfaz a transação quando o fechamento em preparação foi conferido no meio. */
class FechamentoMudou extends Error {}

function ids(entrada: unknown): number[] {
  return Array.isArray(entrada) ? idsValidos(entrada) : [];
}

export async function confirmarParcelasRh(
  entrada: number[]
): Promise<{ ok: true; confirmadas: number } | { ok: false; erro: string }> {
  const sessao = await requireAdminOrThrow();
  const lista = ids(entrada);
  if (lista.length === 0) return { ok: false, erro: SEM_SELECAO };

  // Confirmada não volta por aqui; aguardando ou recusada vira confirmada.
  const r = await prisma.parcelaVencimento.updateMany({
    where: { id: { in: lista }, OR: [{ confirmacaoRh: null }, { confirmacaoRh: CONFIRMACAO.recusada }] },
    data: {
      confirmacaoRh: CONFIRMACAO.confirmada,
      confirmacaoOrigem: ORIGEM_CONFIRMACAO.rh,
      confirmacaoEm: new Date(),
      confirmacaoPor: sessao.nomeExibicao ?? sessao.username ?? null,
      confirmacaoMotivo: null,
    },
  });

  await createAuditLog("prudent:confirmacao-rh", { acao: "confirmar", ids: lista, alteradas: r.count });
  revalidatePath("/prudent");
  return { ok: true, confirmadas: r.count };
}

export async function recusarParcelasRh(
  entrada: number[],
  motivo: string
): Promise<{ ok: true; recusadas: number } | { ok: false; erro: string }> {
  const sessao = await requireAdminOrThrow();
  const lista = ids(entrada);
  if (lista.length === 0) return { ok: false, erro: SEM_SELECAO };
  const m = validarMotivo(motivo);
  if (!m.ok) return m;

  // Tudo ou nada: se uma parcela já foi à Prudent, nenhuma é recusada. Numa transação, porque um
  // lote aberto entre a leitura e a escrita faria a recusa sair pela metade.
  //
  // Fechamento (30/09): parcela em demonstrativo conferido ou posterior não é recusada (reabrir e
  // retirar antes); em preparação, a recusa solta a reserva e o fechamento fica desatualizado —
  // marcado antes, com o status no where (uma conferência em paralelo derruba a recusa).
  const r = await prisma.$transaction(async (tx) => {
    const parcelas = await tx.parcelaVencimento.findMany({
      where: { id: { in: lista } },
      select: {
        id: true,
        vendaId: true,
        numeroParcela: true,
        confirmacaoRh: true,
        antecipada: true,
        antecipacaoLoteId: true,
        fechamentoId: true,
        fechamento: { select: { id: true, status: true, competencia: true } },
      },
    });
    for (const p of parcelas) {
      const pode = podeRecusar(p);
      if (!pode.ok) return pode;
      if (p.fechamento && p.fechamento.status !== STATUS_FECHAMENTO.emPreparacao) {
        const status = ROTULO_STATUS_FECHAMENTO[p.fechamento.status] ?? p.fechamento.status;
        return {
          ok: false as const,
          erro:
            `A parcela V${p.vendaId}-${p.numeroParcela} está no fechamento de ${rotuloCompetencia(p.fechamento.competencia)} ` +
            `(${status}). Reabra o fechamento e retire-a antes de recusar.`,
        };
      }
    }
    const emPreparacao = [...new Set(parcelas.flatMap((p) => (p.fechamento ? [p.fechamento.id] : [])))];
    if (emPreparacao.length > 0) {
      const marcados = await tx.fechamento.updateMany({
        where: { id: { in: emPreparacao }, status: STATUS_FECHAMENTO.emPreparacao },
        data: { desatualizado: true },
      });
      if (marcados.count !== emPreparacao.length) throw new FechamentoMudou();
    }
    // O where repete as travas; se o count não fechar, alguma foi para um lote (ou para outro
    // fechamento) no meio do caminho.
    const { count } = await tx.parcelaVencimento.updateMany({
      where: {
        id: { in: lista },
        antecipada: false,
        antecipacaoLoteId: null,
        ...(emPreparacao.length > 0
          ? { OR: [{ fechamentoId: null }, { fechamentoId: { in: emPreparacao } }] }
          : { fechamentoId: null }),
      },
      data: {
        confirmacaoRh: CONFIRMACAO.recusada,
        confirmacaoOrigem: ORIGEM_CONFIRMACAO.rh,
        confirmacaoEm: new Date(),
        confirmacaoPor: sessao.nomeExibicao ?? sessao.username ?? null,
        confirmacaoMotivo: m.valor,
        ...(emPreparacao.length > 0 ? { fechamentoId: null } : {}),
      },
    });
    if (count !== parcelas.length) throw new RecusaParcial();
    return { ok: true as const, count };
  }).catch((e) => {
    if (e instanceof RecusaParcial) return { ok: false as const, erro: ERRO_NA_PRUDENT };
    if (e instanceof FechamentoMudou) return { ok: false as const, erro: ERRO_FECHAMENTO_MUDOU };
    throw e;
  });
  if (!r.ok) return r;

  await createAuditLog("prudent:confirmacao-rh", { acao: "recusar", ids: lista, motivo: m.valor, alteradas: r.count });
  revalidatePath("/prudent");
  return { ok: true, recusadas: r.count };
}
