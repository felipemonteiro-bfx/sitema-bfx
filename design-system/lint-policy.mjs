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
    // Campos: so o padding horizontal que reserva espaco para um icone/adorno que a
    // tela posiciona (`pl-9` p/ lupa, `pr-8` p/ botao de limpar). Tamanho (`inputSize`),
    // estado (`state`), caixa-alta e mono entram por prop. Vale para Input e wrappers
    // (CurrencyInput, MaskedInput) porque o linter resolve o componente de destino.
    { pattern: "^Input$", allow: [...BASE, "pl-*", "pr-*"] },
    // Selo: gap entre icone e texto; o resto (tamanho, numero, tom) e `variant`/`size`/`numerico`.
    { pattern: "^Badge$", allow: [...BASE, "gap-*"] },
    // Contêineres sobrepostos (popover, gaveta, dialogo, alerta, abas, grupo de radios,
    // lista de comandos): o padding e o espacamento interno dependem do conteudo da tela.
    {
      pattern: "^(Popover|Sheet|Dialog|AlertDialog)(Content|Header|Footer|Title)$|^Alert(Description)?$|^Tabs(Content)?$|^RadioGroup$|^Command(List|Item)$|^SheetHeader$|^ScrollArea$|^EmptyStateInline$",
      allow: [...BASE, "spacing"],
    },
    // Popover: alem do padding, o corpo de texto (`text-sm`) de um popover de ajuda/legenda.
    { pattern: "^PopoverContent$", allow: [...BASE, "spacing", "typography"] },
    // Gatilho de Select: gap entre rotulo e valor (composicao interna).
    { pattern: "^SelectTrigger$", allow: [...BASE, "gap-*"] },
    // Titulo/descricao de painel: tipografia (tamanho, cor muted), sem trocar a familia/peso.
    // `gap-*` no titulo: espaco entre o icone e o texto (o titulo e flex).
    { pattern: "^Card(Title|Description)$", allow: [...BASE, "typography", "gap-*"], deny: ["font-*"] },
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
