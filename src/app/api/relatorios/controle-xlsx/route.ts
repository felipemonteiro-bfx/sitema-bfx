import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { WHERE_VENDA_ANTECIPAVEL, parsePeriodoMesAno } from "@/lib/antecipacao";
import { hojeDataPura } from "@/lib/data-pura";
import { SELECT_VENDA_PLANILHA, montarPlanilhaControle, normalizarFiltroPlanilha } from "@/lib/planilha-controle";
import { gerarXlsxPlanilhaControle } from "@/lib/xlsx/planilha-controle-xlsx";

// zlib (compressão do .xlsx) só existe no runtime Node.
export const runtime = "nodejs";

/**
 * GET /api/relatorios/controle-xlsx — a planilha de controle da antecipação no
 * formato da equipe (2026-09-11). Parâmetros: `mesInicio`/`mesFim` (MM/AAAA,
 * meses de desconto), `empresa`, `passados=0` para começar no mês de hoje.
 *
 * Só admin: é a base inteira do desconto em folha, com CPF de todos os
 * compradores. O middleware já exige sessão; aqui é o perfil.
 */
export async function GET(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Somente administradores baixam a planilha de controle." }, { status: 403 });
  }

  const params = new URL(req.url).searchParams;
  const filtro = normalizarFiltroPlanilha({
    mesInicio: params.get("mesInicio"),
    mesFim: params.get("mesFim"),
    empresa: params.get("empresa"),
    incluirPassados: params.get("passados") !== "0",
  });
  if ((filtro.mesInicio || filtro.mesFim) && !parsePeriodoMesAno(filtro.mesInicio ?? "", filtro.mesFim ?? "")) {
    return NextResponse.json({ error: "Período inválido. Use MM/AAAA." }, { status: 400 });
  }

  try {
    const vendas = await prisma.venda.findMany({
      where: WHERE_VENDA_ANTECIPAVEL,
      select: SELECT_VENDA_PLANILHA,
      orderBy: { dataVenda: "asc" },
    });
    const hoje = hojeDataPura();
    const { abas } = montarPlanilhaControle(vendas, filtro, hoje);
    const arquivo = gerarXlsxPlanilhaControle(abas);

    return new Response(arquivo, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="controle-antecipacao-bfx-${hoje}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Erro ao gerar a planilha de controle:", error);
    return NextResponse.json({ error: "Erro ao gerar a planilha." }, { status: 500 });
  }
}
