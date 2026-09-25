/**
 * Prévia de um .xlsx gerado pelo próprio sistema (`src/lib/xlsx/pacote-xlsx.ts`):
 * primeira aba, células `inlineStr` ou numéricas. Não é um leitor geral de
 * planilha — shared strings e estilos são ignorados.
 */
import { lerZip } from "@/lib/xlsx/ler";

export type PreviaPlanilha = { aba: string; linhas: string[][]; totalLinhas: number };

function desescapar(texto: string): string {
  return texto
    .split("&lt;").join("<")
    .split("&gt;").join(">")
    .split("&quot;").join('"')
    .split("&apos;").join("'")
    .split("&amp;").join("&");
}

/** Conteúdo entre `<tag ...>` e `</tag>` na primeira ocorrência, ou null. */
function interno(xml: string, tag: string): string | null {
  const inicio = xml.indexOf(`<${tag}`);
  if (inicio < 0) return null;
  const abre = xml.indexOf(">", inicio);
  if (abre < 0 || xml[abre - 1] === "/") return null;
  const fecha = xml.indexOf(`</${tag}>`, abre);
  return fecha < 0 ? null : xml.slice(abre + 1, fecha);
}

function valorDaCelula(celula: string): string {
  const inline = interno(celula, "is");
  if (inline !== null) {
    return desescapar(
      inline
        .split("<t")
        .slice(1)
        .map((t) => t.slice(t.indexOf(">") + 1).split("</t>")[0])
        .join("")
    );
  }
  return desescapar(interno(celula, "v") ?? "");
}

export function lerPreviaXlsx(bytes: Uint8Array, maxLinhas = 10): PreviaPlanilha {
  const arquivos = lerZip(bytes);
  const aba = arquivos.get("xl/worksheets/sheet1.xml");
  if (!aba) throw new Error("planilha sem aba");

  const workbook = arquivos.get("xl/workbook.xml") ?? "";
  const nomeAttr = workbook.split("<sheet ")[1]?.split('name="')[1]?.split('"')[0] ?? "";

  const linhas = (interno(aba, "sheetData") ?? "")
    .split("<row")
    .slice(1)
    .map((row) => {
      const corpo = row.slice(row.indexOf(">") + 1);
      return corpo
        .split("<c ")
        .slice(1)
        .map((c) => (c.includes("/>") && c.indexOf("/>") < c.indexOf(">") + 1 ? "" : valorDaCelula(c)));
    })
    .map((celulas) => {
      let fim = celulas.length;
      while (fim > 0 && celulas[fim - 1] === "") fim--;
      return celulas.slice(0, fim);
    });

  return { aba: desescapar(nomeAttr), linhas: linhas.slice(0, maxLinhas), totalLinhas: linhas.length };
}
