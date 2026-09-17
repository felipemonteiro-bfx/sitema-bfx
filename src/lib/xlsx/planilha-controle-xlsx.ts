/**
 * O .xlsx da planilha de controle (2026-09-11), com as medidas da aba AGOSTO
 * 2026 da planilha da equipe: título Calibri 28 negrito em #92D050 mesclado
 * A:I (altura 36), cabeçalho Calibri 11 negrito, borda fina em toda célula,
 * datas como data do Excel (formato 14), valor em R$ contábil, parcela como
 * texto, coluna K com cabeçalho #548235 e a soma em #FFFF00 com fórmula.
 *
 * Office Open XML escrito à mão (`pacote-xlsx`): sem dependência nova.
 */
import type { AbaPlanilha, LinhaPlanilha } from "@/lib/planilha-controle";
import { Grade, empacotarXlsx, escapar, serialExcel } from "@/lib/xlsx/pacote-xlsx";

export { serialExcel };

/** Larguras em caracteres, coluna → largura (J fica no padrão do Excel). */
const LARGURAS: [number, number][] = [
  [1, 63.71],
  [2, 17.71],
  [3, 15],
  [4, 27.29],
  [5, 138.29],
  [6, 25.86],
  [7, 28.29],
  [8, 25.86],
  [9, 29.43],
  [11, 32.86],
];

const CABECALHO = [
  "NOME",
  "CPF",
  "CARGO",
  "DATA DA COMPRA",
  "PRODUTO",
  "VALOR DA PARCELA",
  "QUANT. DE PARCELAS",
  "DATA DE DESCONTO",
  "STATUS DA DÍVIDA",
];
const COLUNAS = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];

/** Índices em `cellXfs` (ver ESTILOS). */
const S = {
  titulo: 1,
  cabecalhoEsq: 2,
  cabecalho: 3,
  textoEsq: 4,
  texto: 5,
  data: 6,
  moeda: 7,
  kCabecalho: 8,
  kValor: 9,
  kSoma: 10,
  parcela: 11,
} as const;

const R_CONTABIL = '_-"R$"\\ * #,##0.00_-;\\-"R$"\\ * #,##0.00_-;_-"R$"\\ * "-"??_-;_-@_-';

const BORDA = '<border><left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right><top style="thin"><color rgb="FF000000"/></top><bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border>';
const fonte = (negrito: boolean, tamanho: number) =>
  `<font>${negrito ? "<b/>" : ""}<sz val="${tamanho}"/><color rgb="FF000000"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>`;
const preenchimento = (rgb: string) => `<fill><patternFill patternType="solid"><fgColor rgb="${rgb}"/><bgColor indexed="64"/></patternFill></fill>`;
const xf = (atributos: string, alinhamento: string) =>
  `<xf ${atributos} xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1" applyAlignment="1"><alignment ${alinhamento}/></xf>`;

const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="${escapar(R_CONTABIL)}"/></numFmts>
<fonts count="3">${fonte(false, 11)}${fonte(true, 11)}${fonte(true, 28)}</fonts>
<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${preenchimento("FF92D050")}${preenchimento("FF548235")}${preenchimento("FFFFFF00")}</fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>${BORDA}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="12">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
${xf('numFmtId="0" fontId="2" fillId="2" borderId="1"', 'horizontal="center" vertical="center"')}
${xf('numFmtId="0" fontId="1" fillId="0" borderId="1"', 'horizontal="left" vertical="center"')}
${xf('numFmtId="0" fontId="1" fillId="0" borderId="1"', 'horizontal="center" vertical="center"')}
${xf('numFmtId="0" fontId="0" fillId="0" borderId="1"', 'horizontal="left" vertical="center"')}
${xf('numFmtId="0" fontId="0" fillId="0" borderId="1"', 'horizontal="center" vertical="center"')}
${xf('numFmtId="14" fontId="0" fillId="0" borderId="1"', 'horizontal="center" vertical="center"')}
${xf('numFmtId="164" fontId="0" fillId="0" borderId="1"', 'horizontal="center" vertical="center"')}
${xf('numFmtId="0" fontId="1" fillId="3" borderId="1"', 'horizontal="center" vertical="center"')}
${xf('numFmtId="164" fontId="0" fillId="0" borderId="1"', 'horizontal="center" vertical="center"')}
${xf('numFmtId="164" fontId="1" fillId="4" borderId="1"', 'horizontal="center" vertical="center"')}
${xf('numFmtId="49" fontId="0" fillId="0" borderId="1"', 'horizontal="center" vertical="center"')}
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function escreverLinha(grade: Grade, n: number, l: LinhaPlanilha) {
  grade.texto("A", n, S.textoEsq, l.nome);
  grade.texto("B", n, S.texto, l.cpf);
  grade.texto("C", n, S.texto, l.cargo);
  if (l.dataCompra) grade.numero("D", n, S.data, serialExcel(l.dataCompra));
  else grade.vazia("D", n, S.data);
  grade.texto("E", n, S.texto, l.produto);
  grade.numero("F", n, S.moeda, l.valor);
  grade.texto("G", n, S.parcela, l.parcela);
  grade.numero("H", n, S.data, serialExcel(l.dataDesconto));
  grade.texto("I", n, S.texto, l.status);
}

function planilhaDaAba(aba: AbaPlanilha): string {
  const grade = new Grade();
  let n = 1;
  aba.blocos.forEach((bloco, i) => {
    if (i > 0) n += 1; // linha em branco entre blocos
    grade.altura(n, 36);
    grade.texto("A", n, S.titulo, bloco.titulo);
    for (const c of COLUNAS.slice(1)) grade.vazia(c, n, S.titulo);
    grade.mesclas.push(`A${n}:I${n}`);
    n += 1;
    CABECALHO.forEach((titulo, j) => grade.texto(COLUNAS[j], n, j === 0 ? S.cabecalhoEsq : S.cabecalho, titulo));
    n += 1;
    for (const linha of bloco.linhas) {
      escreverLinha(grade, n, linha);
      n += 1;
    }
  });

  // Coluna K: cabeçalho em K1, um valor por parcela antecipada a partir de K2 e,
  // duas linhas abaixo do último, a soma mesclada em duas linhas.
  grade.texto("K", 1, S.kCabecalho, "ANTECIPAÇÃO OK");
  aba.antecipados.forEach((valor, i) => grade.numero("K", 2 + i, S.kValor, valor));
  const ultimo = 1 + aba.antecipados.length;
  const linhaSoma = ultimo + 2;
  const soma = aba.antecipados.reduce((total, v) => total + Math.round(v * 100), 0) / 100;
  if (aba.antecipados.length > 0) grade.formula("K", linhaSoma, S.kSoma, `SUM(K2:K${ultimo})`, soma);
  else grade.numero("K", linhaSoma, S.kSoma, 0);
  grade.vazia("K", linhaSoma + 1, S.kSoma);
  grade.mesclas.push(`K${linhaSoma}:K${linhaSoma + 1}`);

  const colunas = LARGURAS.map(([c, w]) => `<col min="${c}" max="${c}" width="${w}" customWidth="1"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView zoomScale="80" zoomScaleNormal="80" workbookViewId="0"/></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${colunas}</cols>
<sheetData>${grade.xml()}</sheetData>
<mergeCells count="${grade.mesclas.length}">${grade.mesclas.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>
</worksheet>`;
}

function planilhaVazia(): string {
  const grade = new Grade();
  grade.texto("A", 1, S.textoEsq, "Nenhuma parcela nos filtros escolhidos.");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView zoomScale="80" zoomScaleNormal="80" workbookViewId="0"/></sheetViews>
<cols><col min="1" max="1" width="63.71" customWidth="1"/></cols>
<sheetData>${grade.xml()}</sheetData>
</worksheet>`;
}

/** Nome de aba válido no Excel: até 31 caracteres, sem []:*?/\ e sem repetir. */
function nomesDasAbas(nomes: string[]): string[] {
  const usados = new Set<string>();
  return nomes.map((nome) => {
    const base = nome.replace(/[[\]:*?/\\]/g, " ").slice(0, 31).trim() || "ABA";
    let final = base;
    for (let i = 2; usados.has(final); i++) final = `${base.slice(0, 27)} (${i})`;
    usados.add(final);
    return final;
  });
}

export function gerarXlsxPlanilhaControle(abas: AbaPlanilha[]): Uint8Array<ArrayBuffer> {
  const planilhas = abas.length > 0 ? abas.map(planilhaDaAba) : [planilhaVazia()];
  const nomes = abas.length > 0 ? nomesDasAbas(abas.map((a) => a.nome)) : ["SEM PARCELAS"];

  return empacotarXlsx(
    planilhas.map((xml, i) => ({ nome: nomes[i], xml })),
    ESTILOS
  );
}
