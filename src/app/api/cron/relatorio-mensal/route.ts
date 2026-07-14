import { NextResponse } from "next/server";
import { processarRelatorioMensal } from "@/lib/relatorio-mensal-service";
import { periodoMesAnterior } from "@/lib/relatorio-mensal";

/**
 * GET /api/cron/relatorio-mensal
 *
 * Gera e envia o relatorio mensal de vendas por empresa parceira (PDF + XLSX anexos).
 * Agrupa empresas vinculadas (grupos economicos) para enviar UM email consolidado.
 * Idempotente: nao reenvia um periodo ja enviado, salvo `?force=1`.
 *
 * Query params:
 *   - periodo=YYYY-MM  (default: mes anterior)
 *   - empresaId=N      (processa apenas o grupo que contem esta empresa)
 *   - force=1          (ignora idempotencia)
 *
 * Requer header Authorization: Bearer $CRON_SECRET.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const periodo = searchParams.get("periodo") || periodoMesAnterior(new Date());
  const empresaIdParam = searchParams.get("empresaId");
  const empresaId = empresaIdParam ? Number(empresaIdParam) : undefined;
  const force = searchParams.get("force") === "1";

  // Valida formato do periodo YYYY-MM
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
    console.log(
      JSON.stringify({ job: "relatorio-mensal", periodo, total: resultados.length, ...contagem })
    );
    return NextResponse.json({ ok: true, periodo, contagem, resultados });
  } catch (error) {
    console.error("[relatorio-mensal] Erro geral:", error);
    return NextResponse.json({ error: "Erro ao processar relatorio mensal" }, { status: 500 });
  }
}
