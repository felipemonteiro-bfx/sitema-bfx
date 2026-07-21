import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enviarWhatsApp, getWhatsAppFlags } from "@/lib/whatsapp";
import { comFallback, TEMPLATES } from "@/lib/whatsapp-templates";
import { ehPrimeiraCompra } from "@/lib/primeira-compra";

const DIAS_APOS_COMPRA = 1;

/**
 * Primeira compra: mensagem especial no dia seguinte à PRIMEIRA compra do
 * cliente. Substitui o agradecimento genérico nesses casos (o agradecimento
 * exclui as primeiras compras quando esta automação está ligada).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const waConfig = await getWhatsAppFlags();
    if (!waConfig?.autoPrimeiraCompra) {
      return NextResponse.json({ ok: true, enviados: 0, total: 0, desativado: true });
    }

    const diaAlvo = new Date();
    diaAlvo.setDate(diaAlvo.getDate() - DIAS_APOS_COMPRA);
    const inicio = new Date(diaAlvo);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(diaAlvo);
    fim.setHours(23, 59, 59, 999);

    const vendas = await prisma.venda.findMany({
      where: {
        dataVenda: { gte: inicio, lte: fim },
        clienteId: { not: null },
        cliente: { telefone: { not: null } },
      },
      include: { cliente: { select: { nome: true, telefone: true } } },
    });

    const jaEnviados = await prisma.whatsAppEnvioLog.findMany({
      where: { tipo: "primeira_compra", referencia: { not: null } },
      select: { referencia: true },
    });
    const idsEnviados = new Set(jaEnviados.map((l) => l.referencia).filter(Boolean) as number[]);

    let enviados = 0;
    const erros: string[] = [];
    for (const v of vendas) {
      if (idsEnviados.has(v.id)) continue;
      if (!(await ehPrimeiraCompra(v.clienteId!, v.id))) continue;

      const telefone = v.cliente?.telefone;
      if (!telefone) continue;
      const clienteNome = v.cliente?.nome ?? "Cliente";
      const msg = `Olá ${clienteNome}! Que alegria ter você como cliente da BFX pela primeira vez. Qualquer coisa, é só chamar. Seja bem-vindo(a)!`;

      const ok = await enviarWhatsApp({
        telefone,
        clienteId: v.clienteId!,
        origem: "cron",
        template: comFallback(TEMPLATES.primeiraCompra, [clienteNome], msg),
      });
      if (ok) {
        enviados++;
        await prisma.whatsAppEnvioLog.create({
          data: { clienteId: v.clienteId!, tipo: "primeira_compra", referencia: v.id },
        });
      } else {
        erros.push(`Venda ${v.id} (${clienteNome})`);
      }
    }

    return NextResponse.json({ ok: true, total: vendas.length, enviados, erros: erros.length ? erros : undefined });
  } catch (error) {
    console.error("Erro no cron de primeira compra:", error);
    return NextResponse.json({ error: "Erro ao enviar primeira compra" }, { status: 500 });
  }
}
