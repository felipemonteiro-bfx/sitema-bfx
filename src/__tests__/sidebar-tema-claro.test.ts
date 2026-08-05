import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

/**
 * A sidebar precisa acompanhar o tema.
 *
 * Ate aqui `--sidebar` era escura nos DOIS temas por decisao explicita
 * ("Sidebar - sempre escura"). O efeito colateral so aparecia no tema claro:
 * tudo que a sidebar hospeda mas NAO desenha — o `ThemeToggle` (`variant
 * outline`, que resolve `--border`/`--background`/`--foreground` globais) e o
 * `LogoutButton` (`--destructive` global) — renderizava com a paleta CLARA
 * sobre um fundo ESCURO. E o que o dono descreve como "buga e fica preta":
 * nao e um bug de renderizacao, e um painel escuro cercado de tokens claros.
 *
 * A correcao nao e trocar uma variavel. Toda a familia `--sidebar-*` estava
 * calibrada para fundo escuro, entao cada token ganha valor proprio no tema
 * claro e cada par novo entra em `TOKEN_PAIRS` — token sem par nao e
 * policiado, e ja houve precedente de utilitaria que ficou meses sem existir
 * porque a catraca media so as variaveis.
 *
 * Este arquivo NAO reimplementa a matematica de contraste: ele executa a
 * propria catraca (`token-contrast.mjs`) e le o veredito. Assim o teste e a
 * catraca nunca divergem — e um `import` do `.mjs` foi evitado de proposito,
 * porque `scripts/` esta fora do `include` do tsconfig e o `next build` roda
 * `tsc`.
 *
 * Nota de seguranca (CLAUDE.md): nenhuma execucao de regex com estado aqui —
 * so `.split()`, `.startsWith()` e `.includes()`.
 */

const raiz = process.cwd();
const ler = (rel: string) => readFileSync(join(raiz, rel), "utf8");

const css = ler("src/app/globals.css");
const sidebarNav = ler("src/components/sidebar-nav.tsx");
const appLayout = ler("src/app/(app)/layout.tsx");
const script = ler("scripts/design-tokens/token-contrast.mjs");

/**
 * Remove comentarios antes de procurar por classe crua. Sem isto, um
 * comentario explicando *por que* `text-white` saiu faria o teste reprovar a
 * propria correcao — e o incentivo viraria apagar a explicacao. Mesma
 * precaucao do `stripComments` de `token-contrast.mjs`.
 *
 * O `//` so e cortado quando abre a linha (apos indentacao), para nao mutilar
 * `https://` nem o `/` de uma expressao.
 */
function semComentarios(fonte: string): string {
  const semBloco = fonte
    .split("/*")
    .map((parte, i) => (i === 0 ? parte : parte.split("*/").slice(1).join("*/")))
    .join("");
  return semBloco
    .split("\n")
    .filter((linha) => !linha.trim().startsWith("//"))
    .join("\n");
}

const sidebarNavCodigo = semComentarios(sidebarNav);
const appLayoutCodigo = semComentarios(appLayout);
const cssCodigo = semComentarios(css);

// --- leitura da catraca -------------------------------------------------

type Linha = { par: string; tema: string; razao: number; minimo: number; resultado: string };

const saida = execFileSync("node", ["scripts/design-tokens/token-contrast.mjs"], {
  cwd: raiz,
  encoding: "utf8",
});

const linhas: Linha[] = saida
  .split("\n")
  .map((l) => l.split(" | "))
  .filter((cols) => cols.length === 5 && (cols[1] === "light" || cols[1] === "dark"))
  .map((cols) => ({
    // "fg/bg (rotulo)" -> "fg/bg"
    par: cols[0].split(" (")[0].trim(),
    tema: cols[1].trim(),
    razao: Number(cols[2]),
    minimo: Number(cols[3]),
    resultado: cols[4].trim(),
  }));

function medida(par: string, tema: "light" | "dark"): Linha {
  const achada = linhas.find((l) => l.par === par && l.tema === tema);
  if (!achada) {
    throw new Error(
      `par ${par} nao e medido pela catraca no tema ${tema} — token sem par nao e policiado`
    );
  }
  return achada;
}

/**
 * Valor de L (lightness OKLCH, 0-1) do token dentro do bloco `seletor`.
 * Le do CSS SEM comentarios: cada token da familia e precedido de um bloco de
 * comentario explicando o papel dele, e esse bloco viaja junto na hora de
 * fatiar por `;` — a declaracao passaria a "comecar" pelo comentario e o
 * `startsWith` nunca casaria.
 */
function lightnessDoToken(seletor: string, token: string): number {
  const blocos = cssCodigo.split(`${seletor} {`);
  if (blocos.length < 2) throw new Error(`bloco ${seletor} nao encontrado`);
  const corpo = blocos[1].split("\n}")[0];
  const decls = corpo.split(";").map((d) => d.trim());
  const decl = decls.find((d) => d.startsWith(`--${token}:`));
  if (!decl) throw new Error(`--${token} ausente em ${seletor}`);
  const dentro = decl.split("oklch(")[1];
  if (!dentro) throw new Error(`--${token} em ${seletor} nao e oklch()`);
  return Number(dentro.split(")")[0].trim().split(/\s+/)[0]);
}

// --- 1. a superficie ----------------------------------------------------

describe("a sidebar acompanha o tema", () => {
  it("no tema claro a sidebar e uma superficie CLARA", () => {
    // Criterio absoluto de proposito: nao basta ser "menos escura", tem de
    // estar do lado claro da escala junto de --card (0.995) e --background
    // (0.985). Antes: 0.19.
    expect(lightnessDoToken(":root", "sidebar")).toBeGreaterThan(0.9);
  });

  it("no tema claro o texto da sidebar inverte junto com o fundo", () => {
    // Fundo claro pede texto escuro. Se `--sidebar-foreground` continuasse
    // quase-branco (0.985) o rotulo sumiria — e assim que a familia "sempre
    // escura" quebra quando so o fundo e trocado.
    expect(lightnessDoToken(":root", "sidebar-foreground")).toBeLessThan(0.35);
  });

  it("no tema escuro nada muda: a sidebar continua escura", () => {
    expect(lightnessDoToken(".dark", "sidebar")).toBe(0.17);
    expect(lightnessDoToken(".dark", "sidebar-accent")).toBe(0.28);
    expect(lightnessDoToken(".dark", "sidebar-foreground")).toBe(0.985);
    expect(lightnessDoToken(".dark", "sidebar-muted")).toBe(0.65);
    expect(lightnessDoToken(".dark", "sidebar-primary")).toBe(0.68);
    expect(lightnessDoToken(".dark", "sidebar-border")).toBe(0.32);
  });

  it("o comentario que declarava a sidebar 'sempre escura' saiu do CSS", () => {
    expect(cssCodigo.includes("sempre escura")).toBe(false);
  });
});

// --- 2. contraste, medido pela propria catraca --------------------------

describe("contraste de cada elemento da sidebar, nos dois temas", () => {
  const TEXTO: Array<[string, string]> = [
    ["titulo 'BFX Manager' e nome do usuario", "sidebar-foreground/sidebar"],
    ["rotulo de item inativo e de grupo", "sidebar-muted/sidebar"],
    ["rotulo e icone do item em hover", "sidebar-muted/sidebar-accent"],
    ["rotulo do item ativo", "sidebar-accent-foreground/sidebar-accent"],
    ["icone do item em hover, no chip da marca", "sidebar-accent-foreground/sidebar-primary-bg"],
    ["icone da marca sobre a sidebar", "sidebar-primary/sidebar"],
    ["badge NOVO — texto no tint da marca", "sidebar-primary/sidebar-primary-bg"],
    ["badge de contagem — texto no preenchimento", "sidebar-primary-foreground/sidebar-primary"],
  ];

  for (const [rotulo, par] of TEXTO) {
    it.each(["light", "dark"] as const)(`${rotulo} (%s) >= 4.5:1`, (tema) => {
      const m = medida(par, tema);
      expect(m.minimo).toBe(4.5);
      expect(m.resultado).toBe("PASS");
      expect(m.razao).toBeGreaterThanOrEqual(4.5);
    });
  }

  const GRAFICO: Array<[string, string]> = [
    ["indicador do item ativo", "sidebar-primary/sidebar-accent"],
    ["anel de foco", "sidebar-ring/sidebar"],
    ["icone do logo — extremo claro do gradiente", "gradient-cta-foreground/gradient-cta-from"],
  ];

  for (const [rotulo, par] of GRAFICO) {
    it.each(["light", "dark"] as const)(`${rotulo} (%s) >= 3:1`, (tema) => {
      const m = medida(par, tema);
      expect(m.resultado).toBe("PASS");
      expect(m.razao).toBeGreaterThanOrEqual(3);
    });
  }

  it.each(["light", "dark"] as const)(
    "icone do logo — extremo escuro do gradiente (%s) >= 4.5:1",
    (tema) => {
      const m = medida("gradient-cta-foreground/gradient-cta-to", tema);
      expect(m.resultado).toBe("PASS");
      expect(m.razao).toBeGreaterThanOrEqual(4.5);
    }
  );

  it("a catraca inteira continua verde", () => {
    expect(saida.includes(", 0 reprovaram")).toBe(true);
  });
});

// --- 3. os 3 pontos de um token novo ------------------------------------

describe("os tokens novos existem nos tres pontos", () => {
  const NOVOS = ["sidebar-muted", "sidebar-primary-bg", "gradient-cta-foreground"];

  it.each(NOVOS)("--%s tem valor em :root e em .dark", (nome) => {
    expect(() => lightnessDoToken(":root", nome)).not.toThrow();
    expect(() => lightnessDoToken(".dark", nome)).not.toThrow();
  });

  it.each(NOVOS)("--%s tem chave --color-* no bloco @theme", (nome) => {
    // Sem a chave no @theme o Tailwind v4 nao gera a utilitaria e a cor cai
    // silenciosamente para a herdada do pai (achado 1 da fase 18).
    expect(cssCodigo.includes(`--color-${nome}: var(--${nome});`)).toBe(true);
  });

  it("os pares novos estao declarados em TOKEN_PAIRS", () => {
    // Redundante com os testes de contraste acima (que ja falham se o par nao
    // for medido), mas falha com uma mensagem que aponta a causa.
    for (const par of [
      "sidebar-muted",
      "sidebar-primary-bg",
      "gradient-cta-foreground",
    ]) {
      expect(script.includes(par), `nenhum par usa ${par}`).toBe(true);
    }
  });
});

// --- 4. os consumidores -------------------------------------------------

describe("os consumidores acompanham os tokens", () => {
  it("a sidebar nao tem mais cor crua branca", () => {
    // `text-white` sobre um fundo que muda de tema e o erro classico: dava
    // 3.41:1 (claro) e 3.15:1 (escuro) sobre `--sidebar-primary`. E `bg-white/5`
    // no chip do icone e literalmente invisivel sobre fundo claro.
    expect(sidebarNavCodigo.includes("text-white")).toBe(false);
    expect(sidebarNavCodigo.includes("bg-white/")).toBe(false);
    expect(appLayoutCodigo.includes("text-white")).toBe(false);
  });

  it("o badge de contagem usa o par de tokens do preenchimento", () => {
    expect(
      sidebarNavCodigo.includes("bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)]")
    ).toBe(true);
  });

  it("o chip do icone e o badge NOVO usam o tint OPACO, nao o composto /20", () => {
    // O composto da propria matiz escurece o tom e derruba o texto abaixo de
    // 4.5 mesmo com o token certo — e o composto nao e mensuravel pela catraca.
    expect(sidebarNavCodigo.includes("var(--sidebar-primary)]/20")).toBe(false);
    expect(sidebarNavCodigo.includes("var(--sidebar-primary)]/15")).toBe(false);
    expect(sidebarNavCodigo.includes("bg-[var(--sidebar-primary-bg)]")).toBe(true);
  });

  it("nenhum texto da sidebar renderiza com opacidade parcial", () => {
    // `text-[var(--sidebar-muted)]/80` media 4.17:1 no escuro: a catraca
    // aprovava o token e a tela reprovava o pixel.
    expect(sidebarNavCodigo.includes("text-[var(--sidebar-muted)]/80")).toBe(false);
    expect(sidebarNavCodigo.includes("var(--sidebar-accent)]/80")).toBe(false);
  });

  it("o item ativo usa o par accent/accent-foreground", () => {
    expect(
      sidebarNavCodigo.includes(
        "bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]"
      )
    ).toBe(true);
  });

  it("o container da sidebar nao forca mais color-scheme: dark", () => {
    // `.sidebar-dark` fixava `color-scheme: dark` no painel. Com a sidebar
    // clara isso pintaria a barra de rolagem e os controles nativos de escuro
    // dentro de uma superficie clara.
    expect(appLayoutCodigo.includes("sidebar-dark")).toBe(false);
    expect(cssCodigo.includes(".sidebar-dark")).toBe(false);
  });

  it("o logo usa o gradiente da marca e o token de icone", () => {
    // O gradiente da marca e decorativo e identico nos dois temas — desacoplar
    // do `--sidebar-primary` mantem o simbolo estavel enquanto a paleta da
    // sidebar inverte.
    expect(appLayoutCodigo.includes("from-gradient-cta-from to-gradient-cta-to")).toBe(true);
    expect(appLayoutCodigo.includes("text-gradient-cta-foreground")).toBe(true);
  });
});
