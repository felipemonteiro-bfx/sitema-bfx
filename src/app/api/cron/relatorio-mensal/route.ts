import { NextResponse } from "next/server";
import { autorizarCron } from "@/lib/segredo";
import { prisma } from "@/lib/db";
import { processarRelatorioMensal } from "@/lib/relatorio-mensal-service";
import { periodoAtualManausBoundaries } from "@/lib/relatorio-mensal";
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
  const force = searchParams.get("force") === "1";
  const agora = new Date();
  const hoje = hojeDataPura(agora);
  const periodo = hoje.slice(0, 7);
  const diaAtual = Number(hoje.slice(8, 10));
  const { inicio, fim } = periodoAtualManausBoundaries(agora);

  try {
    const empresas = await prisma.empresaParceira.findMany({
      select: { id: true, diaRelatorioMensal: true },
      orderBy: { id: "asc" },
    });
    const selecionadas = empresas.filter(
      (empresa) => diaEfetivoRelatorioMensal(empresa.diaRelatorioMensal) === diaAtual
    );
    const resultados = [];
    for (const empresa of selecionadas) {
      const processado = await processarRelatorioMensal({
        periodo,
        empresaId: empresa.id,
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
