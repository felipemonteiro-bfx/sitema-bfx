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
