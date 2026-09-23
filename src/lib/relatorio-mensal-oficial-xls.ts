import type { LinhaProdutoRelatorio } from "@/lib/relatorio-mensal-produtos";
import {
  CABECALHOS_PLANILHA_MENSAL,
  COLUNAS_PLANILHA_MENSAL,
  preencherLinhasProduto,
} from "@/lib/relatorio-mensal-xlsx";
import { Grade, empacotarXlsx } from "@/lib/xlsx/pacote-xlsx";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function rotuloCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split("-");
  return `${MESES[Number(mes) - 1] ?? mes}/${ano}`;
}

/** Índices em `cellXfs` (ver ESTILOS). */
const S = { texto: 0, titulo: 1, competencia: 2, cabecalho: 3, numero: 4 } as const;

const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="4"><font><sz val="10"/><name val="Arial"/><family val="2"/></font><font><b/><sz val="12"/><name val="Arial"/><family val="2"/></font><font><b/><sz val="10"/><name val="Arial"/><family val="2"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/><family val="2"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F4E78"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="5">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="center"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

/** Larguras do layout aprovado, em pontos, convertidas para caracteres: (pt × 4/3 − 5) / 7. */
const LARGURAS_PONTOS = [150, 90, 110, 110, 210, 90, 80, 120];
const LARGURAS = LARGURAS_PONTOS.map((pt) => Math.round(((pt * 4) / 3 - 5) / 7 * 100) / 100);
const COLUNAS = LARGURAS.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("");

/** Segundo anexo (.xlsx) no layout oficial aprovado: titulo, competencia, cabecalho congelado. */
export function gerarPlanilhaModeloOficial(
  linhas: LinhaProdutoRelatorio[],
  competencia: string
): Uint8Array<ArrayBuffer> {
  const grade = new Grade();

  grade.texto("A", 1, S.titulo, "RELAÇÃO DE VALORES PARA FOLHA DE PAGAMENTO");
  grade.altura(1, 22);
  grade.texto("A", 2, S.competencia, `Competência: ${rotuloCompetencia(competencia)}`);
  grade.mesclas.push("A1:H1", "A2:H2");

  CABECALHOS_PLANILHA_MENSAL.forEach((cabecalho, i) =>
    grade.texto(COLUNAS_PLANILHA_MENSAL[i], 3, S.cabecalho, cabecalho)
  );
  grade.altura(3, 30);
  preencherLinhasProduto(grade, linhas, 4, S);

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="13"/>
<cols>${COLUNAS}</cols>
<sheetData>${grade.xml()}</sheetData>
<mergeCells count="${grade.mesclas.length}">${grade.mesclas.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>
</worksheet>`;

  return empacotarXlsx([{ nome: "PLANILHA", xml }], ESTILOS);
}
