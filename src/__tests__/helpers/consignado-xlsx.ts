import { criarZip } from "@/lib/xlsx/zip";

/** Cabeçalhos do export Dataprev e-Consignado CLT (arquivo de referência). */
export const CABECALHOS_CONSIGNADO = [
  "ifConcessora.codigo",
  "ifConcessora.descricao",
  "contrato",
  "cpf",
  "matricula",
  "numeroInscricaoEmpregador",
  "nomeTrabalhador",
  "nomeEmpregador",
  "dataInicioContrato",
  "dataFimContrato",
  "competenciaInicioDesconto",
  "competenciaFimDesconto",
  "totalParcelas",
  "valorParcela",
  "valorEmprestimo",
  "valorLiberado",
  "qtdPagamentos",
  "qtdEscrituracoes",
  "codigoCategoriaTrabalhador",
  "competencia",
  "numeroInscricaoEstabelecimento",
  "dataAdmissao",
] as const;

function escaparXml(texto: string): string {
  return texto
    .split("&")
    .join("&amp;")
    .split("<")
    .join("&lt;")
    .split(">")
    .join("&gt;");
}

function letraColuna(indice1: number): string {
  let n = indice1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export type CelulaConsignado = string | number | null;

/** Monta um .xlsx mínimo no layout Dataprev, sem biblioteca de planilha. */
export function montarXlsxConsignado(
  linhas: CelulaConsignado[][],
  nomeAba = "eConsignadoCLT",
  cabecalhos: readonly string[] = CABECALHOS_CONSIGNADO,
): Uint8Array {
  const strings: string[] = [];
  const indiceDe = (texto: string): number => {
    const achado = strings.indexOf(texto);
    if (achado >= 0) return achado;
    strings.push(texto);
    return strings.length - 1;
  };

  const todas = [cabecalhos as unknown as CelulaConsignado[], ...linhas];
  const rowsXml: string[] = [];
  for (let r = 0; r < todas.length; r++) {
    const celulas: string[] = [];
    const row = todas[r];
    for (let c = 0; c < row.length; c++) {
      const val = row[c];
      if (val === null || val === undefined || val === "") continue;
      const ref = `${letraColuna(c + 1)}${r + 1}`;
      if (typeof val === "number") {
        celulas.push(`<c r="${ref}"><v>${val}</v></c>`);
      } else {
        celulas.push(`<c r="${ref}" t="s"><v>${indiceDe(String(val))}</v></c>`);
      }
    }
    rowsXml.push(`<row r="${r + 1}">${celulas.join("")}</row>`);
  }

  const sst = strings
    .map((s) => `<si><t>${escaparXml(s)}</t></si>`)
    .join("");

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${escaparXml(nomeAba)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;

  const shared = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">${sst}</sst>`;

  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>${rowsXml.join("")}</sheetData>
</worksheet>`;

  return criarZip([
    { nome: "[Content_Types].xml", dados: contentTypes },
    { nome: "_rels/.rels", dados: rels },
    { nome: "xl/workbook.xml", dados: workbook },
    { nome: "xl/_rels/workbook.xml.rels", dados: workbookRels },
    { nome: "xl/sharedStrings.xml", dados: shared },
    { nome: "xl/worksheets/sheet1.xml", dados: sheet },
  ]);
}

export const LINHA_MARIA_BRADESCO: CelulaConsignado[] = [
  "001",
  "BRADESCO",
  "CTR-001",
  "529.982.247-25",
  "1001",
  "01288370000139",
  "MARIA EVELINE SILVA",
  "AMAZON FIVE LTDA",
  "15/05/2026",
  "15/05/2032",
  "06/2026",
  "05/2032",
  72,
  150,
  8000,
  7900,
  3,
  3,
  "101",
  "09/2026",
  "01288370000139",
  "10/01/2020",
];

export const LINHA_MARIA_QI: CelulaConsignado[] = [
  "318",
  "QI SCD S.A.",
  "PKT-002",
  "529.982.247-25",
  "1001",
  "01288370000139",
  "MARIA EVELINE SILVA",
  "AMAZON FIVE LTDA",
  "01/06/2026",
  "01/06/2028",
  "06/2026",
  "05/2028",
  24,
  80.73,
  1500,
  1480,
  2,
  2,
  "101",
  "09/2026",
  "01288370000139",
  "10/01/2020",
];

export const LINHA_LEAD_NOVO: CelulaConsignado[] = [
  "104",
  "CAIXA ECONOMICA FEDERAL",
  "CEF-35362333",
  "111.444.777-35",
  "2002",
  "01288370000139",
  "JOAO LEAD NOVO",
  "AMAZON FIVE LTDA",
  "01/01/2026",
  "01/01/2028",
  "01/2026",
  "12/2027",
  24,
  200,
  4000,
  3900,
  1,
  1,
  "101",
  "09/2026",
  "01288370000139",
  "01/02/2019",
];
