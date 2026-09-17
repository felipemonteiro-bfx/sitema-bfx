/**
 * Peças comuns dos .xlsx escritos à mão (planilha de controle e planilha da
 * folha): escape de texto, data do Excel, a grade de células de uma aba e o
 * pacote Office Open XML. Sem dependência nova — o zip sai de `criarZip`.
 */
import { criarZip } from "@/lib/xlsx/zip";

export function escapar(texto: string): string {
  return (
    texto
      // Caractere de controle, U+FFFE e U+FFFF quebram o XML (e o Excel recusa o arquivo).
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFE\uFFFF]/g, "")
      .split("&")
      .join("&amp;")
      .split("<")
      .join("&lt;")
      .split(">")
      .join("&gt;")
      .split('"')
      .join("&quot;")
  );
}

/** "2026-08-31" → 46265: dias desde 30/12/1899, a origem das datas do Excel. */
export function serialExcel(data: string): number {
  const [ano, mes, dia] = data.split("-").map(Number);
  return Math.round((Date.UTC(ano, mes - 1, dia) - Date.UTC(1899, 11, 30)) / 86_400_000);
}

const numero = (valor: number) => String(Math.round(valor * 100) / 100);

/** Células de uma aba, linha → coluna → XML da célula. */
export class Grade {
  private linhas = new Map<number, Map<string, string>>();
  private alturas = new Map<number, number>();
  readonly mesclas: string[] = [];

  private celulas(linha: number) {
    const mapa = this.linhas.get(linha) ?? new Map<string, string>();
    this.linhas.set(linha, mapa);
    return mapa;
  }

  texto(ref: string, linha: number, estilo: number, valor: string) {
    const conteudo = escapar(valor);
    if (!conteudo) return this.vazia(ref, linha, estilo);
    const preservar = conteudo !== conteudo.trim() ? ' xml:space="preserve"' : "";
    this.celulas(linha).set(ref, `<c r="${ref}${linha}" s="${estilo}" t="inlineStr"><is><t${preservar}>${conteudo}</t></is></c>`);
  }

  numero(ref: string, linha: number, estilo: number, valor: number) {
    this.celulas(linha).set(ref, `<c r="${ref}${linha}" s="${estilo}"><v>${numero(valor)}</v></c>`);
  }

  formula(ref: string, linha: number, estilo: number, formula: string, valor: number) {
    this.celulas(linha).set(ref, `<c r="${ref}${linha}" s="${estilo}"><f>${formula}</f><v>${numero(valor)}</v></c>`);
  }

  vazia(ref: string, linha: number, estilo: number) {
    this.celulas(linha).set(ref, `<c r="${ref}${linha}" s="${estilo}"/>`);
  }

  altura(linha: number, pontos: number) {
    this.alturas.set(linha, pontos);
    this.celulas(linha);
  }

  xml(): string {
    return [...this.linhas.keys()]
      .sort((a, b) => a - b)
      .map((linha) => {
        const celulas = [...this.linhas.get(linha)!.entries()]
          // Por tamanho antes: a coluna AA vem depois da Z.
          .sort(([a], [b]) => a.length - b.length || a.localeCompare(b))
          .map(([, xml]) => xml)
          .join("");
        const altura = this.alturas.get(linha);
        const atributos = altura ? ` ht="${altura}" customHeight="1"` : "";
        return `<row r="${linha}"${atributos}>${celulas}</row>`;
      })
      .join("");
  }
}

/** O .xlsx: uma aba por item, na ordem, com os estilos dados. */
export function empacotarXlsx(abas: { nome: string; xml: string }[], estilos: string): Uint8Array<ArrayBuffer> {
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${abas.map((aba, i) => `<sheet name="${escapar(aba.nome)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>
<calcPr calcId="191029" fullCalcOnLoad="1"/>
</workbook>`;

  const relacoes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${abas
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
    )
    .join("")}<Relationship Id="rId${abas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

  const tipos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${abas
  .map(
    (_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  )
  .join("\n")}
</Types>`;

  const raiz = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

  return criarZip([
    { nome: "[Content_Types].xml", dados: tipos },
    { nome: "_rels/.rels", dados: raiz },
    { nome: "xl/workbook.xml", dados: workbook },
    { nome: "xl/_rels/workbook.xml.rels", dados: relacoes },
    { nome: "xl/styles.xml", dados: estilos },
    ...abas.map((aba, i) => ({ nome: `xl/worksheets/sheet${i + 1}.xml`, dados: aba.xml })),
  ]);
}
