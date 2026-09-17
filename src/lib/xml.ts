/**
 * Escapa texto para XML de planilha (.xlsx). Remove caractere de controle, U+FFFE e
 * U+FFFF: um nome colado com `\x0B` gerava arquivo que o Excel recusa. Mesma regra
 * de `xlsx/pacote-xlsx.ts`.
 */
export function escaparXml(valor: string): string {
  return valor
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F￾￿]/g, "")
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;")
    .split('"').join("&quot;")
    .split("'").join("&apos;");
}
