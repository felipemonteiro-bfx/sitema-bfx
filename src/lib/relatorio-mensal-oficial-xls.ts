import type { LinhaProdutoRelatorio } from "@/lib/relatorio-mensal-produtos";
import {
  CABECALHOS_PLANILHA_MENSAL,
  cellNum,
  cellStr,
  escapeXml,
} from "@/lib/relatorio-mensal-xlsx";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function rotuloCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split("-");
  return `${MESES[Number(mes) - 1] ?? mes}/${ano}`;
}

function celulaCabecalho(value: string): string {
  return `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
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

/** Fonte de verdade autocontida do segundo anexo no layout oficial aprovado. */
export function gerarPlanilhaModeloOficial(
  linhas: LinhaProdutoRelatorio[],
  competencia: string
): Buffer {
  const cabecalho = `<Row ss:Height="30">${CABECALHOS_PLANILHA_MENSAL.map(celulaCabecalho).join("")}</Row>`;
  const dados = linhas.map(linhaProduto).join("\n");
  const competenciaLabel = `Competência: ${rotuloCompetencia(competencia)}`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
<Styles>
  <Style ss:ID="Default" ss:Name="Normal">
    <Alignment ss:Vertical="Center"/>
    <Font ss:FontName="Arial" ss:Size="10"/>
  </Style>
  <Style ss:ID="title">
    <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    <Font ss:FontName="Arial" ss:Size="12" ss:Bold="1"/>
  </Style>
  <Style ss:ID="competencia">
    <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/>
  </Style>
  <Style ss:ID="header">
    <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
    <Borders>
      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
    </Borders>
    <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
    <Interior ss:Color="#1F4E78" ss:Pattern="Solid"/>
  </Style>
</Styles>
<Worksheet ss:Name="PLANILHA">
<Table>
<Column ss:Width="150"/>
<Column ss:Width="90"/>
<Column ss:Width="110"/>
<Column ss:Width="110"/>
<Column ss:Width="210"/>
<Column ss:Width="90"/>
<Column ss:Width="80"/>
<Column ss:Width="120"/>
<Row ss:Height="22"><Cell ss:StyleID="title" ss:MergeAcross="7"><Data ss:Type="String">RELAÇÃO DE VALORES PARA FOLHA DE PAGAMENTO</Data></Cell></Row>
<Row><Cell ss:StyleID="competencia" ss:MergeAcross="7"><Data ss:Type="String">${escapeXml(competenciaLabel)}</Data></Cell></Row>
${cabecalho}
${dados}
</Table>
<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
  <FreezePanes/>
  <FrozenNoSplit/>
  <SplitHorizontal>3</SplitHorizontal>
  <TopRowBottomPane>3</TopRowBottomPane>
</WorksheetOptions>
</Worksheet>
</Workbook>`;

  return Buffer.from(xml, "utf-8");
}
