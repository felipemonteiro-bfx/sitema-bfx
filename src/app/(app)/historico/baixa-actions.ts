"use server";

import { prisma } from "@/lib/db";
import { requireAdminOrThrow } from "@/lib/guards";
import { createAuditLog } from "@/lib/audit";
import { revalidarVenda } from "@/lib/revalidacao";
import { hojeDataPura } from "@/lib/data-pura";

type Resultado = { success: boolean; error?: string };

/** "YYYY-MM-DD" de calendário válido, ou null. */
function dataPuraValida(valor: string): string | null {
  const partes = valor.split("-");
  if (partes.length !== 3 || partes[0].length !== 4 || partes[1].length !== 2 || partes[2].length !== 2) return null;
  const data = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor ? valor : null;
}

/**
 * Baixa manual de uma parcela (repasse de folha não antecipada, PIX, cartão, boleto pago fora do
 * Asaas). Só admin. Só grava se a parcela ainda está aberta. Ver
 * docs/superpowers/specs/2026-09-16-baixa-de-parcelas.md.
 */
export async function darBaixaParcela(formData: FormData): Promise<Resultado> {
  const sessao = await requireAdminOrThrow();
  const parcelaId = Number(formData.get("parcelaId"));
  if (!Number.isInteger(parcelaId) || parcelaId <= 0) return { success: false, error: "Parcela inválida." };

  const hoje = hojeDataPura();
  const informada = String(formData.get("dataPagamento") || "").trim();
  const data = informada ? dataPuraValida(informada) : hoje;
  if (!data) return { success: false, error: "Data de pagamento inválida." };
  // Comparação de "YYYY-MM-DD" como texto já é cronológica.
  if (data > hoje) return { success: false, error: "Data de pagamento não pode ser no futuro." };

  // Parcela num lote enviado à Prudent tem dono: a baixa dela é a conclusão do lote, no histórico.
  // Sem esta recusa ela terminaria "antecipada" com origem "manual", mentindo sobre quem pagou.
  const { count } = await prisma.parcelaVencimento.updateMany({
    where: { id: parcelaId, paga: false, antecipacaoLoteId: null },
    data: {
      paga: true,
      dataPagamento: new Date(`${data}T00:00:00.000Z`),
      origemPagamento: "manual",
      asaasPaymentId: null,
      baixaPor: sessao.nomeExibicao || sessao.username,
    },
  });
  if (count === 0) return { success: false, error: "Parcela não encontrada ou já paga." };

  await createAuditLog("parcela:baixa", { parcelaId, origem: "manual", dataPagamento: data });
  revalidarVenda();
  return { success: true };
}

/**
 * Desfaz a baixa. Baixa automática (Asaas ou Prudent) só com `confirmar=1`: a do Asaas volta na
 * próxima sincronização se a cobrança continuar paga, e a da Prudent contradiz a antecipação.
 */
export async function desfazerBaixaParcela(formData: FormData): Promise<Resultado> {
  await requireAdminOrThrow();
  const parcelaId = Number(formData.get("parcelaId"));
  if (!Number.isInteger(parcelaId) || parcelaId <= 0) return { success: false, error: "Parcela inválida." };

  const parcela = await prisma.parcelaVencimento.findUnique({
    where: { id: parcelaId },
    select: { id: true, vendaId: true, paga: true, origemPagamento: true },
  });
  if (!parcela || !parcela.paga) return { success: false, error: "Parcela não encontrada ou não está paga." };

  const automatica = parcela.origemPagamento === "asaas" || parcela.origemPagamento === "prudent";
  if (automatica && formData.get("confirmar") !== "1") {
    return {
      success: false,
      error: `A baixa veio ${parcela.origemPagamento === "asaas" ? "do Asaas" : "da antecipação na Prudent"}. Confirme para desfazer.`,
    };
  }

  // A origem lida entra no where: se a baixa mudou de origem entre a leitura e aqui (ex.: o
  // webhook do Asaas), nada é desfeito sem a confirmação correspondente.
  const { count } = await prisma.parcelaVencimento.updateMany({
    where: { id: parcelaId, paga: true, origemPagamento: parcela.origemPagamento },
    data: { paga: false, dataPagamento: null, origemPagamento: null, asaasPaymentId: null, baixaPor: null },
  });
  if (count === 0) return { success: false, error: "A baixa mudou enquanto você confirmava. Recarregue e tente de novo." };

  await createAuditLog("parcela:baixa-desfeita", {
    parcelaId,
    vendaId: parcela.vendaId,
    origemAnterior: parcela.origemPagamento,
  });
  revalidarVenda();
  return { success: true };
}
