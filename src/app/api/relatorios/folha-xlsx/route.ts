import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { WHERE_VENDA_ANTECIPAVEL } from "@/lib/antecipacao";
import { formatarDocumento } from "@/lib/planilha-controle";
import { SELECT_VENDA_FOLHA, montarPlanilhaFolha, normalizarCompetencia } from "@/lib/planilha-folha";
import { gerarXlsxPlanilhaFolha } from "@/lib/xlsx/planilha-folha-xlsx";

// zlib (compressão do .xlsx) só existe no runtime Node.
export const runtime = "nodejs";

/**
 * GET /api/relatorios/folha-xlsx — a coluna "Desconto de Produto" (evento 5002)
 * da planilha que vai ao Domínio (2026-09-17). Parâmetros obrigatórios:
 * `competencia` (MM/AAAA) e `empresa`. O arquivo do Domínio é por empresa e a
 * matrícula é numerada por empresa: juntar empresas colaria o desconto de um
 * funcionário no de outro com a mesma matrícula.
 *
 * Só admin: tem matrícula e valor descontado de cada comprador. O middleware já
 * exige sessão; aqui é o perfil.
 */
export async function GET(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Somente administradores baixam a planilha da folha." }, { status: 403 });
  }

  const params = new URL(req.url).searchParams;
  const competencia = normalizarCompetencia(params.get("competencia"));
  if (!competencia) {
    return NextResponse.json({ error: "Competência inválida. Use MM/AAAA." }, { status: 400 });
  }
  const empresa = params.get("empresa")?.trim() ?? "";
  if (!empresa || empresa === "todas") {
    return NextResponse.json({ error: "Escolha a empresa." }, { status: 400 });
  }

  try {
    const [vendas, parceira] = await Promise.all([
      prisma.venda.findMany({ where: WHERE_VENDA_ANTECIPAVEL, select: SELECT_VENDA_FOLHA, orderBy: { dataVenda: "asc" } }),
      prisma.empresaParceira.findFirst({ where: { nome: { equals: empresa, mode: "insensitive" } }, select: { nome: true, cnpj: true } }),
    ]);
    const planilha = montarPlanilhaFolha(vendas, { competencia, empresa });
    const arquivo = gerarXlsxPlanilhaFolha(planilha, {
      razaoSocial: parceira?.nome ?? empresa,
      cnpj: formatarDocumento(parceira?.cnpj),
    });

    return new Response(arquivo, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="folha-desconto-produto-${competencia}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Erro ao gerar a planilha da folha:", error);
    return NextResponse.json({ error: "Erro ao gerar a planilha." }, { status: 500 });
  }
}
