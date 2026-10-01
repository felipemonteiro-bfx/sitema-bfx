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

const SEM_SELECAO = "Nenhum título selecionado.";

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

  // Tudo ou nada: se uma parcela já foi à Prudent, nenhuma é recusada.
  const parcelas = await prisma.parcelaVencimento.findMany({
    where: { id: { in: lista } },
    select: { id: true, confirmacaoRh: true, antecipada: true, antecipacaoLoteId: true },
  });
  for (const p of parcelas) {
    const pode = podeRecusar(p);
    if (!pode.ok) return pode;
  }

  // O where repete a trava: um lote aberto entre a leitura e a escrita não leva parcela recusada.
  const r = await prisma.parcelaVencimento.updateMany({
    where: { id: { in: lista }, antecipada: false, antecipacaoLoteId: null },
    data: {
      confirmacaoRh: CONFIRMACAO.recusada,
      confirmacaoOrigem: ORIGEM_CONFIRMACAO.rh,
      confirmacaoEm: new Date(),
      confirmacaoPor: sessao.nomeExibicao ?? sessao.username ?? null,
      confirmacaoMotivo: m.valor,
    },
  });

  await createAuditLog("prudent:confirmacao-rh", { acao: "recusar", ids: lista, motivo: m.valor, alteradas: r.count });
  revalidatePath("/prudent");
  return { ok: true, recusadas: r.count };
}
