import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enviarWhatsAppTexto, getWhatsAppConfig } from "@/lib/whatsapp";
import { formatBRL } from "@/lib/utils";

const DIAS_ANTES = 2; // Enviar lembrete X dias antes (inclui 2 dias e 1 dia = última chance)

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
    const waConfig = await getWhatsAppConfig();
    if (!waConfig?.autoLembrete) {
      return NextResponse.json({ ok: true, enviados: 0, total: 0, desativado: true });
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + DIAS_ANTES);
    limite.setHours(23, 59, 59, 999);

    const parcelas = await prisma.parcelaVencimento.findMany({
      where: {
        paga: false,
        dataVencimento: { gte: hoje, lte: limite },
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
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);
      const venceAmanha =
        p.dataVencimento.getDate() === amanha.getDate() &&
        p.dataVencimento.getMonth() === amanha.getMonth() &&
        p.dataVencimento.getFullYear() === amanha.getFullYear();

      let msg = venceAmanha
        ? `Atenção, ${clienteNome}! Sua parcela ${p.numeroParcela} de ${p.venda.parcelas || 1} da venda #${p.venda.id} vence AMANHÃ. Valor: ${formatBRL(p.valorParcela)}. Evite atraso!`
        : `Olá ${clienteNome}! Lembrete: a parcela ${p.numeroParcela} de ${p.venda.parcelas || 1} da venda #${p.venda.id} vence em ${formatDateBr(p.dataVencimento)}. Valor: ${formatBRL(p.valorParcela)}.`;
      if (p.venda.boletoUrl) {
        msg += `\n\nBoleto: ${p.venda.boletoUrl}`;
      }

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
