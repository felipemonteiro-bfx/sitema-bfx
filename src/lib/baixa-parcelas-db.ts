import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { getAsaasConfig, getPayment, listPaymentsDaVenda, type AsaasConfig } from "@/lib/asaas";
import { decidirBaixaAsaas, type DecisaoBaixaAsaas, type PagamentoAsaas } from "@/lib/baixa-parcelas";
import { hojeDataPura } from "@/lib/data-pura";

/** "YYYY-MM-DD" do Asaas (ou hoje em Manaus) como data pura à meia-noite UTC, igual ao vencimento. */
function dataPuraParaDate(valor: string | null): Date {
  const dia = (valor ?? hojeDataPura()).slice(0, 10);
  return new Date(`${dia}T00:00:00.000Z`);
}

/**
 * Aplica a cobrança do Asaas (status atual) na parcela da venda. Idempotente e segura contra
 * concorrência entre webhook e sincronização: o `updateMany` só grava se a parcela ainda está no
 * estado que a decisão leu, e o audit só é registrado quando algo mudou de fato.
 */
export async function aplicarPagamentoAsaas(pagamento: PagamentoAsaas): Promise<DecisaoBaixaAsaas> {
  const vendaId = Number(pagamento.externalReference);
  if (!Number.isInteger(vendaId) || vendaId <= 0) return { acao: "ignorar", motivo: "referencia_invalida" };

  const linhas = await prisma.parcelaVencimento.findMany({
    where: { vendaId },
    select: {
      id: true,
      vendaId: true,
      numeroParcela: true,
      paga: true,
      origemPagamento: true,
      asaasPaymentId: true,
      fechamentoId: true,
      venda: { select: { status: true } },
    },
  });
  const decisao = decidirBaixaAsaas(
    pagamento,
    linhas.map((l) => ({ ...l, vendaStatus: l.venda.status })),
  );

  if (decisao.acao === "baixar") {
    const { count } = await prisma.parcelaVencimento.updateMany({
      // `fechamentoId: null`: a reserva feita entre a leitura e a gravação vence (Fase 5).
      where: { id: decisao.parcelaId, paga: false, fechamentoId: null },
      data: {
        paga: true,
        dataPagamento: dataPuraParaDate(decisao.dataPagamento),
        origemPagamento: "asaas",
        asaasPaymentId: decisao.asaasPaymentId,
        baixaPor: null,
      },
    });
    if (count > 0) {
      await createAuditLog("parcela:baixa", {
        parcelaId: decisao.parcelaId,
        vendaId,
        origem: "asaas",
        asaasPaymentId: decisao.asaasPaymentId,
        status: pagamento.status,
      });
    }
  } else if (decisao.acao === "desfazer") {
    const { count } = await prisma.parcelaVencimento.updateMany({
      where: { id: decisao.parcelaId, paga: true, origemPagamento: "asaas", asaasPaymentId: pagamento.id, fechamentoId: null },
      data: { paga: false, dataPagamento: null, origemPagamento: null, asaasPaymentId: null, baixaPor: null },
    });
    if (count > 0) {
      await createAuditLog("parcela:baixa-desfeita", {
        parcelaId: decisao.parcelaId,
        vendaId,
        origem: "asaas",
        asaasPaymentId: pagamento.id,
        status: pagamento.status,
      });
    }
  }
  return decisao;
}

/** Configuração do Asaas gravada em /configuracoes (ou env). */
export async function configAsaasAtual(): Promise<{ asaas: AsaasConfig | null; webhookToken: string | null }> {
  const cfg = await prisma.config.findFirst();
  return { asaas: getAsaasConfig(cfg ?? undefined), webhookToken: cfg?.asaasWebhookToken ?? null };
}

/**
 * Marca que o Asaas chamou o webhook com token válido — a tela mostra "Recebendo avisos". Só grava
 * onde o token ainda é o validado: um aviso com o token antigo que termine depois de "Gerar novo
 * token" não pode marcar o novo como cadastrado.
 */
export async function registrarAvisoWebhookAsaas(tokenValidado: string, agora: Date = new Date()) {
  await prisma.config.updateMany({
    where: { asaasWebhookToken: tokenValidado },
    data: { asaasWebhookUltimoAvisoEm: agora },
  });
}

/** Busca a cobrança atual e aplica — usado pelo webhook, onde o evento é só gatilho. */
export async function aplicarCobrancaAsaasPorId(config: AsaasConfig, paymentId: string) {
  return aplicarPagamentoAsaas(await getPayment(config, paymentId));
}

/**
 * Reconciliação diária: para cada venda ativa com boleto que ainda tem parcela aberta (ou baixa do
 * Asaas que pode ter sido estornada), lista as cobranças no Asaas e aplica o status atual. Cobre
 * webhook perdido e faz a carga das vendas antigas. Erro numa venda não interrompe as outras.
 */
export async function sincronizarBaixasAsaas() {
  const { asaas } = await configAsaasAtual();
  if (!asaas) return { vendas: 0, cobrancas: 0, baixadas: 0, desfeitas: 0, erros: 0, desativado: true };

  const vendas = await prisma.venda.findMany({
    where: {
      status: "ativa",
      OR: [{ formaPagamento: "BOLETO" }, { boleto: true }],
      parcelasVencimento: { some: { OR: [{ paga: false }, { origemPagamento: "asaas" }] } },
    },
    select: { id: true },
  });

  const resumo = { vendas: vendas.length, cobrancas: 0, baixadas: 0, desfeitas: 0, erros: 0 };
  for (const venda of vendas) {
    let cobrancas: Awaited<ReturnType<typeof listPaymentsDaVenda>>;
    try {
      cobrancas = await listPaymentsDaVenda(asaas, venda.id);
    } catch (e) {
      resumo.erros += 1;
      console.error(`[baixa-asaas] Falha ao listar cobranças da venda ${venda.id}:`, e);
      continue;
    }
    // Erro por cobrança (ex.: P2002 de cobrança que já quitou outra parcela) não pode travar as
    // outras cobranças da mesma venda todo dia.
    for (const cobranca of cobrancas) {
      resumo.cobrancas += 1;
      try {
        const decisao = await aplicarPagamentoAsaas(cobranca);
        if (decisao.acao === "baixar") resumo.baixadas += 1;
        if (decisao.acao === "desfazer") resumo.desfeitas += 1;
      } catch (e) {
        resumo.erros += 1;
        console.error(`[baixa-asaas] Falha ao aplicar cobrança ${cobranca.id} da venda ${venda.id}:`, e);
      }
    }
  }
  return resumo;
}
