// Testes do verificador de contraste (UI-05) — `node:test`, sem dependencias.
//
// RED antes da implementacao: este arquivo e escrito e roda (falhando) antes
// de `token-contrast.mjs` existir. Depois da implementacao os testes de
// conversao/formula/parsing devem passar. O teste de integracao contra o
// `globals.css` real (ring/background) documentava a reprovacao proposital
// do plano 03 (UI-06); a partir do plano 04, que corrigiu `--ring` no tema
// claro, ele documenta a aprovacao (>=3:1) — ver token-contrast.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  oklchToSrgb,
  contrastRatio,
  parseTokens,
  checkPairs,
  parseThemeColorKeys,
  collectTextColorClasses,
  checkThemeCoverage,
  TOKEN_PAIRS,
} from "./token-contrast.mjs";

// --- oklchToSrgb ------------------------------------------------------

test("oklchToSrgb: branco (L=1, C=0) devolve rgb(255,255,255)", () => {
  const { r, g, b } = oklchToSrgb(1, 0, 0);
  assert.ok(Math.abs(r - 255) <= 1, `r=${r}`);
  assert.ok(Math.abs(g - 255) <= 1, `g=${g}`);
  assert.ok(Math.abs(b - 255) <= 1, `b=${b}`);
});

test("oklchToSrgb: preto (L=0, C=0) devolve rgb(0,0,0)", () => {
  const { r, g, b } = oklchToSrgb(0, 0, 0);
  assert.ok(Math.abs(r - 0) <= 1, `r=${r}`);
  assert.ok(Math.abs(g - 0) <= 1, `g=${g}`);
  assert.ok(Math.abs(b - 0) <= 1, `b=${b}`);
});

test("oklchToSrgb: oklch(0.985 0 0) e cinza quase branco sem desvio de matiz (croma zero)", () => {
  const { r, g, b } = oklchToSrgb(0.985, 0, 0);
  assert.equal(r, g, "r deve igualar g quando croma=0");
  assert.equal(g, b, "g deve igualar b quando croma=0");
  assert.ok(r > 240, `esperado cinza quase branco, r=${r}`);
});

test("oklchToSrgb: valores fora de gama sao fixados em 0-255, sem NaN", () => {
  const { r, g, b } = oklchToSrgb(0.7, 0.4, 30);
  for (const ch of [r, g, b]) {
    assert.ok(!Number.isNaN(ch), "canal nao pode ser NaN");
    assert.ok(ch >= 0 && ch <= 255, `canal fora de 0-255: ${ch}`);
  }
});

// --- contrastRatio ------------------------------------------------------

test("contrastRatio: branco vs preto = 21", () => {
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };
  assert.ok(Math.abs(contrastRatio(white, black) - 21) <= 0.05);
});

test("contrastRatio: branco vs branco = 1", () => {
  const white = { r: 255, g: 255, b: 255 };
  assert.ok(Math.abs(contrastRatio(white, white) - 1) <= 0.001);
});

test("contrastRatio: ordem dos argumentos nao muda o resultado", () => {
  const a = { r: 255, g: 255, b: 255 };
  const b = { r: 20, g: 20, b: 20 };
  assert.equal(contrastRatio(a, b), contrastRatio(b, a));
});

// --- parseTokens ------------------------------------------------------

const FIXTURE_CSS = `
:root {
  --radius: 0.625rem;
  --background: oklch(0.985 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(0.995 0 0);
  --ring: oklch(0.708 0 0);
  --space-4: 1rem;
  --shadow-sm: 0 1px 2px oklch(0 0 0 / 5%);
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  /* comentario com oklch(0.5 0.5 0) dentro nao conta */
  --success-bg: oklch(0.25 0.10 145 / 20%);
}

.dark {
  --background: oklch(0.10 0.02 250);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.17 0.02 250);
  --ring: oklch(0.65 0.18 145);
  --success-bg: oklch(0.25 0.10 145 / 20%);
}
`;

test("parseTokens: le --nome: oklch(...) de :root e .dark", () => {
  const { light, dark } = parseTokens(FIXTURE_CSS);
  assert.ok(light.background, "light.background ausente");
  assert.ok(dark.background, "dark.background ausente");
  assert.equal(light.background.l, 0.985);
  assert.equal(dark.background.l, 0.1);
});

test("parseTokens: ignora declaracoes que nao sao cor (--radius, --space-*, --shadow-*, --transition-*)", () => {
  const { light } = parseTokens(FIXTURE_CSS);
  assert.equal(light.radius, undefined);
  assert.equal(light["space-4"], undefined);
  assert.equal(light["shadow-sm"], undefined);
  assert.equal(light["transition-fast"], undefined);
});

test("parseTokens: marca hasAlpha=true e nao converte valores com alfa (/)", () => {
  const { light } = parseTokens(FIXTURE_CSS);
  assert.equal(light["success-bg"].hasAlpha, true);
});

test("parseTokens: ignora comentarios", () => {
  const { light } = parseTokens(FIXTURE_CSS);
  // O comentario cita um --nome ilegal (nao existe var real ali); garante
  // que nenhum token espurio com l=0.5 h=0 apareceu por causa do comentario.
  const bogus = Object.values(light).find((t) => t.l === 0.5 && t.c === 0.5);
  assert.equal(bogus, undefined);
});

// --- checkPairs ------------------------------------------------------

test("checkPairs: devolve uma linha por par por tema com razao e pass", () => {
  const tokens = parseTokens(FIXTURE_CSS);
  const pares = [{ foreground: "foreground", background: "background", min: 4.5, label: "corpo" }];
  const rows = checkPairs(tokens, pares);
  assert.equal(rows.length, 2); // light + dark
  for (const row of rows) {
    assert.ok(typeof row.ratio === "number");
    assert.ok(typeof row.pass === "boolean");
    assert.ok(row.theme === "light" || row.theme === "dark");
  }
});

test("checkPairs: par com token de alfa e reportado como skipped, nunca aprovado", () => {
  const tokens = parseTokens(FIXTURE_CSS);
  const pares = [{ foreground: "success-bg", background: "background", min: 4.5, label: "alfa" }];
  const rows = checkPairs(tokens, pares);
  for (const row of rows) {
    assert.equal(row.skipped, true);
    assert.notEqual(row.pass, true);
  }
});

test("checkPairs: ring/background no tema claro do globals.css atual aprova (UI-06, corrigido no plano 04)", async () => {
  const fs = await import("node:fs");
  const css = fs.readFileSync(new URL("../../src/app/globals.css", import.meta.url), "utf8");
  const tokens = parseTokens(css);
  const rows = checkPairs(tokens, [{ foreground: "ring", background: "background", min: 3, label: "foco" }]);
  const lightRow = rows.find((r) => r.theme === "light");
  assert.equal(lightRow.pass, true, "ring/background no tema claro deveria aprovar (>=3:1) apos o plano 04");
});

// --- cobertura do @theme (fase 18, achado 1) --------------------------
//
// Medir o PAR DE TOKENS nao prova que a cor chega a tela. No Tailwind v4 a
// utilitaria `text-X` so e gerada se `--color-X` estiver declarado no bloco
// `@theme`. `--destructive-foreground` existia e casava 4.69/6.09 com
// `--destructive` — mas `--color-destructive-foreground` nunca entrou no
// `@theme`, entao `text-destructive-foreground` nao gerava regra nenhuma, o
// texto herdava `--foreground` e o botao destrutivo media 3.23:1 no escuro.
// A catraca dava PASS o tempo todo. Estes testes cobrem o degrau que faltava:
// da variavel CSS ate a classe utilitaria.

const FIXTURE_THEME_CSS = `
@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --color-background: var(--background);
  --color-destructive: var(--destructive);
  --color-success-text: var(--success-text);
}

:root {
  --destructive: oklch(0.57 0.24 25);
  --destructive-foreground: oklch(0.985 0 0);
}
`;

test("parseThemeColorKeys: le as chaves --color-* do bloco @theme", () => {
  const keys = parseThemeColorKeys(FIXTURE_THEME_CSS);
  assert.ok(keys.has("destructive"), "--color-destructive deveria ser reconhecida");
  assert.ok(keys.has("success-text"), "--color-success-text deveria ser reconhecida");
  assert.ok(keys.has("background"));
});

test("parseThemeColorKeys: ignora o que nao e --color-* e o que esta fora do @theme", () => {
  const keys = parseThemeColorKeys(FIXTURE_THEME_CSS);
  assert.equal(keys.has("radius-sm"), false, "--radius-sm nao e cor");
  assert.equal(
    keys.has("destructive-foreground"),
    false,
    "declarado em :root, mas ausente do @theme — nao gera utilitaria"
  );
});

test("collectTextColorClasses: acha o nome usado em text-<nome>, com ou sem variante/opacidade", () => {
  const usados = collectTextColorClasses([
    'className="bg-destructive text-destructive-foreground hover:bg-destructive/90"',
    "const x = `text-success-text/80 dark:text-info hover:text-warning`;",
    'className="text-sm text-muted-foreground"',
  ]);
  assert.ok(usados.has("destructive-foreground"), "text-destructive-foreground");
  assert.ok(usados.has("success-text"), "sufixo de opacidade nao pode esconder o nome");
  assert.ok(usados.has("info"), "variante dark: nao pode esconder o nome");
  assert.ok(usados.has("warning"), "variante hover: nao pode esconder o nome");
  assert.ok(usados.has("muted-foreground"));
  // O coletor e cru de proposito: devolve tudo que aparece como `text-*`,
  // inclusive `text-sm`. Quem separa cor de tamanho e `checkThemeCoverage`,
  // que so olha os nomes presentes em TOKEN_PAIRS. Manter o coletor burro
  // evita uma lista de exclusao que envelheceria mal.
  assert.ok(usados.has("sm"), "coletor nao filtra: quem filtra e checkThemeCoverage");
});

test("checkThemeCoverage: par usado como text-* sem chave no @theme REPROVA (nunca SKIP)", () => {
  const rows = checkThemeCoverage({
    themeKeys: new Set(["destructive"]),
    usedAsText: new Set(["destructive-foreground"]),
    pairs: [{ foreground: "destructive-foreground", background: "destructive", min: 4.5, label: "texto destrutivo" }],
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].pass, false, "sem a chave no @theme a utilitaria nao existe — tem que reprovar");
  assert.notEqual(rows[0].skipped, true, "isso e uma reprovacao, nao um pulo");
  assert.ok(rows[0].reason.includes("@theme"));
});

test("checkThemeCoverage: par usado como text-* COM chave no @theme aprova", () => {
  const rows = checkThemeCoverage({
    themeKeys: new Set(["error-foreground", "error"]),
    usedAsText: new Set(["error-foreground"]),
    pairs: [{ foreground: "error-foreground", background: "error", min: 4.5, label: "texto em erro" }],
  });
  assert.equal(rows[0].pass, true);
});

// A primeira versao de `checkThemeCoverage` so olhava `par.foreground`. Isso
// deixava de fora justamente os tokens mais usados como texto que aparecem em
// `TOKEN_PAIRS` apenas do lado do FUNDO: `destructive` (59 call sites de
// `text-destructive`) e `primary` (72 de `text-primary`). Apagar
// `--color-destructive` do `@theme` reproduziria o bug original inteiro e a
// catraca continuaria verde. O criterio certo nao e "lado de texto dos pares",
// e "toda `text-X` escrita no codigo cujo X e um token de cor declarado".
test("checkThemeCoverage: exige a chave para QUALQUER text-<token declarado>, nao so o lado de texto dos pares", () => {
  const rows = checkThemeCoverage({
    themeKeys: new Set(["destructive-foreground"]),
    usedAsText: new Set(["destructive"]),
    declaredTokens: new Set(["destructive", "destructive-foreground"]),
    pairs: [{ foreground: "destructive-foreground", background: "destructive", min: 4.5, label: "x" }],
  });
  const linha = rows.find((r) => r.foreground === "destructive");
  assert.ok(linha, "text-destructive e usada no codigo e `destructive` e token declarado — tem que ser cobrada");
  assert.equal(linha.pass, false, "sem --color-destructive no @theme a utilitaria nao existe");
});

test("checkThemeCoverage: text-<algo que nao e token de cor> nao e exigido (text-sm, text-xs)", () => {
  const rows = checkThemeCoverage({
    themeKeys: new Set([]),
    usedAsText: new Set(["sm", "xs", "center"]),
    declaredTokens: new Set(["primary", "foreground"]),
    pairs: [],
  });
  assert.deepEqual(rows, [], "tamanho e alinhamento nao sao cor — nada a exigir");
});

test("collectTextColorClasses: tolera o important SUFIXO do Tailwind v4 (text-x!)", () => {
  const usados = collectTextColorClasses(['className="text-destructive-foreground! text-info!"']);
  assert.ok(usados.has("destructive-foreground"), "o `!` sufixo nao pode esconder o nome");
  assert.ok(usados.has("info"));
});

test("checkThemeCoverage: par que o codigo nao usa como text-* nao e exigido (ring, border)", () => {
  const rows = checkThemeCoverage({
    themeKeys: new Set([]),
    usedAsText: new Set(["foreground"]),
    pairs: [{ foreground: "ring", background: "background", min: 3, label: "foco" }],
  });
  assert.equal(rows.length, 0, "ring nunca e escrito como text-ring — nao ha utilitaria a exigir");
});

test("checkThemeCoverage: vale para TODOS os pares, nao so o destructive", () => {
  const pairs = [
    { foreground: "success-text", background: "card", min: 4.5, label: "sucesso" },
    { foreground: "warning-text", background: "card", min: 4.5, label: "alerta" },
  ];
  const rows = checkThemeCoverage({
    themeKeys: new Set(["success-text"]),
    usedAsText: new Set(["success-text", "warning-text"]),
    pairs,
  });
  assert.equal(rows.length, 2);
  assert.equal(rows.find((r) => r.foreground === "success-text").pass, true);
  assert.equal(rows.find((r) => r.foreground === "warning-text").pass, false);
});

test("INTEGRACAO: todo par de TOKEN_PAIRS usado como text-* no src tem chave no @theme real", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const root = new URL("../../", import.meta.url).pathname;
  const css = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");

  const arquivos = [];
  const walk = (dir) => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entrada.name);
      if (entrada.isDirectory()) walk(p);
      else if (p.endsWith(".ts") || p.endsWith(".tsx")) arquivos.push(fs.readFileSync(p, "utf8"));
    }
  };
  walk(path.join(root, "src"));

  const rows = checkThemeCoverage({
    themeKeys: parseThemeColorKeys(css),
    usedAsText: collectTextColorClasses(arquivos),
    declaredTokens: new Set(Object.keys(parseTokens(css).light)),
    pairs: TOKEN_PAIRS,
  });

  const falhas = rows.filter((r) => !r.pass).map((r) => `text-${r.foreground}`);
  assert.deepEqual(falhas, [], `utilitaria usada no codigo mas sem chave no @theme: ${falhas.join(", ")}`);
});
