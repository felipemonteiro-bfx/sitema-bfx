"use server";

import { prisma } from "@/lib/db";
import { requireAdminOrThrow } from "@/lib/guards";
import { createAuditLog } from "@/lib/audit";
import { revalidarVenda } from "@/lib/revalidacao";
import { hojeDataPura } from "@/lib/data-pura";
import { mensagemParcelaNoFechamento } from "@/lib/fechamento";

type Resultado = { success: boolean; error?: string; count?: number };

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
  // Fase 5: parcela reservada num fechamento só é liquidada por ele (`fechamentoId: null`).
  const { count } = await prisma.parcelaVencimento.updateMany({
    where: { id: parcelaId, paga: false, antecipacaoLoteId: null, fechamentoId: null },
    data: {
      paga: true,
      dataPagamento: new Date(`${data}T00:00:00.000Z`),
      origemPagamento: "manual",
      asaasPaymentId: null,
      baixaPor: sessao.nomeExibicao || sessao.username,
    },
  });
  if (count === 0) {
    const reservada = await prisma.parcelaVencimento.findUnique({
      where: { id: parcelaId },
      select: { id: true, fechamento: { select: { competencia: true } } },
    });
    if (reservada?.fechamento) return { success: false, error: mensagemParcelaNoFechamento(reservada.fechamento.competencia) };
    return { success: false, error: "Parcela não encontrada ou já paga." };
  }

  await createAuditLog("parcela:baixa", { parcelaId, origem: "manual", dataPagamento: data });
  revalidarVenda();
  return { success: true };
}

/**
 * Baixa manual de parcelas escolhidas na fila da Prudent. A seleção é formada no
 * popover, mas o servidor continua aceitando somente parcelas ainda abertas —
 * assim uma seleção antiga nunca quita uma parcela já registrada por outra via.
 */
export async function darBaixaParcelas(formData: FormData): Promise<Resultado> {
  const sessao = await requireAdminOrThrow();
  const idsRaw = String(formData.get("parcelaIds") || "");
  let ids: unknown;
  try {
    ids = JSON.parse(idsRaw);
  } catch {
    return { success: false, error: "Seleção de parcelas inválida." };
  }
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100) {
    return { success: false, error: "Selecione ao menos uma parcela." };
  }
  const parcelaIds = [...new Set(ids)];
  if (!parcelaIds.every((id) => Number.isInteger(id) && id > 0)) {
    return { success: false, error: "Seleção de parcelas inválida." };
  }

  const hoje = hojeDataPura();
  const informada = String(formData.get("dataPagamento") || "").trim();
  const data = informada ? dataPuraValida(informada) : hoje;
  if (!data) return { success: false, error: "Data de pagamento inválida." };
  if (data > hoje) return { success: false, error: "Data de pagamento não pode ser no futuro." };

  // `antecipacaoLoteId: null`, como na baixa individual: parcela em lote aberto na Prudent tem a
  // baixa feita pela conclusão do lote. `fechamentoId: null`: a reservada, pelo fechamento.
  const { count } = await prisma.parcelaVencimento.updateMany({
    where: { id: { in: parcelaIds }, paga: false, antecipacaoLoteId: null, fechamentoId: null },
    data: {
      paga: true,
      dataPagamento: new Date(`${data}T00:00:00.000Z`),
      origemPagamento: "manual",
      asaasPaymentId: null,
      baixaPor: sessao.nomeExibicao || sessao.username,
    },
  });
  if (count === 0) return { success: false, error: "As parcelas selecionadas já foram baixadas ou não existem." };

  await createAuditLog("parcela:baixa-em-lote", {
    parcelaIds,
    quantidade: count,
    origem: "manual",
    dataPagamento: data,
  });
  revalidarVenda();
  return { success: true, count };
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
    select: {
      id: true,
      vendaId: true,
      paga: true,
      origemPagamento: true,
      boletoPrudentId: true,
      fechamentoId: true,
      fechamento: { select: { competencia: true } },
    },
  });
  if (!parcela || !parcela.paga) return { success: false, error: "Parcela não encontrada ou não está paga." };

  // Fase 5: parcela reservada num fechamento só tem o recebimento mexido pelo fechamento.
  if (parcela.fechamentoId != null) {
    const erro = parcela.fechamento
      ? mensagemParcelaNoFechamento(parcela.fechamento.competencia)
      : "Parcela reservada num fechamento; o recebimento é pelo fechamento.";
    return { success: false, error: erro };
  }

  // A Prudent já emitiu o boleto desta parcela (Fase 4): desfazer a antecipação aqui deixaria o
  // boleto cobrando uma parcela que o sistema diz estar em aberto.
  const viaPrudent = parcela.origemPagamento === "prudent";
  if (viaPrudent && parcela.boletoPrudentId != null) {
    return { success: false, error: "Esta parcela tem boleto da Prudent; a antecipação não pode ser desfeita por aqui." };
  }

  const automatica = parcela.origemPagamento === "asaas" || viaPrudent;
  if (automatica && formData.get("confirmar") !== "1") {
    return {
      success: false,
      error: `A baixa veio ${parcela.origemPagamento === "asaas" ? "do Asaas" : "da antecipação na Prudent"}. Confirme para desfazer.`,
    };
  }

  // A origem lida entra no where: se a baixa mudou de origem entre a leitura e aqui (ex.: o
  // webhook do Asaas), nada é desfeito sem a confirmação correspondente. Na baixa da Prudent, o
  // boleto também entra: um boleto criado no meio do caminho cancela o desfazer.
  const { count } = await prisma.parcelaVencimento.updateMany({
    where: {
      id: parcelaId,
      paga: true,
      origemPagamento: parcela.origemPagamento,
      ...(viaPrudent ? { boletoPrudentId: null } : {}),
      fechamentoId: null,
    },
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
