import { NextResponse } from "next/server";
import { autorizarCron } from "@/lib/segredo";
import { prisma } from "@/lib/db";
import { enviarWhatsApp, getWhatsAppFlags } from "@/lib/whatsapp";
import { comFallback, TEMPLATES } from "@/lib/whatsapp-templates";
import { formatBRL } from "@/lib/utils";
import { sincronizarBaixasAsaas } from "@/lib/baixa-parcelas-db";

/**
 * Parcela vencida – lembrete de inadimplência.
 * Parcelas com dataVencimento < hoje e paga = false (apenas vendas com boleto).
 */
export async function GET(req: Request) {
  // Fechado: sem CRON_SECRET nega (antes a rota passava com o segredo vazio).
  if (!autorizarCron(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // Baixa dos boletos pagos no Asaas antes de olhar vencidas: é o único cron diário já agendado
  // perto deste assunto (sem CronJob novo), e sem isto um boleto quitado seria cobrado. Falha na
  // sincronização não impede o resto.
  let sincronizacaoAsaas: Awaited<ReturnType<typeof sincronizarBaixasAsaas>> | { erro: string };
  try {
    sincronizacaoAsaas = await sincronizarBaixasAsaas();
  } catch (e) {
    console.error("[parcela-vencida] Falha ao sincronizar baixas do Asaas:", e);
    sincronizacaoAsaas = { erro: "falha_sincronizacao" };
  }

  try {
    const waConfig = await getWhatsAppFlags();
    if (!waConfig?.autoInadimplencia) {
      return NextResponse.json({ ok: true, enviados: 0, total: 0, desativado: true, sincronizacaoAsaas });
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const parcelas = await prisma.parcelaVencimento.findMany({
      where: {
        paga: false,
        dataVencimento: { lt: hoje },
        venda: { boleto: true },
      },
      include: {
        venda: {
          include: { cliente: { select: { nome: true, telefone: true } } },
        },
      },
    });

    let enviados = 0;
    const erros: string[] = [];

    for (const p of parcelas) {
      const telefone = p.venda.cliente?.telefone;
      if (!telefone) continue;

      const clienteNome = p.venda.cliente?.nome ?? "Cliente";
      let msg = `Olá ${clienteNome}, a parcela ${p.numeroParcela} de ${p.venda.parcelas || 1} da venda #${p.venda.id} venceu. Valor: ${formatBRL(p.valorParcela)}. Evite juros!`;
      if (p.venda.boletoUrl) {
        msg += `\n\nBoleto: ${p.venda.boletoUrl}`;
      }

      const ok = await enviarWhatsApp({
        telefone,
        clienteId: p.venda.clienteId,
        origem: "cron",
        template: comFallback(
          TEMPLATES.parcelaVencida,
          [clienteNome, String(p.numeroParcela), String(p.venda.id), formatBRL(p.valorParcela)],
          msg
        ),
      });
      if (ok) enviados++;
      else erros.push(`Parcela ${p.id} (${clienteNome})`);
    }

    return NextResponse.json({
      ok: true,
      total: parcelas.length,
      enviados,
      erros: erros.length > 0 ? erros : undefined,
      sincronizacaoAsaas,
    });
  } catch (error) {
    console.error("Erro na parcela vencida:", error);
    return NextResponse.json(
      { error: "Erro ao enviar lembrete de inadimplência" },
      { status: 500 }
    );
  }
}
