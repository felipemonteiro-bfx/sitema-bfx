import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { celulaCsv } from "@/lib/csv";
import { produtosTexto } from "@/lib/venda-utils";
import { WHERE_VENDA_ANTECIPAVEL, parsePeriodoMesAno } from "@/lib/antecipacao";

export async function GET(request: NextRequest) {
  // Só admin (a fila /prudent é só admin): o arquivo leva CPF, e-mail e valores do lote.
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Somente administradores geram o relatório de antecipação." }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const idsStr = searchParams.get("ids");

  if (!idsStr) {
    return NextResponse.json({ error: "Nenhum ID fornecido" }, { status: 400 });
  }

  // Descartar lixo, como fazem as outras duas rotas: `?ids=abc` viraria `in: [NaN]`.
  const ids = idsStr.split(",").map(Number).filter((n) => !isNaN(n));

  if (ids.length === 0) {
    return NextResponse.json({ error: "IDs inválidos" }, { status: 400 });
  }

  // Este CSV e o que vai para a financeira, e precisa descrever o mesmo lote que a
  // server action grava: so parcelas ainda nao antecipadas, dentro do periodo
  // pedido, de vendas em desconto em folha. Antes ele somava a venda inteira e
  // ignorava o periodo, entao divergia do valor mostrado na tela.
  const periodo = parsePeriodoMesAno(
    searchParams.get("mesInicio"),
    searchParams.get("mesFim")
  );

  try {
    const vendas = await prisma.venda.findMany({
      where: { id: { in: ids }, ...WHERE_VENDA_ANTECIPAVEL },
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
        itens: { select: { produtoNome: true, quantidade: true, subtotal: true } },
        parcelasVencimento: {
          where: {
            antecipada: false,
            ...(periodo ? { dataVencimento: { gte: periodo.inicio, lte: periodo.fim } } : {}),
          },
          select: { valorParcela: true },
        },
      },
      orderBy: { dataVenda: "desc" },
    });

    let csv =
      "\uFEFFNome do Cliente,Documento (CPF/CNPJ),Email,Empresa Conveniada,Produto,Valor a Antecipar,Parcelas no Lote,Valor Medio da Parcela,Data da Venda\n";

    let totalGeral = 0;
    const totaisPorEmpresa: Record<string, number> = {};

    vendas.forEach((v) => {
      const parcelasDoLote = v.parcelasVencimento;
      if (parcelasDoLote.length === 0) return; // nada a antecipar nesta venda

      const doc = v.cliente?.cpf || v.cliente?.cnpj || "N/D";
      const email = v.cliente?.email || "N/D";
      const empresa = v.cliente?.empresa || "Sem empresa";
      const valorTotal = parcelasDoLote.reduce((sum, p) => sum + p.valorParcela, 0);

      totalGeral += valorTotal;
      totaisPorEmpresa[empresa] = (totaisPorEmpresa[empresa] || 0) + valorTotal;

      // celulaCsv: aspas internas dobradas e texto que começa com = + - @ neutralizado —
      // este arquivo vai para a financeira, e um nome como =HYPERLINK(...) virava fórmula.
      const row = [
        celulaCsv(v.cliente?.nome || "N/D"),
        celulaCsv(doc),
        celulaCsv(email),
        celulaCsv(empresa),
        celulaCsv(produtosTexto(v)),
        valorTotal.toFixed(2),
        parcelasDoLote.length,
        (valorTotal / parcelasDoLote.length).toFixed(2),
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
        csv += `${celulaCsv(empresa)},${valor.toFixed(2)}\n`;
      });

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=relatorio-financeira-${Date.now()}.csv`,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar relatório de antecipação:", error);
    return NextResponse.json({ error: "Erro ao gerar relatório." }, { status: 500 });
  }
}
