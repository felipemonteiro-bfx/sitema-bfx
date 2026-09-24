/**
 * Modo discreto (2026-09-24): um botão de olho oculta valores e dados sensíveis em todas as telas,
 * como no app do Inter. Pedido do André: custo, valor de venda, margem, dados do cliente e
 * gráficos somem de uma vez, e a escolha fica lembrada naquele aparelho.
 *
 * **Quem oculta é o CSS.** As páginas de `(app)` são server components (o inventário de 24/09
 * encontrou ~150 pontos de dinheiro, a maioria renderizada no servidor), então um contexto de
 * client não alcançaria nem metade deles. O mecanismo é: este módulo guarda a preferência do
 * aparelho e liga um atributo no `<html>`; `globals.css` desenha a máscara sobre tudo que carrega
 * `valor-sensivel` (fileira de pontos, largura preservada) ou `bloco-sensivel` (gráfico fora de
 * foco). Nada vai ao servidor e nada muda no banco — é só o que a tela mostra.
 *
 * As regras puras ficam aqui para poderem ser testadas (`src/__tests__/modo-discreto.test.ts`); o
 * botão em si é `src/components/valores-toggle.tsx`.
 */

/** Atributo no `<html>`. Presente = ocultando. */
export const ATRIBUTO_DISCRETO = "data-valores-ocultos";

/** Chave no localStorage do aparelho. Prefixo `bfx:` para não colidir com o `theme` do next-themes. */
export const CHAVE_DISCRETO = "bfx:valores-ocultos";

/** Classe de um valor: o texto some e uma fileira de pontos toma a mesma largura. */
export const CLASSE_VALOR_SENSIVEL = "valor-sensivel";

/** Classe de um bloco (gráfico, medidor, miniatura): sai de foco inteiro. */
export const CLASSE_BLOCO_SENSIVEL = "bloco-sensivel";

/** O único valor que liga o modo. Qualquer outra coisa guardada é tratada como desligado. */
const LIGADO = "1";
const DESLIGADO = "0";

/**
 * O que estava guardado no aparelho. O padrão é **visível**: quem nunca clicou vê os números, e
 * lixo no localStorage (extensão, aba antiga, versão anterior) não liga o modo por acidente.
 */
export function lerPreferencia(bruto: string | null | undefined): boolean {
  return bruto === LIGADO;
}

/** O que gravar no aparelho. */
export function valorParaGuardar(ligado: boolean): string {
  return ligado ? LIGADO : DESLIGADO;
}

/** O que o clique vai fazer — é isso que o botão anuncia, não o estado atual. */
export function rotuloDoBotao(ligado: boolean): string {
  return ligado ? "Mostrar valores" : "Ocultar valores";
}

interface RaizDoDocumento {
  setAttribute(nome: string, valor: string): void;
  removeAttribute(nome: string): void;
}

/**
 * Liga ou desliga a marca no `<html>`. Aceita nulo porque o mesmo código roda em caminho sem DOM
 * (render no servidor, teste).
 */
export function aplicarNoDocumento(raiz: RaizDoDocumento | null | undefined, ligado: boolean): void {
  if (!raiz) return;
  if (ligado) {
    raiz.setAttribute(ATRIBUTO_DISCRETO, LIGADO);
    return;
  }
  raiz.removeAttribute(ATRIBUTO_DISCRETO);
}

/**
 * Script que roda no `<head>`, antes da primeira pintura: sem ele os valores apareceriam por um
 * instante até o React montar o botão — exatamente o que o modo existe para evitar. Mesmo caminho
 * que o next-themes usa para o tema. Tudo em try/catch: `localStorage` lança em janela anônima ou
 * com dados do site bloqueados, e um erro aqui roda antes do React e levaria a página inteira.
 */
export function scriptDeInicializacao(): string {
  return [
    "try{",
    `var v=window.localStorage.getItem('${CHAVE_DISCRETO}');`,
    `if(v==='${LIGADO}'){document.documentElement.setAttribute('${ATRIBUTO_DISCRETO}','${LIGADO}');}`,
    "}catch(e){}",
  ].join("");
}
