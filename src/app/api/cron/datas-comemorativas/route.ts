import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enviarWhatsApp, getWhatsAppFlags } from "@/lib/whatsapp";
import { comFallback } from "@/lib/whatsapp-templates";
import { dataComemorativaDeHoje } from "@/lib/datas-comemorativas";
import { verificarCota } from "@/lib/campanha-service";

/**
 * Datas comemorativas fixas: no dia certo, envia para clientes ativos
 * (compraram nos últimos `mesesAtivoComemorativa` meses), respeitando a cota
 * da Meta. Como é marketing, envia só até o disponível e loga o excedente,
 * preservando a reserva transacional.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const waConfig = await getWhatsAppFlags();
    if (!waConfig?.autoComemorativas) {
      return NextResponse.json({ ok: true, enviados: 0, total: 0, desativado: true });
    }

    const data = dataComemorativaDeHoje(new Date());
    if (!data) {
      return NextResponse.json({ ok: true, enviados: 0, semData: true });
    }

    const desdeAtivo = new Date();
    desdeAtivo.setMonth(desdeAtivo.getMonth() - waConfig.mesesAtivoComemorativa);

    const ultimaVendaPorCliente = await prisma.venda.groupBy({
      by: ["clienteId"],
      _max: { dataVenda: true },
      where: { clienteId: { not: null } },
    });

    const ativosIds = ultimaVendaPorCliente
      .filter((g) => g._max.dataVenda && new Date(g._max.dataVenda) >= desdeAtivo)
      .map((g) => g.clienteId!);

    const inicioHoje = new Date();
    inicioHoje.setHours(0, 0, 0, 0);
    const jaEnviados = await prisma.whatsAppEnvioLog.findMany({
      where: { tipo: `comemorativa_${data.slug}`, dataEnvio: { gte: inicioHoje } },
      select: { clienteId: true },
    });
    const excluir = new Set(jaEnviados.map((l) => l.clienteId));
    const idsFinais = ativosIds.filter((id) => !excluir.has(id));

    const clientes = await prisma.cliente.findMany({
      where: { id: { in: idsFinais }, telefone: { not: null } },
    });

    // Respeita a cota da Meta: envia só até o disponível.
    const cota = await verificarCota(clientes.length);
    const aEnviar = clientes.slice(0, cota.disponivel);
    const excedente = clientes.length - aEnviar.length;

    let enviados = 0;
    const erros: string[] = [];
    for (const c of aEnviar) {
      if (!c.telefone) continue;
      const msg = `Olá ${c.nome}! ${data.ocasiao}! A BFX deseja tudo de bom para você. 🎉`;
      const ok = await enviarWhatsApp({
        telefone: c.telefone,
        clienteId: c.id,
        origem: "cron",
        template: comFallback(data.template, [c.nome], msg),
      });
      if (ok) {
        enviados++;
        await prisma.whatsAppEnvioLog.create({
          data: { clienteId: c.id, tipo: `comemorativa_${data.slug}` },
        });
      } else {
        erros.push(c.nome);
      }
    }

    if (excedente > 0) {
      console.warn(`[comemorativa/${data.slug}] ${excedente} clientes fora da cota de 24h (disponível: ${cota.disponivel}).`);
    }

    return NextResponse.json({
      ok: true,
      slug: data.slug,
      total: clientes.length,
      enviados,
      excedente,
      erros: erros.length ? erros : undefined,
    });
  } catch (error) {
    console.error("Erro no cron de datas comemorativas:", error);
    return NextResponse.json({ error: "Erro ao enviar comemorativa" }, { status: 500 });
  }
}
