/** Escapa texto para dentro de HTML, inclusive em valor de atributo entre aspas. */
export function escaparHtml(valor: string | null | undefined): string {
  if (valor == null) return "";
  return valor
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;")
    .split('"').join("&quot;")
    .split("'").join("&#39;");
}

/**
 * URL de imagem que pode ir para `src`: http(s) absoluta ou caminho do próprio site.
 * `javascript:`, `data:` e `//host` (protocolo relativo) ficam de fora. `null` = não exibir.
 */
export function urlImagemSegura(valor: string | null | undefined): string | null {
  const url = (valor ?? "").trim();
  if (!url) return null;
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  const minuscula = url.toLowerCase();
  if (minuscula.startsWith("https://") || minuscula.startsWith("http://")) return url;
  return null;
}
