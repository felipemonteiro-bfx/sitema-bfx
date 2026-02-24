import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const idsStr = searchParams.get("ids");

  if (!idsStr) {
    return NextResponse.json({ error: "Nenhum ID fornecido" }, { status: 400 });
  }

  const ids = idsStr.split(",").map(Number);

  try {
    const vendas = await prisma.venda.findMany({
      where: { id: { in: ids } },
      include: {
        cliente: {
          select: {
            nome: true,
            cpf: true,
            cnpj: true,
            email: true,
            empresa: true,
          },
        },
      },
      orderBy: { dataVenda: "desc" },
    });

    let csv =
      "\uFEFFNome do Cliente,Documento (CPF/CNPJ),Email,Empresa Conveniada,Produto,Valor Total,Parcelas,Valor da Parcela,Data da Venda\n";

    let totalGeral = 0;
    const totaisPorEmpresa: Record<string, number> = {};

    vendas.forEach((v) => {
      const doc = v.cliente?.cpf || v.cliente?.cnpj || "N/D";
      const email = v.cliente?.email || "N/D";
      const empresa = v.cliente?.empresa || "Sem empresa";
      const valorTotal = (v.valorVenda || 0) + (v.valorFrete || 0);

      totalGeral += valorTotal;
      totaisPorEmpresa[empresa] = (totaisPorEmpresa[empresa] || 0) + valorTotal;

      const row = [
        `"${v.cliente?.nome || "N/D"}"`,
        `"${doc}"`,
        `"${email}"`,
        `"${empresa}"`,
        `"${v.produtoNome || "N/A"}"`,
        valorTotal.toFixed(2),
        v.parcelas || 1,
        v.valorParcela?.toFixed(2) || (valorTotal / (v.parcelas || 1)).toFixed(2),
        v.dataVenda.toISOString().split("T")[0],
      ].join(",");

      csv += row + "\n";
    });

    csv += "\n";
    csv += `TOTAL GERAL,,,,,"${totalGeral.toFixed(2)}",,,\n`;
    csv += "\n";
    csv += "--- RESUMO POR EMPRESA CONVENIADA ---\n";
    csv += "Empresa,Valor Total\n";

    Object.entries(totaisPorEmpresa)
      .sort((a, b) => b[1] - a[1])
      .forEach(([empresa, valor]) => {
        csv += `"${empresa}","${valor.toFixed(2)}"\n`;
      });

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=relatorio-financeira-${Date.now()}.csv`,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar relatório de antecipação:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
