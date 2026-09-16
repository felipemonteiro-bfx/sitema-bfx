import type { PDFFont } from "pdf-lib";

/**
 * Caracteres fora de Latin-1 que o WinAnsi (encoding das fontes padrão do pdf-lib)
 * ainda codifica. Qualquer outro — emoji, ✓, seta — faz `drawText` lançar e o
 * relatório inteiro responder 500.
 */
const WINANSI_EXTRA = new Set(
  "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ".split(""),
);

function codificavel(caractere: string): boolean {
  const codigo = caractere.codePointAt(0) ?? 0;
  if (caractere === "\n") return true;
  if (codigo >= 0x20 && codigo <= 0x7e) return true;
  if (codigo >= 0xa0 && codigo <= 0xff) return true;
  return WINANSI_EXTRA.has(caractere);
}

/** Texto pronto para fonte padrão do pdf-lib: tab vira espaço, controle some, o resto vira "?". */
export function textoPdf(texto: string): string {
  return Array.from(texto.normalize("NFC"))
    .map((c) => {
      if (c === "\t") return " ";
      const codigo = c.codePointAt(0) ?? 0;
      if (c !== "\n" && (codigo < 0x20 || (codigo >= 0x7f && codigo < 0xa0))) return "";
      return codificavel(c) ? c : "?";
    })
    .join("");
}

/**
 * Fonte que higieniza o texto antes de codificar ou medir. Usar no lugar da fonte
 * embutida: `fontePdfSegura(await pdfDoc.embedFont(StandardFonts.Helvetica))`. Cobre
 * todos os `drawText` e `widthOfTextAtSize` sem tocar em cada chamada — nome de
 * cliente ou produto com emoji não derruba mais o PDF.
 */
export function fontePdfSegura(fonte: PDFFont): PDFFont {
  return new Proxy(fonte, {
    get(alvo, prop, receptor) {
      if (prop === "encodeText") {
        return (texto: string) => alvo.encodeText(textoPdf(texto));
      }
      if (prop === "widthOfTextAtSize") {
        // Medida é de uma linha: quebra vira espaço (a fonte lança com \n na medição).
        return (texto: string, tamanho: number) =>
          alvo.widthOfTextAtSize(textoPdf(texto).split("\n").join(" "), tamanho);
      }
      const valor = Reflect.get(alvo, prop, receptor);
      return typeof valor === "function" ? valor.bind(alvo) : valor;
    },
  });
}
