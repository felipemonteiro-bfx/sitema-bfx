/**
 * Gera o XLSX (SpreadsheetML/XML, sem dependencia externa) do relatorio mensal
 * por empresa. Segue o mesmo padrao de `src/app/api/relatorios/vendas-xlsx/route.ts`,
 * incluindo o `escapeXml` com `.split().join()` (o hook de seguranca bloqueia RegExp.exec).
 *
 * Duas planilhas:
 *  - "Vendas do Mes": uma linha por venda (colaborador, matricula, data, produtos, valor, forma).
 *  - "Desconto em Folha": uma linha por parcela das vendas via desconto em folha.
 *
 * O anexo de antecipacao enviado ao RH (`gerarPlanilhaAntecipacao`) e um .xlsx de
 * verdade: o Gmail e o Planilhas Google nao abrem o XML Spreadsheet 2003.
 */
import { formaPagamentoLabel } from "@/lib/forma-pagamento";
import type { RelatorioMensalData } from "@/lib/relatorio-mensal";
import type { LinhaProdutoRelatorio } from "@/lib/relatorio-mensal-produtos";
import { Grade, empacotarXlsx } from "@/lib/xlsx/pacote-xlsx";

export const RELATORIO_MENSAL_XLS_MIME = "application/vnd.ms-excel";
export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

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

/** Colunas A–H das duas planilhas mensais, na ordem de `CABECALHOS_PLANILHA_MENSAL`. */
export const COLUNAS_PLANILHA_MENSAL = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

/** Escreve uma linha por produto consolidado a partir de `primeiraLinha`. */
export function preencherLinhasProduto(
  grade: Grade,
  linhas: LinhaProdutoRelatorio[],
  primeiraLinha: number,
  estilo: { texto: number; numero: number }
): void {
  linhas.forEach((linha, i) => {
    const n = primeiraLinha + i;
    const [a, b, c, d, e, f, g, h] = COLUNAS_PLANILHA_MENSAL;
    grade.texto(a, n, estilo.texto, linha.nome);
    grade.texto(b, n, estilo.texto, linha.cpf);
    grade.texto(c, n, estilo.texto, linha.empresa);
    grade.texto(d, n, estilo.texto, linha.dataCompra);
    grade.texto(e, n, estilo.texto, linha.produto);
    grade.numero(f, n, estilo.numero, linha.valorAcumulado);
    grade.texto(g, n, estilo.texto, linha.parcela);
    grade.texto(h, n, estilo.texto, linha.dataDesconto);
  });
}

/** Índices em `cellXfs` de ESTILOS_ANTECIPACAO. */
const S_ANTECIPACAO = { negrito: 1, texto: 0, numero: 2 } as const;

const ESTILOS_ANTECIPACAO = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

/** Primeiro anexo (.xlsx): aba da competencia, cabecalho em negrito e uma linha por produto. */
export function gerarPlanilhaAntecipacao(
  linhas: LinhaProdutoRelatorio[],
  competencia: string
): Uint8Array<ArrayBuffer> {
  const grade = new Grade();
  CABECALHOS_PLANILHA_MENSAL.forEach((cabecalho, i) =>
    grade.texto(COLUNAS_PLANILHA_MENSAL[i], 1, S_ANTECIPACAO.negrito, cabecalho)
  );
  preencherLinhasProduto(grade, linhas, 2, S_ANTECIPACAO);

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetData>${grade.xml()}</sheetData>
</worksheet>`;

  return empacotarXlsx([{ nome: nomeAbaCompetencia(competencia), xml }], ESTILOS_ANTECIPACAO);
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
