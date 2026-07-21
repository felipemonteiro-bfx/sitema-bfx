import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enviarWhatsApp, getWhatsAppFlags } from "@/lib/whatsapp";
import { comFallback, TEMPLATES } from "@/lib/whatsapp-templates";
import { ehPrimeiraCompra } from "@/lib/primeira-compra";

const DIAS_APOS_COMPRA = 1;

/**
 * Agradecimento pós-venda: envia 1 dia após a compra.
 * Apenas 1x por venda (verifica WhatsAppEnvioLog).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const waConfig = await getWhatsAppFlags();
    if (!waConfig?.autoAgradecimento) {
      return NextResponse.json({ ok: true, enviados: 0, total: 0, desativado: true });
    }

    const hoje = new Date();
    const diaAlvo = new Date(hoje);
    diaAlvo.setDate(diaAlvo.getDate() - DIAS_APOS_COMPRA);
    const inicio = new Date(diaAlvo);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(diaAlvo);
    fim.setHours(23, 59, 59, 999);

    const vendasCompletas = await prisma.venda.findMany({
      where: {
        dataVenda: { gte: inicio, lte: fim },
        clienteId: { not: null },
        cliente: { telefone: { not: null } },
      },
      include: { cliente: { select: { nome: true, telefone: true } } },
    });

    const jaEnviados = await prisma.whatsAppEnvioLog.findMany({
      where: { tipo: "agradecimento", referencia: { not: null } },
      select: { referencia: true },
    });
    const idsEnviados = new Set(
      jaEnviados.map((l) => l.referencia).filter(Boolean) as number[]
    );

    const vendasPendentes = vendasCompletas.filter((v) => !idsEnviados.has(v.id));

    // Quando a primeira compra está ativa, ela assume os clientes de primeira
    // viagem — o agradecimento genérico não os envia para não duplicar.
    let vendasParaEnviar = vendasPendentes;
    if (waConfig.autoPrimeiraCompra) {
      const flags = await Promise.all(
        vendasPendentes.map((v) => ehPrimeiraCompra(v.clienteId!, v.id))
      );
      vendasParaEnviar = vendasPendentes.filter((_, i) => !flags[i]);
    }

    let enviados = 0;
    const erros: string[] = [];

    for (const v of vendasParaEnviar) {
      const telefone = v.cliente?.telefone;
      if (!telefone) continue;

      const clienteNome = v.cliente?.nome ?? "Cliente";
      const msg = `Olá ${clienteNome}! Como foi sua compra? Estamos à disposição para qualquer dúvida. Obrigado por escolher a BFX!`;

      const ok = await enviarWhatsApp({
        telefone,
        clienteId: v.clienteId!,
        origem: "cron",
        template: comFallback(TEMPLATES.agradecimento, [clienteNome], msg),
      });
      if (ok) {
        enviados++;
        await prisma.whatsAppEnvioLog.create({
          data: {
            clienteId: v.clienteId!,
            tipo: "agradecimento",
            referencia: v.id,
          },
        });
      } else {
        erros.push(`Venda ${v.id} (${clienteNome})`);
      }
    }

    return NextResponse.json({
      ok: true,
      total: vendasParaEnviar.length,
      enviados,
      erros: erros.length > 0 ? erros : undefined,
    });
  } catch (error) {
    console.error("Erro no agradecimento pós-venda:", error);
    return NextResponse.json(
      { error: "Erro ao enviar agradecimento" },
      { status: 500 }
    );
  }
}
