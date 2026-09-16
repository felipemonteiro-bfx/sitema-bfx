/**
 * Célula de CSV segura: texto com vírgula, ponto e vírgula, aspas ou quebra de linha vai
 * entre aspas (aspas internas dobradas), e texto que começa com `=`, `+`, `-` ou `@`
 * ganha um apóstrofo para a planilha não o executar como fórmula. Número sai como está.
 */
export function celulaCsv(valor: string | number | null | undefined): string {
  if (valor == null) return "";
  if (typeof valor === "number") return String(valor);
  let texto = valor;
  const primeiro = texto.charAt(0);
  // Número em texto ("-10.00" de toFixed) não é fórmula: sem o apóstrofo continua numérico.
  const ehNumero = texto.trim() !== "" && Number.isFinite(Number(texto));
  // Tab e CR no começo também disparam fórmula em algumas planilhas (OWASP CSV injection).
  if (
    !ehNumero &&
    (primeiro === "=" || primeiro === "+" || primeiro === "-" || primeiro === "@" || primeiro === "\t" || primeiro === "\r")
  ) {
    texto = `'${texto}`;
  }
  const precisaAspas =
    texto.includes(",") || texto.includes(";") || texto.includes('"') || texto.includes("\n") || texto.includes("\r");
  return precisaAspas ? `"${texto.split('"').join('""')}"` : texto;
}

export function linhaCsv(celulas: (string | number | null | undefined)[]): string {
  return celulas.map(celulaCsv).join(",");
}
