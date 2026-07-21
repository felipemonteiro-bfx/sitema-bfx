import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enviarWhatsApp, getWhatsAppFlags } from "@/lib/whatsapp";
import { comFallback, TEMPLATES } from "@/lib/whatsapp-templates";

/**
 * Recompra: empurrão para clientes cuja última compra está na faixa
 * [diasRecompra, diasInativo) dias atrás — antes de virarem "inativos"
 * (que o cron de reativação cobre nos 60+). Cooldown via WhatsAppEnvioLog.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const waConfig = await getWhatsAppFlags();
    if (!waConfig?.autoRecompra) {
      return NextResponse.json({ ok: true, enviados: 0, total: 0, desativado: true });
    }

    const inicioFaixa = new Date(); // limite recente: diasRecompra atrás
    inicioFaixa.setDate(inicioFaixa.getDate() - waConfig.diasRecompra);
    inicioFaixa.setHours(23, 59, 59, 999);

    const fimFaixa = new Date(); // limite antigo: diasInativo atrás
    fimFaixa.setDate(fimFaixa.getDate() - waConfig.diasInativo);
    fimFaixa.setHours(0, 0, 0, 0);

    const cooldown = new Date();
    cooldown.setDate(cooldown.getDate() - (waConfig.diasInativo - waConfig.diasRecompra));

    const ultimaVendaPorCliente = await prisma.venda.groupBy({
      by: ["clienteId"],
      _max: { dataVenda: true },
      where: { clienteId: { not: null } },
    });

    const naFaixaIds = ultimaVendaPorCliente
      .filter((g) => {
        const d = g._max.dataVenda ? new Date(g._max.dataVenda) : null;
        return d !== null && d < inicioFaixa && d >= fimFaixa;
      })
      .map((g) => g.clienteId!);

    const recentes = await prisma.whatsAppEnvioLog.findMany({
      where: { tipo: "recompra", dataEnvio: { gte: cooldown } },
      select: { clienteId: true },
    });
    const excluirIds = new Set(recentes.map((r) => r.clienteId));
    const idsFinais = naFaixaIds.filter((id) => !excluirIds.has(id));

    const clientes = await prisma.cliente.findMany({
      where: { id: { in: idsFinais }, telefone: { not: null } },
    });

    let enviados = 0;
    const erros: string[] = [];
    for (const c of clientes) {
      if (!c.telefone) continue;
      const msg = `Olá ${c.nome}! Já faz um tempinho desde sua última compra. Temos novidades esperando por você — quer dar uma olhada?`;
      const ok = await enviarWhatsApp({
        telefone: c.telefone,
        clienteId: c.id,
        origem: "cron",
        template: comFallback(TEMPLATES.recompra, [c.nome], msg),
      });
      if (ok) {
        enviados++;
        await prisma.whatsAppEnvioLog.create({ data: { clienteId: c.id, tipo: "recompra" } });
      } else {
        erros.push(c.nome);
      }
    }

    return NextResponse.json({ ok: true, total: clientes.length, enviados, erros: erros.length ? erros : undefined });
  } catch (error) {
    console.error("Erro no cron de recompra:", error);
    return NextResponse.json({ error: "Erro ao enviar recompra" }, { status: 500 });
  }
}
