import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enviarWhatsAppTexto, getWhatsAppConfig } from "@/lib/whatsapp";
import { formatBRL } from "@/lib/utils";

/**
 * Parcela vencida – lembrete de inadimplência.
 * Parcelas com dataVencimento < hoje e paga = false (apenas vendas com boleto).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const waConfig = await getWhatsAppConfig();
    if (!waConfig?.autoInadimplencia) {
      return NextResponse.json({ ok: true, enviados: 0, total: 0, desativado: true });
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

      const ok = await enviarWhatsAppTexto(telefone, msg);
      if (ok) enviados++;
      else erros.push(`Parcela ${p.id} (${clienteNome})`);
    }

    return NextResponse.json({
      ok: true,
      total: parcelas.length,
      enviados,
      erros: erros.length > 0 ? erros : undefined,
    });
  } catch (error) {
    console.error("Erro na parcela vencida:", error);
    return NextResponse.json(
      { error: "Erro ao enviar lembrete de inadimplência" },
      { status: 500 }
    );
  }
}
