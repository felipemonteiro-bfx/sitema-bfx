import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MOV_CURVA,
  MOV_ENTRADA_MS,
  MOV_STAGGER_MS,
  MOV_BARRA_MS,
  MOV_STAGGER_BARRA_MS,
  MOV_HOVER_MS,
  MOV_DICA_MS,
  MOV_SEGMENTADO_MS,
  MOV_NAV_MS,
} from "@/lib/motion";

/**
 * Fundacao do redesign Vantage (tarefa A, spec 2026-10-16 secao 3).
 *
 * Este teste fixa o CONTRATO de tokens que as ondas seguintes consomem. Um token
 * novo tem tres pontos — valor em `:root`, valor em `.dark` e a chave no
 * `@theme inline` — e faltar qualquer um faz a classe nao chegar a tela (foi o
 * caso de `text-destructive-foreground`, ver shadcn-bfx). Os pares de contraste
 * em `TOKEN_PAIRS` sao o quarto ponto: token sem par nao e policiado.
 *
 * Tokens que nao variam com o tema (raios, fontes, tamanhos fluidos, movimento)
 * ficam em `:root` e no `@theme inline`; repeti-los em `.dark` seria ruido.
 *
 * Nota de seguranca (CLAUDE.md): nenhuma execucao de regex com estado aqui —
 * so `.split()`, `.startsWith()` e `.includes()`.
 */

const RAIZ = process.cwd();
const css = readFileSync(join(RAIZ, "src/app/globals.css"), "utf8");
const layout = readFileSync(join(RAIZ, "src/app/layout.tsx"), "utf8");
const contraste = readFileSync(join(RAIZ, "scripts/design-tokens/token-contrast.mjs"), "utf8");

/** Remove comentarios de bloco por varredura de indice (os comentarios citam tokens). */
function semComentarios(texto: string): string {
  let saida = "";
  let i = 0;
  while (i < texto.length) {
    const ini = texto.indexOf("/*", i);
    if (ini === -1) {
      saida += texto.slice(i);
      break;
    }
    saida += texto.slice(i, ini);
    const fim = texto.indexOf("*/", ini + 2);
    if (fim === -1) break;
    i = fim + 2;
  }
  return saida;
}

/** Corpos de todos os blocos de nivel 1 cujo seletor e exatamente `seletor`. */
function corposDe(texto: string, seletor: string): string[] {
  const limpo = semComentarios(texto);
  const corpos: string[] = [];
  let i = 0;
  while (i < limpo.length) {
    const abre = limpo.indexOf("{", i);
    if (abre === -1) break;
    const sel = limpo.slice(i, abre).trim();
    let prof = 1;
    let j = abre + 1;
    while (j < limpo.length && prof > 0) {
      if (limpo[j] === "{") prof++;
      else if (limpo[j] === "}") prof--;
      j++;
    }
    if (sel === seletor) corpos.push(limpo.slice(abre + 1, j - 1));
    i = j;
  }
  return corpos;
}

/** Mapa nome -> valor das declaracoes `--x: v;` de um conjunto de corpos. */
function declaracoes(corpos: string[]): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (const corpo of corpos) {
    for (const decl of corpo.split(";")) {
      const t = decl.trim();
      if (!t.startsWith("--")) continue;
      const dois = t.indexOf(":");
      if (dois === -1) continue;
      mapa[t.slice(0, dois).trim()] = t.slice(dois + 1).trim();
    }
  }
  return mapa;
}

const root = declaracoes(corposDe(css, ":root"));
const dark = declaracoes(corposDe(css, ".dark"));
const tema = declaracoes(corposDe(css, "@theme inline"));

/** Tokens de COR: nome do token -> chave `--color-*` esperada no @theme. */
const TOKENS_DE_COR = [
  "shell",
  "shell-borda",
  "painel-borda",
  "poco",
  "controle",
  "controle-ativo",
  "divisoria",
  "marca-tint",
  "marca-tint-texto",
  "texto-secundario",
  "hachura-traco",
  "hachura-fundo",
  "grafico-neutro",
  "grafico-trilha",
  "grafico-inativo",
  "vidro",
  "vidro-borda",
  "vidro-piso",
];

const RAIOS = ["shell", "painel", "interno", "controle"];

describe("tokens de cor do redesign: tres pontos cada", () => {
  for (const nome of TOKENS_DE_COR) {
    it(`--${nome} existe em :root, em .dark e como --color-${nome} no @theme inline`, () => {
      expect(root[`--${nome}`], `:root sem --${nome}`).toBeTruthy();
      expect(dark[`--${nome}`], `.dark sem --${nome}`).toBeTruthy();
      expect(tema[`--color-${nome}`], `@theme sem --color-${nome}`).toBe(`var(--${nome})`);
    });
  }

  it("valores sao oklch (a catraca de contraste so le oklch)", () => {
    for (const nome of TOKENS_DE_COR) {
      expect(root[`--${nome}`].startsWith("oklch("), `:root --${nome}`).toBe(true);
      expect(dark[`--${nome}`].startsWith("oklch("), `.dark --${nome}`).toBe(true);
    }
  });

  it("o vidro tem fallback opaco para quem nao tem backdrop-filter", () => {
    // O alfa do vidro faz a catraca marcar o par como SKIP, entao o piso opaco
    // precisa existir no proprio CSS: sem ele, o tooltip fica ilegivel onde o
    // blur nao e suportado.
    const alvo = css.split("@supports not")[1] ?? "";
    expect(alvo.includes("--vidro: var(--vidro-piso)")).toBe(true);
  });
});

describe("raios, fontes e tamanhos fluidos", () => {
  for (const nome of RAIOS) {
    it(`--radius-${nome} existe em :root e no @theme inline`, () => {
      expect(root[`--radius-${nome}`]).toBeTruthy();
      expect(tema[`--radius-${nome}`]).toBeTruthy();
    });
  }

  it("valores dos raios batem com a spec (24, 20, 14 e 12 px)", () => {
    expect(root["--radius-shell"]).toBe("24px");
    expect(root["--radius-painel"]).toBe("20px");
    expect(root["--radius-interno"]).toBe("14px");
    expect(root["--radius-controle"]).toBe("12px");
  });

  it("--font-mono aponta para Geist Mono; sans e display para as fontes existentes", () => {
    expect(tema["--font-mono"]).toContain("var(--font-geist-mono)");
    expect(tema["--font-sans"]).toContain("var(--font-manrope)");
    expect(tema["--font-display"]).toContain("var(--font-space-grotesk)");
    expect(root["--font-mono"]).toContain("var(--font-geist-mono)");
  });

  it("--text-titulo e --text-kpi sao fluidos (clamp) no @theme inline", () => {
    expect(tema["--text-titulo"].startsWith("clamp(")).toBe(true);
    expect(tema["--text-kpi"].startsWith("clamp(")).toBe(true);
  });

  it("layout.tsx carrega Geist_Mono como --font-geist-mono, com swap, e o liga ao body", () => {
    expect(layout.includes("Geist_Mono")).toBe(true);
    expect(layout.includes('variable: "--font-geist-mono"')).toBe(true);
    expect(layout.includes("geistMono.variable")).toBe(true);
    // display swap em todas as fontes (a terceira fonte nao pode travar o texto)
    expect(layout.split('display: "swap"').length - 1).toBe(3);
  });

  it("themeColor usa os hex novos da pagina (claro #ECEEEC, escuro #070807)", () => {
    expect(layout.includes('color: "#ECEEEC"')).toBe(true);
    expect(layout.includes('color: "#070807"')).toBe(true);
    expect(layout.includes("#0f172a")).toBe(false);
  });
});

describe("cor da marca e neutros", () => {
  it("--primary nao mudou nos dois temas", () => {
    expect(root["--primary"].startsWith("oklch(0.52 0.177 142.6)")).toBe(true);
    expect(dark["--primary"].startsWith("oklch(0.76 0.16 142.6)")).toBe(true);
  });

  it("--ring e o verde da marca nos dois temas", () => {
    expect(root["--ring"].startsWith("oklch(0.52 0.177 142.6)")).toBe(true);
    expect(dark["--ring"].startsWith("oklch(0.76 0.16 142.6)")).toBe(true);
  });

  it("o fundo do body nao tem mais gradiente", () => {
    const base = corposDe(css, "@layer base").join("\n");
    expect(base.includes("radial-gradient")).toBe(false);
    expect(base.includes("background-attachment")).toBe(false);
  });

  it("body usa --font-sans e os titulos --font-display", () => {
    const base = corposDe(css, "@layer base").join("\n");
    expect(base.includes("var(--font-sans)")).toBe(true);
    expect(base.includes("var(--font-display)")).toBe(true);
  });

  it(".page-title usa --foreground, nao o verde", () => {
    const corpo = corposDe(css, ".page-title")[0] ?? "";
    expect(corpo.includes("var(--foreground)")).toBe(true);
    expect(corpo.includes("var(--primary)")).toBe(false);
  });

  it(".tabular-nums usa a fonte mono", () => {
    const corpo = corposDe(css, ".tabular-nums")[0] ?? "";
    expect(corpo.includes("font-family: var(--font-mono)")).toBe(true);
    expect(corpo.includes("font-variant-numeric: tabular-nums")).toBe(true);
  });
});

describe("movimento", () => {
  it("tokens --mov-* existem em :root com os valores da spec", () => {
    expect(root["--mov-curva"]).toBe("cubic-bezier(.22,1,.36,1)");
    expect(root["--mov-entrada"]).toBe("320ms");
    expect(root["--mov-stagger"]).toBe("40ms");
    expect(root["--mov-barra"]).toBe("480ms");
    expect(root["--mov-stagger-barra"]).toBe("30ms");
    expect(root["--mov-hover"]).toBe("160ms");
    expect(root["--mov-dica"]).toBe("140ms");
    expect(root["--mov-segmentado"]).toBe("220ms");
    expect(root["--mov-nav"]).toBe("120ms");
  });

  it("as constantes de src/lib/motion.ts batem com o CSS", () => {
    const ms = (v: string) => Number(v.replace("ms", ""));
    expect(MOV_CURVA).toBe(root["--mov-curva"]);
    expect(MOV_ENTRADA_MS).toBe(ms(root["--mov-entrada"]));
    expect(MOV_STAGGER_MS).toBe(ms(root["--mov-stagger"]));
    expect(MOV_BARRA_MS).toBe(ms(root["--mov-barra"]));
    expect(MOV_STAGGER_BARRA_MS).toBe(ms(root["--mov-stagger-barra"]));
    expect(MOV_HOVER_MS).toBe(ms(root["--mov-hover"]));
    expect(MOV_DICA_MS).toBe(ms(root["--mov-dica"]));
    expect(MOV_SEGMENTADO_MS).toBe(ms(root["--mov-segmentado"]));
    expect(MOV_NAV_MS).toBe(ms(root["--mov-nav"]));
  });

  it("keyframes entrar, crescer-y e dica existem e so mexem em transform/opacity", () => {
    for (const nome of ["entrar", "crescer-y", "dica"]) {
      const pedaco = css.split(`@keyframes ${nome} `)[1];
      expect(pedaco, `@keyframes ${nome}`).toBeTruthy();
      const corpo = pedaco.split("\n}\n")[0];
      for (const decl of corpo.split(";")) {
        const t = decl.trim();
        if (!t.includes(":") || t.includes("{") ) continue;
        const prop = t.split(":")[0].trim();
        expect(["opacity", "transform"].includes(prop), `${nome}: ${prop}`).toBe(true);
      }
    }
    expect(css.split("@keyframes entrar ")[1].includes("translateY(8px)")).toBe(true);
    expect(css.split("@keyframes dica ")[1].includes("translateY(4px)")).toBe(true);
    expect(css.split("@keyframes crescer-y ")[1].includes("scaleY(0)")).toBe(true);
  });

  it("classes de animacao usam os tokens e o atraso por --i", () => {
    const entrada = corposDe(css, ".anim-entrada")[0] ?? "";
    const barra = corposDe(css, ".anim-barra")[0] ?? "";
    const dica = corposDe(css, ".anim-dica")[0] ?? "";
    expect(entrada.includes("animation-delay: calc(var(--i, 0) * var(--mov-stagger))")).toBe(true);
    expect(entrada.includes("var(--mov-entrada)")).toBe(true);
    expect(barra.includes("animation-delay: calc(var(--i, 0) * var(--mov-stagger-barra))")).toBe(true);
    expect(barra.includes("transform-origin: bottom")).toBe(true);
    expect(barra.includes("var(--mov-barra)")).toBe(true);
    expect(dica.includes("var(--mov-dica)")).toBe(true);
    expect(dica.includes("animation-delay: calc(var(--i, 0) * var(--mov-stagger))")).toBe(true);
  });

  it("prefers-reduced-motion zera animacao e transicao das tres classes", () => {
    const reduzido = css
      .split("@media (prefers-reduced-motion: reduce)")
      .slice(1)
      .map((p) => p.split("\n}\n")[0])
      .join("\n");
    for (const classe of [".anim-entrada", ".anim-barra", ".anim-dica"]) {
      expect(reduzido.includes(classe), classe).toBe(true);
    }
    expect(reduzido.includes("animation: none")).toBe(true);
    expect(reduzido.includes("transition: none")).toBe(true);
  });
});

describe("pares de contraste novos em TOKEN_PAIRS", () => {
  const tabela = contraste.split("export const TOKEN_PAIRS")[1].split("// --- CLI")[0];
  const normalizada = tabela.split(/\s+/).join(" ");

  const tem = (fg: string, bg: string, min: "TEXT_MIN" | "NON_TEXT_MIN") =>
    normalizada.includes(`foreground: "${fg}", background: "${bg}", min: ${min}`);

  it("texto secundario sobre card, poco e card elevado (4.5)", () => {
    expect(tem("texto-secundario", "card", "TEXT_MIN")).toBe(true);
    expect(tem("texto-secundario", "poco", "TEXT_MIN")).toBe(true);
    expect(tem("texto-secundario", "card-elevated", "TEXT_MIN")).toBe(true);
  });

  it("texto da marca sobre o tint da marca (4.5)", () => {
    expect(tem("marca-tint-texto", "marca-tint", "TEXT_MIN")).toBe(true);
  });

  it("primary sobre card e poco", () => {
    expect(tem("primary", "card", "TEXT_MIN")).toBe(true);
    expect(tem("primary", "poco", "NON_TEXT_MIN")).toBe(true);
  });

  it("foreground e muted-foreground sobre shell, poco, controle e controle-ativo (4.5)", () => {
    for (const fg of ["foreground", "muted-foreground"]) {
      for (const bg of ["shell", "poco", "controle", "controle-ativo"]) {
        expect(tem(fg, bg, "TEXT_MIN"), `${fg}/${bg}`).toBe(true);
      }
    }
  });

  it("grafico-neutro e hachura-traco sobre poco (3:1)", () => {
    expect(tem("grafico-neutro", "poco", "NON_TEXT_MIN")).toBe(true);
    expect(tem("hachura-traco", "poco", "NON_TEXT_MIN")).toBe(true);
  });
});
