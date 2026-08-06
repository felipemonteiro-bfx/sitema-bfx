import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
// @ts-expect-error — modulo .mjs sem tipos, importado pelo caminho relativo do repo
import { TOKEN_PAIRS } from "../../scripts/design-tokens/token-contrast.mjs";

/**
 * Achados de CONTRASTE da varredura de runtime contra producao (build f754f76),
 * 88 de 88 paginas medidas. Todos no tema CLARO — o escuro passava em todos.
 *
 * | rota           | texto                       | medido | fundo real                  |
 * |----------------|-----------------------------|--------|-----------------------------|
 * | /dashboard     | Badge info (10px/600)       | 4.49:1 | `bg-info/10` > `bg-muted/30`|
 * | /venda-rapida  | `*` obrigatorio (12px/700)  | 4.36:1 | `--card-elevated`           |
 * | /venda-rapida  | Lucro / R$ (tile de produto)| 4.39:1 | `bg-success/5`              |
 * | /venda-rapida  | Margem / % (tile de produto)| 4.32:1 | `bg-info/5`                 |
 * | /venda-rapida  | Valor Parcela (10px/400)    | 4.47:1 | `--info-bg` (ja opaco)      |
 * | /financeiro    | CMV e afins (16px/600)      | 4.40:1 | `bg-destructive/5`          |
 * | /crm/campanhas | icone do EmptyState         | 2.76:1 | `bg-muted/50`               |
 *
 * Tres causas distintas, e nenhuma delas e "esqueceram o token":
 *
 * 1. COMPOSTO DA PROPRIA MATIZ. `bg-<sem>/5` e `/10` escurecem o tom e derrubam
 *    o texto abaixo de 4.5 mesmo com o token certo por cima. A resposta ja
 *    documentada no projeto e o tint OPACO `bg-<sem>-bg`.
 * 2. PAR QUE NINGUEM FORMOU. `--muted-foreground` sobre `--info-bg` da 4.47:1 e
 *    nao estava em `TOKEN_PAIRS` — foi assim que "Valor Parcela" ficou abaixo do
 *    minimo mesmo ja usando o tint opaco. Mesma historia dos 22 rotulos sobre
 *    `--card-elevated`. Token sem par nao e policiado.
 * 3. TOKEN DE PREENCHIMENTO USADO COMO TEXTO. `--destructive` e calibrado para
 *    ter `--destructive-foreground` POR CIMA; como texto ele aprova sobre
 *    `--card` (4.82:1) e reprova sobre qualquer superficie um degrau mais
 *    escura — 4.36:1 sobre `--card-elevated`, 4.41:1 sobre `bg-destructive/5`.
 *    Quem serve como texto vermelho e `--error-text` (5.07:1 e 5.13:1).
 *
 * O contraste em si e medido por `scripts/design-tokens/token-contrast.mjs`
 * (`npm run contraste:check`, roda no CI). Este arquivo cobre o que aquele
 * script nao ve: se as telas realmente passaram a usar o token certo, e se os
 * pares que faltavam entraram na lista.
 *
 * Nota de seguranca (CLAUDE.md): nenhuma execucao de regex com estado aqui —
 * so `.split()`, `.startsWith()` e `.includes()`.
 */

const raiz = process.cwd();
const ler = (rel: string) => readFileSync(join(raiz, rel), "utf8");

type Par = { foreground: string; background: string; min: number };
const pares = TOKEN_PAIRS as Par[];
const temPar = (fg: string, bg: string) =>
  pares.some((p) => p.foreground === fg && p.background === bg);

describe("(2) o par que ninguem formou: rotulo secundario sobre o tint opaco", () => {
  // Os tiles de metrica das telas financeiras sao todos do mesmo desenho:
  // rotulo `text-muted-foreground` de 10px em cima, valor `text-<sem>-text`
  // embaixo, os dois sobre `bg-<sem>-bg`. O par do VALOR ja era medido desde a
  // fase 16; o par do ROTULO nunca existiu, e e ele que reprovava.
  for (const tint of ["success-bg", "warning-bg", "info-bg"]) {
    it(`muted-foreground x ${tint} esta em TOKEN_PAIRS`, () => {
      expect(temPar("muted-foreground", tint)).toBe(true);
    });
  }

  it("nao inventa o par com error-bg, que nenhuma tela forma", () => {
    // `--error-bg` e o tint mais escuro da familia: `--muted-foreground` sobre
    // ele da 4.23:1 e so chegaria a 4.50 com L=0.975, onde o tile some contra o
    // card (1.13:1). Nenhuma tela poe rotulo secundario sobre vermelho — todas
    // usam `text-error-text`. Registrar um par que ninguem forma seria fabricar
    // uma reprovacao e empurrar o tint para invisivel.
    expect(temPar("muted-foreground", "error-bg")).toBe(false);
  });

  it("--info-bg clareia para caber o rotulo secundario, no mesmo degrau dos irmaos", () => {
    const css = ler("src/app/globals.css");
    // 0.95 dava 4.47:1 com `--muted-foreground`. 0.96 da 4.59:1 e alinha com
    // `--success-bg` e `--warning-bg`, que ja estavam nesse degrau.
    expect(css.includes("--info-bg: oklch(0.96 0.04 240)")).toBe(true);
    expect(css.includes("--info-bg: oklch(0.95 0.04 240)")).toBe(false);
  });
});

describe("(1) composto da propria matiz -> tint opaco", () => {
  it("Badge usa o tint opaco no tema claro, nao bg-<sem>/10", () => {
    const fonte = ler("src/components/ui/badge.tsx");
    for (const sem of ["success", "warning", "error", "info"]) {
      expect(fonte.includes(`bg-${sem}/10 `), `bg-${sem}/10 no Badge`).toBe(false);
      expect(fonte.includes(`bg-${sem}-bg`), `bg-${sem}-bg no Badge`).toBe(true);
    }
  });

  it("os tiles de resumo do item de produto usam o tint opaco, nao bg-<sem>/5", () => {
    const fonte = ler("src/components/produto-item-form.tsx");
    expect(fonte.includes("bg-success/5")).toBe(false);
    expect(fonte.includes("bg-info/5")).toBe(false);
    expect(fonte.includes("bg-success-bg")).toBe(true);
    expect(fonte.includes("bg-info-bg")).toBe(true);
  });
});

describe("(3) --destructive e preenchimento; como texto vermelho vale --error-text", () => {
  const ARQUIVOS = [
    "src/components/venda-rapida-form-v2.tsx",
    "src/app/(app)/financeiro/page.tsx",
    "src/components/ui/form.tsx",
  ];

  /**
   * `true` quando a fonte usa `text-destructive` como cor de texto — a
   * ocorrencia NAO continuada por `-`, que a tornaria
   * `text-destructive-foreground` (legitimo: e o par calibrado para ir POR CIMA
   * de `bg-destructive`).
   */
  function usaDestructiveComoTexto(fonte: string): boolean {
    return fonte
      .split("text-destructive")
      .slice(1)
      .some((resto) => !resto.startsWith("-"));
  }

  for (const arquivo of ARQUIVOS) {
    it(`${arquivo} nao pinta texto com --destructive`, () => {
      expect(usaDestructiveComoTexto(ler(arquivo))).toBe(false);
    });
  }

  it("o asterisco de campo obrigatorio do <FormLabel> tambem", () => {
    // Nao apareceu na varredura so porque o gate mede o estado INICIAL de cada
    // pagina e nenhum <Form> com campo obrigatorio estava montado. E o mesmo
    // marcador, o mesmo token e a mesma superficie das tres ocorrencias de
    // /venda-rapida que reprovaram a 4.36:1.
    expect(ler("src/components/ui/form.tsx").includes('text-error-text text-xs" aria-hidden')).toBe(true);
  });
});

describe("DOC_OVERFLOW: o cabecalho de pagina cabe em 390px", () => {
  it("a linha de titulo + acoes pode quebrar, e as acoes nao sao comprimidas", () => {
    // /importacao era a unica rota com rolagem horizontal do documento nos dois
    // temas: 393 contra 390. O grupo de acoes media 220.45px e comecava em
    // x=172.22, terminando em 392.67 — 2.67px alem da borda. A linha e
    // `flex items-center justify-between gap-4` sem quebra: em 390px nao ha o
    // que ceder, e o excedente vira rolagem da PAGINA inteira.
    const fonte = ler("src/components/page-header.tsx");
    expect(fonte.includes("flex flex-wrap items-center justify-between gap-4")).toBe(true);
    expect(fonte.includes('{actions && <div className="flex shrink-0 items-center gap-2">')).toBe(true);
  });
});

describe("icone do EmptyState: o sufixo de opacidade anula o token", () => {
  it("o icone usa --muted-foreground inteiro, sem /70", () => {
    // 2.76:1 medido, minimo 3 para objeto grafico (SC 1.4.11). A causa e a
    // mesma que ja derrubou `text-info-text/80` de 4.59 para 3.30: o sufixo de
    // opacidade nao "suaviza o token", ele forma uma cor que ninguem calibrou.
    // Sem o /70 sao 4.91:1.
    //
    // Nao isentamos por "icone decorativo". A WCAG de fato so exige 3:1 de
    // "partes de graficos NECESSARIAS para entender o conteudo", e o texto do
    // EmptyState carrega a mensagem inteira — mas nenhum sinal disponivel em
    // runtime separa decorativo de informativo: `aria-hidden` esta em TODO
    // icone lucide, e "tem texto do lado" descreve tambem o icone de sidebar a
    // 1.00:1 que motivou o gate. Uma isencao com esse alcance nao e isencao, e
    // a remocao da regra. Tirar um `/70` custa menos.
    const fonte = ler("src/components/ui/empty-state.tsx");
    expect(fonte.includes("text-muted-foreground/70")).toBe(false);
  });
});
