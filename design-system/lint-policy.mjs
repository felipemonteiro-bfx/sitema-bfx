// Politica do design system para o @shadcn/lint (fonte unica, lida por
// eslint.config.mjs). Documentada em design-system/VANTAGE-PADROES.md, secao
// "Lint do design system". Mudar uma linha aqui e uma decisao de design:
// revise como se fosse um token novo.
//
// Modelo: componentes de `src/components/ui/*` sao donos da aparencia. A tela
// (o chamador) so ajusta LAYOUT (margem, largura, posicao, grid/flex do item,
// alinhamento de texto). Aparencia (cor, forma, efeito, tipografia, padding)
// entra por `variant`/`size` do componente. Excecoes por componente abaixo.

/**
 * Marcadores de comportamento do projeto (globals.css): nao pintam nada, ligam
 * o modo discreto (`valor-sensivel*`, `bloco-sensivel`) e a entrada animada
 * (`anim-*`). O linter nao sabe classificar classe propria, entao entram por nome.
 */
const MARCADORES = ["valor-sensivel", "valor-sensivel-fim", "bloco-sensivel", "anim-entrada", "anim-barra", "anim-dica"];

/** O que todo componente aceita do chamador: layout e marcadores. */
const BASE = ["layout", ...MARCADORES];

export const noRestyle = {
  allow: BASE,
  contracts: [
    // Painel e suas partes: o espacamento interno pertence a pagina.
    { pattern: "^Card$|^Card(Header|Content|Footer)$", allow: [...BASE, "spacing"] },
    // Tabela: a densidade (padding da celula) e decisao da tela; tipografia e cor
    // entram por props do componente (`tom`, `peso`, `tamanho`, `numeric`, `mono`).
    { pattern: "^Table$|^Table(Head|Cell)$", allow: [...BASE, "spacing"] },
    // Botao: tamanho, forma e cor vem de `size`/`variant` (button-variants.ts). Do
    // chamador so layout (largura `w-full`, margem, posicao) e `gap-*`, que e a
    // composicao icone + rotulo dentro do botao, nao aparencia.
    { pattern: "^Button$", allow: [...BASE, "gap-*"] },
    // Titulo/descricao de painel: tipografia (tamanho, cor muted), sem trocar a familia/peso.
    { pattern: "^Card(Title|Description)$", allow: [...BASE, "typography"], deny: ["font-*"] },
  ],
};

export const noArbitraryValues = {
  // Unica excecao: valores de LAYOUT sem degrau na escala (colunas de grid
  // `grid-cols-[1fr_auto]`, unidades de viewport `h-[90vh]`, `calc()`, `%`,
  // `ch`). Aparencia (cor, raio, sombra, tamanho de fonte, espacamento) nao
  // passa: tem de vir de token/escala do @theme. Valor que TEM equivalente
  // exato na escala (`min-h-[44px]` = `min-h-11`) foi trocado, nao liberado.
  allow: ["layout"],
};

export const noInlineStyles = {
  // Propriedades dinamicas calculadas por dado (altura de barra, largura de
  // progresso). Custom properties (`--x`) passam sem entrada aqui.
  allow: [],
};

export const requireStaticClasses = {};

export const noUnknownClasses = {};

export const noRawColors = {};
