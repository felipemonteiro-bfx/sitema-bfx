import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enviarWhatsAppTemplate, getWhatsAppFlags } from "@/lib/whatsapp";
import { comFallback, TEMPLATES } from "@/lib/whatsapp-templates";

/**
 * Reativação de clientes inativos: envia WhatsApp para clientes sem compra há X dias.
 * Usa whatsappDiasInativo (default 60). Evita reenvio em 30 dias via WhatsAppEnvioLog.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const waConfig = await getWhatsAppFlags();
    if (!waConfig?.autoReativacao) {
      return NextResponse.json({ ok: true, enviados: 0, total: 0, desativado: true });
    }

    const limite = new Date();
    limite.setDate(limite.getDate() - waConfig.diasInativo);
    limite.setHours(0, 0, 0, 0);

    const bloqueio = new Date();
    bloqueio.setDate(bloqueio.getDate() - 30);

    const ultimaVendaPorCliente = await prisma.venda.groupBy({
      by: ["clienteId"],
      _max: { dataVenda: true },
      where: { clienteId: { not: null } },
    });

    const inativoIds = ultimaVendaPorCliente
      .filter((g) => g._max.dataVenda && new Date(g._max.dataVenda) < limite)
      .map((g) => g.clienteId!);

    const recentes = await prisma.whatsAppEnvioLog.findMany({
      where: { tipo: "reativacao", dataEnvio: { gte: bloqueio } },
      select: { clienteId: true },
    });
    const excluirIds = new Set(recentes.map((r) => r.clienteId));

    const idsFinais = inativoIds.filter((id) => !excluirIds.has(id));

    const clientes = await prisma.cliente.findMany({
      where: {
        id: { in: idsFinais },
        telefone: { not: null },
      },
    });

    let enviados = 0;
    const erros: string[] = [];

    for (const c of clientes) {
      if (!c.telefone) continue;
      const msg = `Olá ${c.nome}! Sentimos sua falta. Temos novidades e condições especiais. Quer ver?`;
      const ok = await enviarWhatsAppTemplate(c.telefone, comFallback(TEMPLATES.reativacao, [c.nome], msg));
      if (ok) {
        enviados++;
        await prisma.whatsAppEnvioLog.create({
          data: { clienteId: c.id, tipo: "reativacao" },
        });
      } else {
        erros.push(c.nome);
      }
    }

    return NextResponse.json({
      ok: true,
      total: clientes.length,
      enviados,
      erros: erros.length > 0 ? erros : undefined,
    });
  } catch (error) {
    console.error("Erro na reativação de inativos:", error);
    return NextResponse.json(
      { error: "Erro ao enviar reativação" },
      { status: 500 }
    );
  }
}
