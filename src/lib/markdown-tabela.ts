/**
 * Deteccao de coluna numerica nas tabelas que a IA devolve no chat.
 *
 * As tabelas do BFX Intelligence sao geradas por `buildToolSummary` e chegam ao
 * componente como markdown — nao ha schema, so texto. A auditoria visual de
 * 2026-08-11 apontou que `MarkdownTable` renderiza TODA celula com o mesmo
 * alinhamento a esquerda, inclusive valor monetario e quantidade, enquanto as
 * tabelas do resto do sistema alinham numero a direita com `tabular-nums`.
 * Comparar "R$ 1.450,00" com "R$ 890,00" alinhados a esquerda obriga a ler
 * digito a digito.
 *
 * Como nao existe tipo declarado, a coluna e classificada pelo CONTEUDO: se a
 * maioria das celulas preenchidas parece numero (moeda, percentual, parcela,
 * quantidade), a coluna inteira alinha a direita.
 *
 * Sem `RegExp.prototype.exec` (hook do projeto) — so `.split()` e testes de
 * caractere.
 */

/** Caracteres que acompanham numero em dado financeiro e nao o descaracterizam. */
const ACESSORIOS_NUMERICOS = ["R$", "%", "x", "(", ")", "+", "-", " ", ".", ",", " "];

/**
 * Uma celula "parece numero" quando, retirados os acessorios, sobra pelo menos
 * um digito e nada alem de digitos. "R$ 1.450,00" sim; "4x" sim; "12/2026" nao
 * (data e melhor lida a esquerda); "AMAZON FIVE" nao.
 */
export function pareceNumero(celula: string): boolean {
  const bruto = (celula ?? "").trim();
  if (bruto.length === 0) return false;
  if (bruto.includes("/") || bruto.includes(":")) return false; // data e hora ficam a esquerda

  let resto = bruto;
  for (const acessorio of ACESSORIOS_NUMERICOS) {
    resto = resto.split(acessorio).join("");
  }
  if (resto.length === 0) return false;
  for (const caractere of resto) {
    if (caractere < "0" || caractere > "9") return false;
  }
  return true;
}

/**
 * Indices das colunas a alinhar a direita. Uma coluna entra quando tem ao menos
 * uma celula preenchida e a MAIORIA das preenchidas parece numero — assim uma
 * linha de total escrita como "—" nao desclassifica a coluna inteira.
 */
export function colunasNumericas(linhas: string[][], totalColunas: number): Set<number> {
  const numericas = new Set<number>();

  for (let coluna = 0; coluna < totalColunas; coluna++) {
    let preenchidas = 0;
    let numericasNaColuna = 0;

    for (const linha of linhas) {
      const celula = (linha[coluna] ?? "").trim();
      if (celula.length === 0 || celula === "—" || celula === "-") continue;
      preenchidas += 1;
      if (pareceNumero(celula)) numericasNaColuna += 1;
    }

    if (preenchidas > 0 && numericasNaColuna * 2 > preenchidas) numericas.add(coluna);
  }

  return numericas;
}
