import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/cron/alertas-admin
 *
 * Cria notificacoes internas (in-app) para todos os usuarios admin sobre pendencias
 * operacionais: parcelas vencidas, assinaturas pendentes ha muito tempo e estoque baixo.
 *
 * Idempotencia: nao recria um alerta do mesmo tipo se ja existe um nao-lido criado
 * nas ultimas 20h (evita spam a cada execucao).
 *
 * Requer header Authorization: Bearer $CRON_SECRET.
 */

const PREFIXO = {
  parcelas: "[Alerta] Parcelas vencidas",
  assinaturas: "[Alerta] Assinaturas pendentes",
  estoque: "[Alerta] Estoque baixo",
} as const;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const diasAssinatura = Number(process.env.ALERTA_ASSINATURA_DIAS || 3);
  const estoqueMinimo = Number(process.env.ALERTA_ESTOQUE_MINIMO || 3);

  try {
    const admins = await prisma.usuario.findMany({ where: { role: "admin" }, select: { id: true } });
    if (admins.length === 0) {
      return NextResponse.json({ ok: true, admins: 0, alertas: 0 });
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const limiteAssinatura = new Date(hoje);
    limiteAssinatura.setDate(limiteAssinatura.getDate() - diasAssinatura);

    // 1. Parcelas vencidas (venda ativa, parcela nao paga, vencimento no passado)
    const parcelasVencidas = await prisma.parcelaVencimento.count({
      where: { paga: false, dataVencimento: { lt: hoje }, venda: { status: "ativa" } },
    });

    // 2. Assinaturas pendentes ha mais de N dias
    const assinaturasPendentes = await prisma.assinatura.count({
      where: {
        assinaturaStatus: "pendente",
        venda: { status: "ativa", dataVenda: { lt: limiteAssinatura } },
      },
    });

    // 3. Produtos com estoque baixo
    const estoqueBaixo = await prisma.produto.count({
      where: { qtdEstoque: { lte: estoqueMinimo } },
    });

    const alertas: { prefixo: string; mensagem: string; link: string; contagem: number }[] = [];
    if (parcelasVencidas > 0) {
      alertas.push({
        prefixo: PREFIXO.parcelas,
        mensagem: `${PREFIXO.parcelas}: ${parcelasVencidas} parcela(s) vencida(s) e não paga(s).`,
        link: "/financeiro",
        contagem: parcelasVencidas,
      });
    }
    if (assinaturasPendentes > 0) {
      alertas.push({
        prefixo: PREFIXO.assinaturas,
        mensagem: `${PREFIXO.assinaturas}: ${assinaturasPendentes} assinatura(s) sem confirmação há mais de ${diasAssinatura} dia(s).`,
        link: "/historico",
        contagem: assinaturasPendentes,
      });
    }
    if (estoqueBaixo > 0) {
      alertas.push({
        prefixo: PREFIXO.estoque,
        mensagem: `${PREFIXO.estoque}: ${estoqueBaixo} produto(s) com estoque igual ou abaixo de ${estoqueMinimo} unidade(s).`,
        link: "/cadastros",
        contagem: estoqueBaixo,
      });
    }

    // Janela de idempotencia (20h)
    const janela = new Date();
    janela.setHours(janela.getHours() - 20);

    let criadas = 0;
    for (const alerta of alertas) {
      for (const admin of admins) {
        const existente = await prisma.notificacao.findFirst({
          where: {
            usuarioId: admin.id,
            lida: false,
            mensagem: { startsWith: alerta.prefixo },
            criadoEm: { gte: janela },
          },
          select: { id: true },
        });
        if (existente) continue;
        await prisma.notificacao.create({
          data: { mensagem: alerta.mensagem, link: alerta.link, usuarioId: admin.id },
        });
        criadas++;
      }
    }

    console.log(
      JSON.stringify({
        job: "alertas-admin",
        parcelasVencidas,
        assinaturasPendentes,
        estoqueBaixo,
        notificacoesCriadas: criadas,
      })
    );

    return NextResponse.json({
      ok: true,
      admins: admins.length,
      alertas: { parcelasVencidas, assinaturasPendentes, estoqueBaixo },
      notificacoesCriadas: criadas,
    });
  } catch (error) {
    console.error("[alertas-admin] Erro:", error);
    return NextResponse.json({ error: "Erro ao gerar alertas admin" }, { status: 500 });
  }
}
