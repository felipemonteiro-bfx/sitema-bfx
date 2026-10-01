import { NextResponse } from "next/server";
import { autorizarCron } from "@/lib/segredo";
import { prisma } from "@/lib/db";
import { logCron, logCronError } from "@/lib/logger";
import { hojeDataPura } from "@/lib/data-pura";
import { PREFIXO_BOLETO, STATUS_ALERTAVEIS, alertasDeBoletos } from "@/lib/alertas-obrigacoes";
import { alertaPixAtrasado, emailPixAtrasado, pixAtrasados } from "@/lib/pix-fechamento";
import { lerFechamentosComPix } from "@/lib/fechamento-leitura";
import { sendEmail } from "@/lib/email";

/**
 * GET /api/cron/alertas-admin
 *
 * Cria notificacoes internas (in-app) para todos os usuarios admin sobre pendencias
 * operacionais: parcelas vencidas, assinaturas pendentes ha muito tempo, estoque baixo e, desde
 * a Fase 4 (2026-09-30), boletos Prudent que a BFX paga vencendo ou sem documento e, desde a Fase 6,
 * o Pix do fechamento que não entrou no dia (um alerta por fechamento, com e-mail ao financeiro).
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
  // Fechado: sem CRON_SECRET nega (antes a rota passava com o segredo vazio).
  if (!autorizarCron(req)) {
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

    // 4. Boletos Prudent que a BFX paga (Fase 4). "Hoje" e a data pura em Manaus, como o
    // vencimento gravado; o servidor em UTC viraria o dia as 20h.
    const boletos = await prisma.boletoPrudent.findMany({
      where: { direcionamento: "bfx", status: { in: STATUS_ALERTAVEIS } },
      select: {
        status: true,
        direcionamento: true,
        vencimento: true,
        vencimentoDocumento: true,
        valorEsperado: true,
        valorDocumento: true,
        pagamentos: { select: { valorPrincipal: true, estornadoEm: true } },
      },
    });
    const alertasBoletos = alertasDeBoletos(boletos, new Date(`${hojeDataPura()}T00:00:00.000Z`));
    const contagemBoleto = (prefixo: string) => alertasBoletos.find((a) => a.prefixo === prefixo)?.contagem ?? 0;
    const boletosVencendo = contagemBoleto(PREFIXO_BOLETO.vencendo);
    const boletosSemDocumento = contagemBoleto(PREFIXO_BOLETO.semDocumento);

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

    alertas.push(...alertasBoletos);

    // Janela de idempotencia (20h)
    const janela = new Date();
    janela.setHours(janela.getHours() - 20);

    // 5. Pix do fechamento que nao entrou (Fase 6). Um alerta por fechamento (o prefixo leva o id).
    // O e-mail ao financeiro sai uma vez a cada 20h por fechamento: a checagem olha qualquer
    // notificacao com o prefixo na janela, lida ou nao.
    const pix = pixAtrasados(await lerFechamentosComPix(), new Date(`${hojeDataPura()}T00:00:00.000Z`));
    if (pix.length > 0) {
      const cfg = await prisma.config.findFirst({ select: { emailFinanceiro: true } });
      const emailFinanceiro = cfg?.emailFinanceiro?.trim() || null;
      for (const p of pix) {
        const alerta = alertaPixAtrasado(p);
        if (emailFinanceiro) {
          const jaAvisado = await prisma.notificacao.findFirst({
            where: { mensagem: { startsWith: alerta.prefixo }, criadoEm: { gte: janela } },
            select: { id: true },
          });
          if (!jaAvisado) {
            const email = emailPixAtrasado(p, process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ?? "");
            await sendEmail({ to: emailFinanceiro, subject: email.subject, html: email.html }).catch((e) =>
              logCronError("alertas-admin", "email_pix_atrasado", e)
            );
          }
        }
        alertas.push({ ...alerta, contagem: 1 });
      }
    }

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

    logCron("alertas-admin", "concluido", {
      parcelasVencidas,
      assinaturasPendentes,
      estoqueBaixo,
      boletosVencendo,
      boletosSemDocumento,
      pixAtrasados: pix.length,
      notificacoesCriadas: criadas,
    });

    return NextResponse.json({
      ok: true,
      admins: admins.length,
      alertas: { parcelasVencidas, assinaturasPendentes, estoqueBaixo, boletosVencendo, boletosSemDocumento, pixAtrasados: pix.length },
      notificacoesCriadas: criadas,
    });
  } catch (error) {
    logCronError("alertas-admin", "erro_geral", error);
    return NextResponse.json({ error: "Erro ao gerar alertas admin" }, { status: 500 });
  }
}
