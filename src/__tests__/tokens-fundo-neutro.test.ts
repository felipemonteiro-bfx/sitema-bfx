import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * UXP-05, D-01: os tokens de fundo/superficie do tema claro em `globals.css`
 * devem ter croma 0 — nenhum componente de cor. O tom creme anterior vinha de
 * `oklch(0.985 0.01 90)` (croma 0.01, matiz 90). Ver 08-CONTEXT.md e
 * 08-EVIDENCE-UXP-04.md para a investigacao que fechou UXP-04 e motivou D-01.
 *
 * O parser abaixo e identico ao one-liner de `<verify>` do plano (mesmo
 * algoritmo, para os dois gates concordarem): nunca usa o metodo de execucao
 * de regex bloqueado pelo hook de seguranca do CLAUDE.md — so `.split()`,
 * `.startsWith()` e `.includes()`.
 */

const CSS_PATH = join(process.cwd(), "src/app/globals.css");

type TokenAchado = {
  alvo: string;
  valor: string;
  croma: number;
};

function parseRootTokens(css: string): TokenAchado[] {
  const alvos = ["--background", "--card", "--popover", "--glass-bg"];
  const achados: TokenAchado[] = [];

  for (const bloco of css.split("}")) {
    const partes = bloco.split("{");
    if (partes.length < 2) continue;
    const seletor = partes[0]
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .pop() || "";
    if (seletor !== ":root") continue;

    for (const linha of partes.slice(1).join("{").split("\n")) {
      const t = linha.trim();
      for (const alvo of alvos) {
        if (!t.startsWith(alvo + ":")) continue;
        const valor = t.split(":").slice(1).join(":").split(";")[0].trim();
        const nums = valor
          .replace("oklch(", "")
          .split(")")[0]
          .split("/")[0]
          .trim()
          .split(/\s+/);
        achados.push({ alvo, valor, croma: Number(nums[1]) });
      }
    }
  }

  return achados;
}

function encontrar(achados: TokenAchado[], alvo: string): TokenAchado {
  const item = achados.find((a) => a.alvo === alvo);
  if (!item) throw new Error(`token ${alvo} nao encontrado em nenhum bloco :root`);
  return item;
}

const css = readFileSync(CSS_PATH, "utf8");
const achados = parseRootTokens(css);

describe("tokens de fundo neutro do tema claro (UXP-05, D-01)", () => {
  it("--background tem croma 0", () => {
    expect(encontrar(achados, "--background").croma).toBe(0);
  });

  it("--card tem croma 0", () => {
    expect(encontrar(achados, "--card").croma).toBe(0);
  });

  it("--popover tem croma 0", () => {
    expect(encontrar(achados, "--popover").croma).toBe(0);
  });

  it("--glass-bg tem croma 0 e mantem o alfa de 80%", () => {
    const glass = encontrar(achados, "--glass-bg");
    expect(glass.croma).toBe(0);
    expect(glass.valor).toContain("80%");
  });

  it("encontra exatamente 4 tokens-alvo no tema claro, sem passar por vacuidade", () => {
    expect(achados).toHaveLength(4);
    expect(achados.map((a) => a.alvo).sort()).toEqual(
      ["--background", "--card", "--glass-bg", "--popover"].sort(),
    );
  });

  // Redesign Vantage (2026-10-16): D-01 (croma 0 no CLARO) segue de pe e e
  // exatamente o que os testes acima guardam. O que mudou e o ESCURO: a pagina
  // deixou o azul-marinho OLED (croma 0.02, matiz 250) pelo neutro esverdeado de
  // croma baixissimo dos artboards aprovados (#070807). Decisao: o claro fica
  // em croma 0 (oklch(L 0 0)) e o artboard cede o verde de 0.003 — imperceptivel;
  // o escuro segue o artboard.
  it("bloco .dark usa a pagina esverdeada de croma baixissimo (#070807), sem o azul 250", () => {
    expect(css.includes("--background: oklch(0.132 0.003 145.4)")).toBe(true);
    expect(css.includes("--background: oklch(0.10 0.02 250)")).toBe(false);
  });
});
