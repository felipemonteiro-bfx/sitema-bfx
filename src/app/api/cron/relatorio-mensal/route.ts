import { NextResponse } from "next/server";
import { autorizarCron } from "@/lib/segredo";
import { prisma } from "@/lib/db";
import { processarRelatorioMensal } from "@/lib/relatorio-mensal-service";
import { periodoAtualManausBoundaries, periodoMesAnterior, resolverGruposEconomicos } from "@/lib/relatorio-mensal";
import { diaEfetivoRelatorioMensal } from "@/lib/relatorio-mensal-config";
import { hojeDataPura } from "@/lib/data-pura";
import { logCron, logCronError } from "@/lib/logger";

/**
 * GET /api/cron/relatorio-mensal
 *
 * Gera e envia o relatorio mensal de vendas por empresa parceira (PDF + XLSX anexos).
 * Agrupa empresas vinculadas (grupos economicos) para enviar UM email consolidado.
 * Idempotente: nao reenvia o periodo corrente ja enviado, salvo `?force=1`.
 * A selecao diaria respeita `diaRelatorioMensal` de cada empresa (dia 1 por padrao).
 *
 * Query params:
 *   - periodo=YYYY-MM  (execucao manual; default: mes anterior)
 *   - empresaId=N      (execucao manual para o grupo que contem a empresa)
 *   - force=1          (ignora idempotencia)
 *
 * Requer header Authorization: Bearer $CRON_SECRET.
 */
export async function GET(req: Request) {
  // Fechado: sem CRON_SECRET nega (antes a rota passava com o segredo vazio).
  if (!autorizarCron(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const execucaoManual = ["periodo", "empresaId", "force"].some((param) => searchParams.has(param));
  const force = searchParams.get("force") === "1";
  const agora = new Date();
  const hoje = hojeDataPura(agora);

  if (execucaoManual) {
    const periodo = searchParams.get("periodo") || periodoMesAnterior(agora);
    const empresaIdParam = searchParams.get("empresaId");
    const empresaId = empresaIdParam ? Number(empresaIdParam) : undefined;
    const partes = periodo.split("-");
    if (partes.length !== 2 || partes[0]!.length !== 4 || Number.isNaN(Number(partes[0])) || Number.isNaN(Number(partes[1]))) {
      return NextResponse.json({ error: "periodo inválido (use YYYY-MM)" }, { status: 400 });
    }

    try {
      const { resultados } = await processarRelatorioMensal({ periodo, empresaId, force });
      const contagem = {
        enviado: resultados.filter((r) => r.status === "enviado").length,
        sem_vendas: resultados.filter((r) => r.status === "sem_vendas").length,
        sem_email: resultados.filter((r) => r.status === "sem_email").length,
        erro: resultados.filter((r) => r.status === "erro").length,
      };
      logCron("relatorio-mensal", "concluido", { periodo, total: resultados.length, ...contagem });
      return NextResponse.json({ ok: true, periodo, contagem, resultados });
    } catch (error) {
      logCronError("relatorio-mensal", "erro_geral", error, { periodo });
      return NextResponse.json({ error: "Erro ao processar relatorio mensal" }, { status: 500 });
    }
  }

  const periodo = hoje.slice(0, 7);
  const diaAtual = Number(hoje.slice(8, 10));
  const ultimoDiaDoMes = new Date(Date.UTC(Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)), 0)).getUTCDate();
  const { inicio, fim } = periodoAtualManausBoundaries(agora);

  try {
    const empresas = await prisma.empresaParceira.findMany({
      select: {
        id: true,
        nome: true,
        emailRh: true,
        emailsExtras: true,
        telefoneRh: true,
        diaRelatorioMensal: true,
      },
      orderBy: { id: "asc" },
    });
    const vinculos = await prisma.empresaVinculo.findMany({
      select: { empresaId: true, vinculadaId: true },
    });
    const diasPorEmpresa = new Map(empresas.map((empresa) => [empresa.id, empresa.diaRelatorioMensal]));
    const selecionadas = resolverGruposEconomicos(empresas, vinculos).filter((grupo) => {
      const menorDiaEfetivo = Math.min(
        ...grupo.empresaIds.map((id) => diaEfetivoRelatorioMensal(diasPorEmpresa.get(id), ultimoDiaDoMes))
      );
      return menorDiaEfetivo === diaAtual;
    });
    const resultados = [];
    for (const grupo of selecionadas) {
      const processado = await processarRelatorioMensal({
        periodo,
        empresaId: grupo.canonica.id,
        force,
        inicio,
        fim,
      });
      resultados.push(...processado.resultados);
    }
    const contagem = {
      enviado: resultados.filter((r) => r.status === "enviado").length,
      sem_vendas: resultados.filter((r) => r.status === "sem_vendas").length,
      sem_email: resultados.filter((r) => r.status === "sem_email").length,
      erro: resultados.filter((r) => r.status === "erro").length,
    };
    logCron("relatorio-mensal", "concluido", {
      periodo,
      empresas: selecionadas.length,
      total: resultados.length,
      ...contagem,
    });
    return NextResponse.json({ ok: true, periodo, empresas: selecionadas.length, contagem, resultados });
  } catch (error) {
    logCronError("relatorio-mensal", "erro_geral", error, { periodo });
    return NextResponse.json({ error: "Erro ao processar relatorio mensal" }, { status: 500 });
  }
}
