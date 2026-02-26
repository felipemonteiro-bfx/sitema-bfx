import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enviarWhatsAppTexto } from "@/lib/whatsapp";
import { formatBRL } from "@/lib/utils";

const DIAS_ANTES = 2; // Enviar lembrete X dias antes do vencimento

function formatDateBr(d: Date) {
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Envia lembretes de parcelas a vencer nos próximos DIAS_ANTES dias.
 * Chamado por Vercel Cron ou manualmente (requer CRON_SECRET).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + DIAS_ANTES);
    limite.setHours(23, 59, 59, 999);

    const parcelas = await prisma.parcelaVencimento.findMany({
      where: {
        paga: false,
        dataVencimento: { gte: hoje, lte: limite },
      },
      include: {
        venda: {
          include: {
            cliente: { select: { nome: true, telefone: true } },
          },
        },
      },
    });

    let enviados = 0;
    const erros: string[] = [];

    for (const p of parcelas) {
      const telefone = p.venda.cliente?.telefone;
      if (!telefone) continue;

      const clienteNome = p.venda.cliente?.nome ?? "Cliente";
      const msg = `Olá ${clienteNome}! Lembrete: a parcela ${p.numeroParcela} de ${p.venda.parcelas || 1} da venda #${p.venda.id} vence em ${formatDateBr(p.dataVencimento)}. Valor: ${formatBRL(p.valorParcela)}.`;

      const ok = await enviarWhatsAppTexto(telefone, msg);
      if (ok) enviados++;
      else erros.push(`Parcela ${p.id} (cliente ${clienteNome})`);
    }

    return NextResponse.json({
      ok: true,
      total: parcelas.length,
      enviados,
      erros: erros.length > 0 ? erros : undefined,
    });
  } catch (error) {
    console.error("Erro no lembrete de parcelas:", error);
    return NextResponse.json(
      { error: "Erro ao enviar lembretes" },
      { status: 500 }
    );
  }
}
