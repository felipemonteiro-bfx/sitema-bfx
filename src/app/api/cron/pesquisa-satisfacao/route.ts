import { NextResponse } from "next/server";
import { autorizarCron } from "@/lib/segredo";
import { prisma } from "@/lib/db";
import { enviarWhatsApp, getWhatsAppFlags } from "@/lib/whatsapp";
import { comFallback, TEMPLATES } from "@/lib/whatsapp-templates";

const DIAS_APOS_COMPRA = 7;

/**
 * Pesquisa de satisfação (NPS): envia 7 dias após a compra.
 * Apenas 1x por venda (verifica WhatsAppEnvioLog).
 */
export async function GET(req: Request) {
  // Fechado: sem CRON_SECRET nega (antes a rota passava com o segredo vazio).
  if (!autorizarCron(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const waConfig = await getWhatsAppFlags();
    if (!waConfig?.autoNPS) {
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
      where: { tipo: "nps", referencia: { not: null } },
      select: { referencia: true },
    });
    const idsEnviados = new Set(jaEnviados.map((l) => l.referencia).filter(Boolean) as number[]);

    const vendasPendentes = vendasCompletas.filter((v) => !idsEnviados.has(v.id));

    let enviados = 0;
    const erros: string[] = [];

    for (const v of vendasPendentes) {
      const telefone = v.cliente?.telefone;
      if (!telefone) continue;

      const clienteNome = v.cliente?.nome ?? "Cliente";
      const msg = `Olá ${clienteNome}! Como você avalia sua experiência na compra da venda #${v.id}? Responda de 0 a 10.`;

      const ok = await enviarWhatsApp({
        telefone,
        clienteId: v.clienteId!,
        origem: "cron",
        template: comFallback(TEMPLATES.nps, [clienteNome, String(v.id)], msg),
      });
      if (ok) {
        enviados++;
        await prisma.whatsAppEnvioLog.create({
          data: {
            clienteId: v.clienteId!,
            tipo: "nps",
            referencia: v.id,
          },
        });
      } else {
        erros.push(`Venda ${v.id} (${clienteNome})`);
      }
    }

    return NextResponse.json({
      ok: true,
      total: vendasPendentes.length,
      enviados,
      erros: erros.length > 0 ? erros : undefined,
    });
  } catch (error) {
    console.error("Erro na pesquisa de satisfação:", error);
    return NextResponse.json(
      { error: "Erro ao enviar NPS" },
      { status: 500 }
    );
  }
}
