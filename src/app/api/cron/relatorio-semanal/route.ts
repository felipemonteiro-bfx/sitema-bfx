import { NextResponse } from "next/server";
import { autorizarCron } from "@/lib/segredo";
import { prisma } from "@/lib/db";
import { sendWeeklyReport } from "@/lib/email";

/**
 * GET /api/cron/relatorio-semanal
 *
 * Sends weekly sales report grouped by partner company.
 * Requires Bearer CRON_SECRET authorization header.
 */
export async function GET(req: Request) {
  // Fechado: sem CRON_SECRET nega (antes a rota passava com o segredo vazio).
  if (!autorizarCron(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    // Fetch all partner companies; only the primary RH email is notified.
    const empresas = await prisma.empresaParceira.findMany({
      orderBy: { nome: "asc" },
    });

    if (empresas.length === 0) {
      return NextResponse.json({ ok: true, empresas: 0, enviados: 0 });
    }

    const agora = new Date();
    const inicioMes = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1));
    const fimPeriodo = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate(), 23, 59, 59, 999));

    let enviados = 0;
    const erros: string[] = [];

    for (const empresa of empresas) {
      // Fetch the month's active sales; the email groups them by Saturday-Friday.
      // Use FK (empresaParceiraId) when possible, fall back to text matching for legacy data
      const vendas = await prisma.venda.findMany({
        where: {
          dataVenda: { gte: inicioMes, lte: fimPeriodo },
          status: "ativa",
          cliente: {
            OR: [
              { empresaParceiraId: empresa.id },
              { empresa: { equals: empresa.nome, mode: "insensitive" }, empresaParceiraId: null },
            ],
          },
        },
        include: {
          cliente: { select: { nome: true, matricula: true, empresa: true, empresaParceiraId: true } },
          itens: { select: { produtoNome: true, quantidade: true, subtotal: true } },
        },
        orderBy: { dataVenda: "desc" },
      });

      try {
        await sendWeeklyReport(empresa.nome, vendas, empresa.emailRh, { inicioMes, fimPeriodo });
        enviados++;
      } catch (err) {
        console.error(`[relatorio-semanal] Erro ao enviar para ${empresa.nome}:`, err);
        erros.push(`${empresa.nome}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return NextResponse.json({
      ok: true,
      empresas: empresas.length,
      enviados,
      erros: erros.length > 0 ? erros : undefined,
    });
  } catch (error) {
    console.error("[relatorio-semanal] Erro geral:", error);
    return NextResponse.json({ error: "Erro ao processar relatorio semanal" }, { status: 500 });
  }
}
