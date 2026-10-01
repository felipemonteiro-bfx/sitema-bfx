import { NextResponse } from "next/server";
import { aplicarPagamentoAsaas, configAsaasAtual, registrarAvisoWebhookAsaas } from "@/lib/baixa-parcelas-db";
import { getPayment } from "@/lib/asaas";
import { ehCobrancaDeFechamento, processarPagamentoFechamento } from "@/lib/recebimento-fechamento-db";
import { segredoIgual } from "@/lib/segredo";

export const runtime = "nodejs";

/**
 * POST /api/webhooks/asaas — baixa de parcela paga por boleto (2026-09-16).
 *
 * `/api/webhooks` é isento do middleware de sessão: o header `asaas-access-token` é a única
 * barreira. Sem token configurado em /configuracoes, recusa tudo.
 *
 * O corpo só diz QUAL cobrança mudou. O status aplicado é o atual, buscado na API do Asaas: evento
 * reenviado ou fora de ordem não deixa estado errado. Responde 200 mesmo quando não aplica (sem
 * par, falha na API): o Asaas pausa a fila de webhooks depois de erros seguidos, e a sincronização
 * diária (`/api/cron/parcela-vencida`) corrige o que ficar para trás.
 *
 * Cobrança Pix do fechamento mensal (Fase 6): referência `FEC-…` ou cobrança gravada em
 * `CobrancaFechamento` → `processarPagamentoFechamento` (recebimento do fechamento), sem passar
 * pela baixa de parcela. Mesma autenticação e mesmo 200 em falha.
 * Ver docs/superpowers/specs/2026-09-16-baixa-de-parcelas.md.
 */
export async function POST(req: Request) {
  const { asaas, webhookToken } = await configAsaasAtual();
  if (!webhookToken || !segredoIgual(req.headers.get("asaas-access-token"), webhookToken)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // Autenticado: registra o aviso (a tela de Configurações mostra que o cadastro no Asaas funciona).
  await registrarAvisoWebhookAsaas(webhookToken).catch((e) => console.error("[webhook-asaas] Falha ao registrar aviso:", e));

  const corpo = (await req.json().catch(() => null)) as { event?: string; payment?: { id?: string } } | null;
  const paymentId = corpo?.payment?.id;
  if (!paymentId) return NextResponse.json({ ok: true, ignorado: "sem_cobranca" });
  if (!asaas) return NextResponse.json({ ok: false, erro: "asaas_nao_configurado" });

  const evento = corpo?.event ?? null;
  try {
    const pagamento = await getPayment(asaas, paymentId);
    if (await ehCobrancaDeFechamento(pagamento)) {
      const fechamento = await processarPagamentoFechamento(pagamento, evento);
      return NextResponse.json({ ok: true, evento, fechamento });
    }
    const decisao = await aplicarPagamentoAsaas(pagamento);
    return NextResponse.json({ ok: true, evento, ...decisao });
  } catch (e) {
    console.error(`[webhook-asaas] Falha ao aplicar cobrança ${paymentId}:`, e);
    return NextResponse.json({ ok: false, erro: "falha_ao_consultar_asaas" });
  }
}
