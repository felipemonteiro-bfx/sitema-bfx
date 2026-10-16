// Politica do design system para o @shadcn/lint (fonte unica, lida por
// eslint.config.mjs). Documentada em design-system/VANTAGE-PADROES.md, secao
// "Lint do design system". Mudar uma linha aqui e uma decisao de design:
// revise como se fosse um token novo.
//
// Modelo: componentes de `src/components/ui/*` sao donos da aparencia. A tela
// (o chamador) so ajusta LAYOUT (margem, largura, posicao, grid/flex do item,
// alinhamento de texto). Aparencia (cor, forma, efeito, tipografia, padding)
// entra por `variant`/`size` do componente. Excecoes por componente abaixo.

/** Categoria aceita em todo componente que nao tem contrato proprio. */
const BASE = ["layout"];

export const noRestyle = {
  allow: BASE,
  contracts: [
    // Painel e suas partes: o espacamento interno pertence a pagina.
    { pattern: "^Card$|^Card(Header|Content|Footer)$", allow: ["layout", "spacing"] },
    // Titulo/descricao de painel: tipografia (tamanho, cor muted), sem trocar a familia/peso.
    { pattern: "^Card(Title|Description)$", allow: ["layout", "typography"], deny: ["font-*"] },
  ],
};

export const noArbitraryValues = {
  // Larguras/alturas de layout arbitrarias (ex.: `max-w-[28rem]`) sao
  // legitimas; aparencia (cor, raio, sombra, fonte) nao.
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
