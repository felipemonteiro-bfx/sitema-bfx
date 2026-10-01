/**
 * Demonstrativo do fechamento em .xlsx (Fase 5): uma aba "Demonstrativo" com o cabeçalho da
 * versão, uma linha por parcela, os ajustes com justificativa e os totais. Valores e datas vão
 * como número (o RH soma e filtra no Excel); matrícula vai como texto (zero à esquerda).
 */
import { rotuloCompetencia, type DemonstrativoDados } from "@/lib/fechamento";
import { Grade, empacotarXlsx, serialExcel } from "@/lib/xlsx/pacote-xlsx";

/** Índices em `cellXfs` (ver ESTILOS). */
const S = { texto: 0, negrito: 1, moeda: 2, data: 3, negritoMoeda: 4, matricula: 5, titulo: 6, cabecalho: 7 } as const;

const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts>
<fonts count="3"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="14"/><name val="Calibri"/><family val="2"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE7EAF0"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="8">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="4" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

/** Venda | Colaborador | Matrícula | Vencimento | Lote Prudent | Situação | Valor */
const COLUNAS =
  '<cols><col min="1" max="1" width="20" customWidth="1"/><col min="2" max="2" width="36" customWidth="1"/><col min="3" max="3" width="12" customWidth="1"/><col min="4" max="4" width="12" customWidth="1"/><col min="5" max="5" width="12" customWidth="1"/><col min="6" max="6" width="28" customWidth="1"/><col min="7" max="7" width="14" customWidth="1"/></cols>';

const CABECALHO_TABELA = ["Venda", "Colaborador", "Matrícula", "Vencimento", "Lote Prudent", "Situação", "Valor"] as const;
const REFS = ["A", "B", "C", "D", "E", "F", "G"] as const;

/** Data pura (meia-noite UTC) → serial do Excel. */
const serial = (d: Date) => serialExcel(d.toISOString().slice(0, 10));

export function gerarFechamentoXlsx(dados: DemonstrativoDados): Uint8Array<ArrayBuffer> {
  const g = new Grade();
  let n = 1;

  g.texto("A", n, S.titulo, "Demonstrativo mensal BFX");
  g.altura(n, 20);
  n += 2;

  const rotulo = (texto: string) => g.texto("A", n, S.negrito, texto);
  rotulo("Empresa");
  g.texto("B", n++, S.texto, dados.empresa.nome);
  rotulo("CNPJ");
  g.texto("B", n++, S.texto, dados.empresa.cnpj ?? "");
  rotulo("Competência");
  g.texto("B", n++, S.texto, rotuloCompetencia(dados.competencia));
  rotulo("Versão");
  g.numero("B", n++, S.texto, dados.versao);
  rotulo("Dia de corte");
  g.numero("B", n++, S.texto, dados.diaCorte);
  rotulo("Vencimento do Pix");
  g.numero("B", n++, S.data, serial(dados.vencimentoPix));
  rotulo("Responsável");
  g.texto("B", n++, S.texto, dados.responsavel ?? "");
  n++;

  CABECALHO_TABELA.forEach((titulo, i) => g.texto(REFS[i], n, S.cabecalho, titulo));
  n++;

  for (const l of dados.linhas) {
    g.texto("A", n, S.texto, l.identificador);
    g.texto("B", n, S.texto, l.colaborador);
    g.texto("C", n, S.matricula, l.matricula ?? "");
    g.numero("D", n, S.data, serial(l.vencimento));
    if (l.lote === null) g.vazia("E", n, S.texto);
    else g.numero("E", n, S.texto, l.lote);
    g.texto("F", n, S.texto, l.situacao);
    g.numero("G", n, S.moeda, l.valor);
    n++;
  }
  n++;

  g.texto("F", n, S.negrito, "Total bruto");
  g.numero("G", n++, S.negritoMoeda, dados.totalBruto);

  if (dados.ajustes.length > 0) {
    n++;
    g.texto("A", n, S.cabecalho, "Ajustes");
    g.texto("B", n, S.cabecalho, "Justificativa");
    g.texto("G", n++, S.cabecalho, "Valor");
    for (const a of dados.ajustes) {
      g.texto("B", n, S.texto, a.justificativa);
      g.numero("G", n++, S.moeda, a.valor);
    }
    n++;
  }

  g.texto("F", n, S.negrito, "Total de ajustes");
  g.numero("G", n++, S.negritoMoeda, dados.totalAjustes);
  g.texto("F", n, S.negrito, "Valor final");
  g.numero("G", n++, S.negritoMoeda, dados.totalFinal);

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
${COLUNAS}
<sheetData>${g.xml()}</sheetData>
</worksheet>`;

  return empacotarXlsx([{ nome: "Demonstrativo", xml }], ESTILOS);
}
