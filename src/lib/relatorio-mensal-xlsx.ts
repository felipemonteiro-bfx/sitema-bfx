/**
 * Gera o XLSX (SpreadsheetML/XML, sem dependencia externa) do relatorio mensal
 * por empresa. Segue o mesmo padrao de `src/app/api/relatorios/vendas-xlsx/route.ts`,
 * incluindo o `escapeXml` com `.split().join()` (o hook de seguranca bloqueia RegExp.exec).
 *
 * Duas planilhas:
 *  - "Vendas do Mes": uma linha por venda (colaborador, matricula, data, produtos, valor, forma).
 *  - "Desconto em Folha": uma linha por parcela das vendas via desconto em folha.
 */
import { formaPagamentoLabel } from "@/lib/forma-pagamento";
import type { RelatorioMensalData } from "@/lib/relatorio-mensal";
import type { LinhaProdutoRelatorio } from "@/lib/relatorio-mensal-produtos";

export const RELATORIO_MENSAL_XLS_MIME = "application/vnd.ms-excel";

export const CABECALHOS_PLANILHA_MENSAL = [
  "Nome",
  "CPF",
  "Empresa",
  "Data da Compra",
  "Produto",
  "Valor da Parcela",
  "Parcela",
  "Data de Desconto",
] as const;

export function escapeXml(value: string): string {
  return value
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;")
    .split('"').join("&quot;")
    .split("'").join("&apos;");
}

export function cellStr(value: string): string {
  return `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}
export function cellStrBold(value: string): string {
  return `<Cell ss:StyleID="bold"><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}
export function cellNum(value: number): string {
  return `<Cell><Data ss:Type="Number">${value.toFixed(2)}</Data></Cell>`;
}
function cellNumBold(value: number): string {
  return `<Cell ss:StyleID="bold"><Data ss:Type="Number">${value.toFixed(2)}</Data></Cell>`;
}

function nomeAbaCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split("-");
  const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];
  return `${meses[Number(mes) - 1] ?? mes}-${ano}`;
}

function linhaProduto(linha: LinhaProdutoRelatorio): string {
  return `<Row>${[
    cellStr(linha.nome),
    cellStr(linha.cpf),
    cellStr(linha.empresa),
    cellStr(linha.dataCompra),
    cellStr(linha.produto),
    cellNum(linha.valorAcumulado),
    cellStr(linha.parcela),
    cellStr(linha.dataDesconto),
  ].join("")}</Row>`;
}

/** Gera o primeiro anexo mensal no layout XML do modelo de antecipacao. */
export function gerarPlanilhaAntecipacao(
  linhas: LinhaProdutoRelatorio[],
  competencia: string
): Buffer {
  const cabecalho = `<Row>${CABECALHOS_PLANILHA_MENSAL.map(cellStrBold).join("")}</Row>`;
  const dados = linhas.map(linhaProduto).join("\n");
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
<Worksheet ss:Name="${escapeXml(nomeAbaCompetencia(competencia))}">
<Table>
${cabecalho}
${dados}
</Table>
</Worksheet>
</Workbook>`;

  return Buffer.from(xml, "utf-8");
}

function sheetVendas(dados: RelatorioMensalData): string {
  const headers = ["Colaborador", "Matricula", "Data", "Produtos", "Valor Total", "Forma Pagamento", "Parcelas"];
  const headerRow = `<Row>${headers.map(cellStrBold).join("")}</Row>`;

  const dataRows = dados.linhas
    .map((l) =>
      `<Row>${[
        cellStr(l.colaborador),
        cellStr(l.matricula),
        cellStr(l.data),
        cellStr(l.produtos),
        cellNum(l.valor),
        cellStr(formaPagamentoLabel(l.formaPagamento)),
        cellStr(l.parcelasTexto),
      ].join("")}</Row>`
    )
    .join("\n");

  const totalRow = `<Row>${[
    cellStrBold("TOTAL"),
    `<Cell/>`,
    `<Cell/>`,
    `<Cell/>`,
    cellNumBold(dados.valorTotal),
    `<Cell/>`,
    `<Cell/>`,
  ].join("")}</Row>`;

  return `<Worksheet ss:Name="Vendas do Mes">
<Table>
${headerRow}
${dataRows}
${totalRow}
</Table>
</Worksheet>`;
}

function sheetDescontoFolha(dados: RelatorioMensalData): string {
  const headers = ["Colaborador", "Matricula", "No Parcela", "Valor", "Vencimento"];
  const headerRow = `<Row>${headers.map(cellStrBold).join("")}</Row>`;

  const linhasFolha = dados.linhas.filter((l) => l.descontoEmFolha);
  const rows: string[] = [];
  let totalFolha = 0;
  for (const l of linhasFolha) {
    if (l.parcelas.length === 0) {
      // venda sem cronograma detalhado: uma linha com o valor cheio
      rows.push(
        `<Row>${[
          cellStr(l.colaborador),
          cellStr(l.matricula),
          cellStr("—"),
          cellNum(l.valor),
          cellStr(l.data),
        ].join("")}</Row>`
      );
      totalFolha += l.valor;
      continue;
    }
    for (const p of l.parcelas) {
      rows.push(
        `<Row>${[
          cellStr(l.colaborador),
          cellStr(l.matricula),
          cellStr(String(p.numero)),
          cellNum(p.valor),
          cellStr(p.vencimento),
        ].join("")}</Row>`
      );
      totalFolha += p.valor;
    }
  }

  const totalRow = `<Row>${[
    cellStrBold("TOTAL"),
    `<Cell/>`,
    `<Cell/>`,
    cellNumBold(totalFolha),
    `<Cell/>`,
  ].join("")}</Row>`;

  return `<Worksheet ss:Name="Desconto em Folha">
<Table>
${headerRow}
${rows.join("\n")}
${totalRow}
</Table>
</Worksheet>`;
}

/** Gera o conteudo XLSX (SpreadsheetML) do relatorio mensal como Buffer. */
export function gerarRelatorioMensalXlsx(dados: RelatorioMensalData): Buffer {
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
${sheetVendas(dados)}
${sheetDescontoFolha(dados)}
</Workbook>`;

  return Buffer.from(xml, "utf-8");
}
