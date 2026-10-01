/**
 * Parcela "com Pix em jogo" (ajuste pós-implementação de 30/09, A2): está numa versão do
 * demonstrativo já ENVIADA ao RH de um fechamento que tem cobrança Pix ativa ou recebimento
 * confirmado. Mesmo com o fechamento reaberto (em preparação), soltar a reserva dessa parcela (edição
 * ou exclusão de venda) ou devolver o boleto dela à empresa faria a empresa pagar duas vezes, ou
 * deixaria dinheiro recebido sem a parcela que ele pagou.
 *
 * A foto da versão (`FechamentoLinha`) é casada por venda × número da parcela: a edição de venda
 * recria as parcelas e o `parcelaId` da foto vira nulo.
 */
import type { prisma } from "@/lib/db";
import { identificadorParcela, rotuloCompetencia } from "@/lib/fechamento";

type Tx = Pick<typeof prisma, "fechamentoLinha">;

export type ParcelaComPixEmJogo = { vendaId: number; numeroParcela: number; fechamentoId: number; competencia: string };

/** Filtro do fechamento com dinheiro em jogo: Pix ativo ou recebimento confirmado. */
export const WHERE_FECHAMENTO_COM_PIX_EM_JOGO = {
  OR: [{ cobrancas: { some: { status: "ativa" } } }, { recebimentos: { some: { status: "confirmado" } } }],
};

export async function parcelasComPixEmJogo(
  tx: Tx,
  chaves: { vendaId: number; numeroParcela: number }[],
  fechamentoIds?: number[]
): Promise<ParcelaComPixEmJogo[]> {
  if (chaves.length === 0) return [];
  const linhas = await tx.fechamentoLinha.findMany({
    where: {
      OR: chaves.map((c) => ({ vendaId: c.vendaId, numeroParcela: c.numeroParcela })),
      versao: {
        enviadaEm: { not: null },
        ...(fechamentoIds ? { fechamentoId: { in: fechamentoIds } } : {}),
        fechamento: WHERE_FECHAMENTO_COM_PIX_EM_JOGO,
      },
    },
    select: { vendaId: true, numeroParcela: true, versao: { select: { fechamento: { select: { id: true, competencia: true } } } } },
  });
  return linhas.map((l) => ({
    vendaId: l.vendaId,
    numeroParcela: l.numeroParcela,
    fechamentoId: l.versao.fechamento.id,
    competencia: l.versao.fechamento.competencia,
  }));
}

/** Chave do conjunto que `avaliarEdicaoDeParcelas`/`avaliarExclusaoDeVenda` recebem. */
export function chavePixEmJogo(fechamentoId: number, numeroParcela: number): string {
  return `${fechamentoId}:${numeroParcela}`;
}

export function mensagemPixEmJogo(vendaId: number, numeroParcela: number, totalParcelas: number, competencia: string): string {
  return (
    `Parcela ${identificadorParcela(vendaId, numeroParcela, totalParcelas)} está no demonstrativo de ` +
    `${rotuloCompetencia(competencia)} já enviado ao RH, e o fechamento tem Pix ativo ou recebimento confirmado. ` +
    "Resolva o recebimento no fechamento antes de mudar ou excluir esta parcela."
  );
}
