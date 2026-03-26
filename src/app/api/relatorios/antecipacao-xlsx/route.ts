import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { valorTotalVenda } from "@/lib/venda-utils";

function formatDateBR(date: Date): string {
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function ultimoDiaDoMes(year: number, month: number): Date {
  // month is 0-based
  return new Date(Date.UTC(year, month + 1, 0));
}

function mesAnoLabel(year: number, month: number): string {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${meses[month]}-${year}`;
}

function escapeXml(value: string): string {
  return value
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('&quot;')
    .split("'").join('&apos;');
}

interface LinhaAba {
  nome: string;
  cpf: string;
  empresa: string;
  dataCompra: string;
  produto: string;
  valorParcela: number;
  numeroParcela: number;
  dataDesconto: string;
}

function buildXmlSheet(sheetName: string, linhas: LinhaAba[]): string {
  const headers = [
    'Nome', 'CPF', 'Empresa', 'Data da Compra',
    'Produto', 'Valor da Parcela', 'Parcela', 'Data de Desconto',
  ];

  const headerRow = headers.map((h) =>
    `<Cell ss:StyleID="bold"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`
  ).join('');

  const dataRows = linhas.map((l) => {
    const cells = [
      `<Cell><Data ss:Type="String">${escapeXml(l.nome)}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${escapeXml(l.cpf)}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${escapeXml(l.empresa)}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${escapeXml(l.dataCompra)}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${escapeXml(l.produto)}</Data></Cell>`,
      `<Cell><Data ss:Type="Number">${l.valorParcela.toFixed(2)}</Data></Cell>`,
      `<Cell><Data ss:Type="Number">${l.numeroParcela}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${escapeXml(l.dataDesconto)}</Data></Cell>`,
    ];
    return `<Row>${cells.join('')}</Row>`;
  }).join('\n');

  return `<Worksheet ss:Name="${escapeXml(sheetName)}">
<Table>
<Row>${headerRow}</Row>
${dataRows}
</Table>
</Worksheet>`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const idsStr = searchParams.get("ids");

  if (!idsStr) {
    return NextResponse.json({ error: "Nenhum ID fornecido" }, { status: 400 });
  }

  const ids = idsStr.split(",").map(Number).filter((n) => !isNaN(n));
  if (ids.length === 0) {
    return NextResponse.json({ error: "IDs inválidos" }, { status: 400 });
  }

  try {
    const vendas = await prisma.venda.findMany({
      where: { id: { in: ids } },
      include: {
        cliente: {
          select: {
            nome: true,
            cpf: true,
            cnpj: true,
            empresa: true,
          },
        },
        itens: { select: { produtoNome: true, quantidade: true, subtotal: true } },
        parcelasVencimento: {
          select: {
            numeroParcela: true,
            dataVencimento: true,
            valorParcela: true,
          },
          orderBy: { numeroParcela: 'asc' },
        },
      },
      orderBy: { dataVenda: 'desc' },
    });

    // Agrupar linhas por mes/ano da dataVencimento da parcela
    const abasPorMes: Map<string, { sortKey: string; linhas: LinhaAba[] }> = new Map();

    for (const venda of vendas) {
      const clienteNome = venda.cliente?.nome || 'N/D';
      const clienteDoc = venda.cliente?.cpf || venda.cliente?.cnpj || 'N/D';
      const clienteEmpresa = venda.cliente?.empresa || 'Sem empresa';
      const dataCompra = formatDateBR(venda.dataVenda);

      // Produto: usar produtoNome da venda ou combinar itens
      let produto = venda.produtoNome || '';
      if (!produto && venda.itens.length > 0) {
        produto = venda.itens.map((i) => {
          const qty = i.quantidade && i.quantidade > 1 ? `${i.quantidade}x ` : '';
          return `${qty}${i.produtoNome || ''}`;
        }).join(', ');
      }

      const totalVenda = valorTotalVenda(venda);

      if (venda.parcelasVencimento.length > 0) {
        // Usar parcelas reais
        for (const parcela of venda.parcelasVencimento) {
          const d = new Date(parcela.dataVencimento);
          const year = d.getUTCFullYear();
          const month = d.getUTCMonth();
          const mesAno = mesAnoLabel(year, month);
          const sortKey = `${year}-${String(month + 1).padStart(2, '0')}`;
          const ultimoDia = ultimoDiaDoMes(year, month);
          const dataDesconto = formatDateBR(ultimoDia);

          if (!abasPorMes.has(mesAno)) {
            abasPorMes.set(mesAno, { sortKey, linhas: [] });
          }
          abasPorMes.get(mesAno)!.linhas.push({
            nome: clienteNome,
            cpf: clienteDoc,
            empresa: clienteEmpresa,
            dataCompra,
            produto,
            valorParcela: parcela.valorParcela,
            numeroParcela: parcela.numeroParcela,
            dataDesconto,
          });
        }
      } else {
        // Sem parcelas cadastradas: estimar baseado em dataVenda + numero de parcelas
        const numParcelas = venda.parcelas || 1;
        const valorParcela = venda.valorParcela ?? (totalVenda / numParcelas);
        const dataBase = new Date(venda.dataVenda);

        for (let i = 0; i < numParcelas; i++) {
          const d = new Date(Date.UTC(
            dataBase.getUTCFullYear(),
            dataBase.getUTCMonth() + i + 1,
            dataBase.getUTCDate(),
          ));
          const year = d.getUTCFullYear();
          const month = d.getUTCMonth();
          const mesAno = mesAnoLabel(year, month);
          const sortKey = `${year}-${String(month + 1).padStart(2, '0')}`;
          const ultimoDia = ultimoDiaDoMes(year, month);
          const dataDesconto = formatDateBR(ultimoDia);

          if (!abasPorMes.has(mesAno)) {
            abasPorMes.set(mesAno, { sortKey, linhas: [] });
          }
          abasPorMes.get(mesAno)!.linhas.push({
            nome: clienteNome,
            cpf: clienteDoc,
            empresa: clienteEmpresa,
            dataCompra,
            produto,
            valorParcela,
            numeroParcela: i + 1,
            dataDesconto,
          });
        }
      }
    }

    // Ordenar abas por mes/ano
    const abasOrdenadas = Array.from(abasPorMes.entries())
      .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey));

    const sheets = abasOrdenadas.map(([mesAno, { linhas }]) =>
      buildXmlSheet(mesAno, linhas)
    ).join('\n');

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
${sheets}
</Workbook>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/vnd.ms-excel",
        "Content-Disposition": `attachment; filename=antecipacao-${Date.now()}.xls`,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar planilha de antecipação:", error);
    return NextResponse.json({ error: "Erro ao gerar planilha." }, { status: 500 });
  }
}
