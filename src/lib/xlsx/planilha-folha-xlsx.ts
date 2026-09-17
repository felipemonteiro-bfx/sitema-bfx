/**
 * O .xlsx da planilha da folha (2026-09-17), no layout do modelo "02- Planilha"
 * do Domínio: cabeçalho da empresa nas linhas 1–6, colunas nas linhas 9–10 com
 * o código do evento, colaboradores a partir da linha 11 e o TOTAL no fim. Só a
 * coluna do BFX (Desconto de Produto), para colar na planilha do mês.
 */
import { EVENTO_DESCONTO_PRODUTO, type PlanilhaFolha } from "@/lib/planilha-folha";
import { Grade, empacotarXlsx, serialExcel } from "@/lib/xlsx/pacote-xlsx";

/** Tipo de cálculo do Domínio: 11 = Folha Mensal. */
const TIPO_CALCULO_FOLHA_MENSAL = 11;
const PRIMEIRA_LINHA = 11;

/** Índices em `cellXfs` (ver ESTILOS). */
const S = { negrito: 1, texto: 2, competencia: 3, moeda: 4, matricula: 5, semMatricula: 6, totalMoeda: 7, matriculaNumero: 8 } as const;

const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="mm/yyyy"/><numFmt numFmtId="165" formatCode="00000"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFFF00"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="9">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="49" fontId="0" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFill="1"/>
<xf numFmtId="4" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

/** Larguras do modelo do Domínio, em caracteres. */
const COLUNAS = '<col min="1" max="1" width="9.14" customWidth="1"/><col min="2" max="2" width="9" customWidth="1"/><col min="3" max="3" width="30.71" customWidth="1"/><col min="4" max="4" width="18.71" customWidth="1"/>';

export function gerarXlsxPlanilhaFolha(
  planilha: PlanilhaFolha,
  cabecalho: { razaoSocial: string; cnpj: string }
): Uint8Array<ArrayBuffer> {
  const grade = new Grade();

  grade.texto("A", 1, S.negrito, "RELAÇÃO DE VALORES PARA FOLHA DE PAGAMENTO");
  grade.texto("A", 3, S.negrito, "Codigo Empresa:");
  grade.texto("A", 4, S.negrito, "Razão Social:");
  grade.texto("C", 4, S.texto, cabecalho.razaoSocial);
  grade.texto("A", 5, S.negrito, "Inscrição Cnpj:");
  grade.texto("C", 5, S.texto, cabecalho.cnpj);
  grade.texto("A", 6, S.negrito, "Competencia:");
  grade.numero("C", 6, S.competencia, serialExcel(`${planilha.competencia}-01`));
  grade.mesclas.push("A3:B3", "A4:B4", "C4:D4", "A5:B5", "A6:B6");

  grade.texto("A", 9, S.negrito, "Tipo de");
  grade.texto("B", 9, S.negrito, "Código");
  grade.texto("C", 9, S.negrito, "Nome dos");
  grade.texto("D", 9, S.negrito, EVENTO_DESCONTO_PRODUTO.nome);
  grade.texto("A", 10, S.negrito, "Calculo");
  grade.texto("B", 10, S.negrito, "Folha");
  grade.texto("C", 10, S.negrito, "Colaboradores");
  grade.numero("D", 10, S.negrito, EVENTO_DESCONTO_PRODUTO.codigo);

  planilha.linhas.forEach((linha, i) => {
    const n = PRIMEIRA_LINHA + i;
    grade.numero("A", n, S.texto, TIPO_CALCULO_FOLHA_MENSAL);
    // No modelo do Domínio a matrícula é número no formato 00000; com letra
    // (ou com 15+ dígitos, que o número da célula não guarda exato) fica como texto.
    if (/^\d{1,14}$/.test(linha.matricula)) grade.numero("B", n, S.matriculaNumero, Number(linha.matricula));
    else if (linha.matricula) grade.texto("B", n, S.matricula, linha.matricula);
    else grade.vazia("B", n, S.semMatricula);
    grade.texto("C", n, S.texto, linha.nome);
    grade.numero("D", n, S.moeda, linha.valor);
  });

  const total = PRIMEIRA_LINHA + planilha.linhas.length;
  grade.texto("A", total, S.negrito, "TOTAL");
  grade.numero("B", total, S.negrito, planilha.linhas.length);
  grade.texto("C", total, S.negrito, "Colaboradores");
  if (planilha.linhas.length > 0) grade.formula("D", total, S.totalMoeda, `SUM(D${PRIMEIRA_LINHA}:D${total - 1})`, planilha.total);
  else grade.numero("D", total, S.totalMoeda, 0);

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetFormatPr defaultRowHeight="15"/>
<cols>${COLUNAS}</cols>
<sheetData>${grade.xml()}</sheetData>
<mergeCells count="${grade.mesclas.length}">${grade.mesclas.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>
</worksheet>`;

  return empacotarXlsx([{ nome: "PLANILHA", xml }], ESTILOS);
}
