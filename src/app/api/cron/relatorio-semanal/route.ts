import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWeeklyReport } from "@/lib/email";

/**
 * GET /api/cron/relatorio-semanal
 *
 * Sends weekly sales report grouped by partner company.
 * Requires Bearer CRON_SECRET authorization header.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    // Get admin email from config
    const cfg = await prisma.config.findFirst();
    const adminEmail = (cfg as Record<string, unknown> | null)?.adminEmail as string | undefined;

    // Fetch ALL partner companies (including those without email, for WhatsApp fallback)
    const empresas = await prisma.empresaParceira.findMany({
      orderBy: { nome: "asc" },
    });

    if (empresas.length === 0) {
      return NextResponse.json({ ok: true, empresas: 0, enviados: 0 });
    }

    const hoje = new Date();
    const semanaAtras = new Date(hoje);
    semanaAtras.setDate(semanaAtras.getDate() - 7);
    semanaAtras.setHours(0, 0, 0, 0);
    hoje.setHours(23, 59, 59, 999);

    let enviados = 0;
    const erros: string[] = [];

    for (const empresa of empresas) {
      // Fetch sales for this company in the last 7 days
      const vendas = await prisma.venda.findMany({
        where: {
          dataVenda: { gte: semanaAtras, lte: hoje },
          cliente: {
            empresa: { equals: empresa.nome, mode: "insensitive" },
          },
        },
        include: {
          cliente: { select: { nome: true, matricula: true, empresa: true } },
          itens: { select: { produtoNome: true, quantidade: true, subtotal: true } },
        },
        orderBy: { dataVenda: "desc" },
      });

      // Build recipient list (may be empty if no emailRh — sendWeeklyReport will use WhatsApp fallback)
      const toEmails: string[] = [];
      if (empresa.emailRh) {
        toEmails.push(empresa.emailRh);
        if (empresa.emailsExtras) {
          const extras = empresa.emailsExtras.split(",").map((e) => e.trim()).filter(Boolean);
          toEmails.push(...extras);
        }
      }

      const telefoneFallback = empresa.telefoneRh ?? undefined;

      try {
        await sendWeeklyReport(empresa.nome, vendas, toEmails, adminEmail, telefoneFallback);
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
