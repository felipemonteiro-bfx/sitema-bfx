import { NextResponse } from "next/server";
import { aplicarCobrancaAsaasPorId, configAsaasAtual } from "@/lib/baixa-parcelas-db";
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
 * Ver docs/superpowers/specs/2026-09-16-baixa-de-parcelas.md.
 */
export async function POST(req: Request) {
  const { asaas, webhookToken } = await configAsaasAtual();
  if (!segredoIgual(req.headers.get("asaas-access-token"), webhookToken)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const corpo = (await req.json().catch(() => null)) as { event?: string; payment?: { id?: string } } | null;
  const paymentId = corpo?.payment?.id;
  if (!paymentId) return NextResponse.json({ ok: true, ignorado: "sem_cobranca" });
  if (!asaas) return NextResponse.json({ ok: false, erro: "asaas_nao_configurado" });

  try {
    const decisao = await aplicarCobrancaAsaasPorId(asaas, paymentId);
    return NextResponse.json({ ok: true, evento: corpo?.event ?? null, ...decisao });
  } catch (e) {
    console.error(`[webhook-asaas] Falha ao aplicar cobrança ${paymentId}:`, e);
    return NextResponse.json({ ok: false, erro: "falha_ao_consultar_asaas" });
  }
}
