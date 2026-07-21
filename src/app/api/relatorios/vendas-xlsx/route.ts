import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { valorTotalVenda, produtosTexto, quantidadeTotal } from "@/lib/venda-utils";
import { formaPagamentoLabel, formaFromLegacyFlags, type FormaPagamento } from "@/lib/forma-pagamento";
import { getSession } from "@/lib/session";
import { resolveVendedorScope } from "@/lib/vendedor-scope";

function formatDateBR(date: Date): string {
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function escapeXml(value: string): string {
  return value
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;")
    .split('"').join("&quot;")
    .split("'").join("&apos;");
}

interface LinhaVenda {
  cliente: string;
  data: string;
  vendedor: string;
  produtos: string;
  qtd: number;
  valorTotal: number;
  parcelas: number;
  formaPagamento: string;
  status: string;
}

function buildXmlSheet(sheetName: string, linhas: LinhaVenda[]): string {
  const headers = [
    "Cliente", "Data", "Vendedor", "Produtos", "Qtd",
    "Valor Total", "Parcelas", "Forma Pagamento", "Status",
  ];

  const headerRow = headers.map((h) =>
    `<Cell ss:StyleID="bold"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`
  ).join("");

  const dataRows = linhas.map((l) => {
    const cells = [
      `<Cell><Data ss:Type="String">${escapeXml(l.cliente)}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${escapeXml(l.data)}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${escapeXml(l.vendedor)}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${escapeXml(l.produtos)}</Data></Cell>`,
      `<Cell><Data ss:Type="Number">${l.qtd}</Data></Cell>`,
      `<Cell><Data ss:Type="Number">${l.valorTotal.toFixed(2)}</Data></Cell>`,
      `<Cell><Data ss:Type="Number">${l.parcelas}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${escapeXml(l.formaPagamento)}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${escapeXml(l.status)}</Data></Cell>`,
    ];
    return `<Row>${cells.join("")}</Row>`;
  }).join("\n");

  const totalValor = linhas.reduce((sum, l) => sum + l.valorTotal, 0);
  const totaisRow = [
    `<Cell ss:StyleID="bold"><Data ss:Type="String">TOTAL</Data></Cell>`,
    `<Cell/>`,
    `<Cell/>`,
    `<Cell/>`,
    `<Cell/>`,
    `<Cell ss:StyleID="bold"><Data ss:Type="Number">${totalValor.toFixed(2)}</Data></Cell>`,
    `<Cell/>`,
    `<Cell/>`,
    `<Cell/>`,
  ].join("");

  return `<Worksheet ss:Name="${escapeXml(sheetName)}">
<Table>
<Row>${headerRow}</Row>
${dataRows}
<Row>${totaisRow}</Row>
</Table>
</Worksheet>`;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const today = new Date();
  const fromStr = searchParams.get("from") || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const toStr = searchParams.get("to") || today.toISOString().slice(0, 10);
  const vendedor = resolveVendedorScope(searchParams.get("vendedor") || undefined, session);
  const clienteId = searchParams.get("cliente") || undefined;
  const produto = searchParams.get("produto") || undefined;
  const formaPagamentoFilter = searchParams.get("formaPagamento") || undefined;

  // Parse dates — local time boundaries matching historico page logic
  function parseDateStart(dateStr: string): Date {
    const parts = dateStr.split("-").map(Number);
    return new Date(parts[0]!, (parts[1] ?? 1) - 1, parts[2] ?? 1, 0, 0, 0, 0);
  }
  function parseDateEnd(dateStr: string): Date {
    const parts = dateStr.split("-").map(Number);
    return new Date(parts[0]!, (parts[1] ?? 1) - 1, parts[2] ?? 1, 23, 59, 59, 999);
  }

  const start = parseDateStart(fromStr);
  const end = parseDateEnd(toStr);

  const where = {
    dataVenda: { gte: start, lte: end },
    vendedor: vendedor && vendedor !== "all" ? vendedor : undefined,
    ...(produto && produto !== "all"
      ? {
          OR: [
            { produtoNome: produto },
            { itens: { some: { produtoNome: produto } } },
          ],
        }
      : {}),
    clienteId: clienteId && clienteId !== "all" ? Number(clienteId) : undefined,
    formaPagamento: formaPagamentoFilter && formaPagamentoFilter !== "all" ? formaPagamentoFilter : undefined,
  };

  try {
    const vendas = await prisma.venda.findMany({
      where,
      orderBy: [{ dataVenda: "desc" }, { id: "desc" }],
      select: {
        id: true,
        dataVenda: true,
        vendedor: true,
        produtoNome: true,
        quantidade: true,
        valorVenda: true,
        valorFrete: true,
        desconto: true,
        descontoEmFolha: true,
        boleto: true,
        formaPagamento: true,
        parcelas: true,
        status: true,
        cliente: { select: { nome: true } },
        itens: { select: { produtoNome: true, quantidade: true, subtotal: true } },
      },
    });

    const linhas: LinhaVenda[] = vendas.map((v) => {
      const forma = (v.formaPagamento as FormaPagamento | null) ??
        formaFromLegacyFlags({
          descontoEmFolha: v.descontoEmFolha ?? undefined,
          boleto: v.boleto ?? undefined,
        });

      return {
        cliente: v.cliente?.nome || "N/D",
        data: formatDateBR(v.dataVenda),
        vendedor: v.vendedor || "",
        produtos: produtosTexto(v),
        qtd: quantidadeTotal(v),
        valorTotal: valorTotalVenda(v),
        parcelas: v.parcelas || 1,
        formaPagamento: formaPagamentoLabel(forma),
        status: v.status || "",
      };
    });

    const sheet = buildXmlSheet("Vendas", linhas);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
<Styles>
  <Style ss:ID="bold">
    <Font ss:Bold="1"/>
  </Style>
</Styles>
${sheet}
</Workbook>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/vnd.ms-excel",
        "Content-Disposition": `attachment; filename=vendas-${fromStr}-a-${toStr}.xls`,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar planilha de vendas:", error);
    return NextResponse.json({ error: "Erro ao gerar planilha." }, { status: 500 });
  }
}
