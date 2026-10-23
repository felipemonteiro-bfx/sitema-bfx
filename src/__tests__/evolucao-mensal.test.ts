import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { EvolucaoMensal } from "@/components/evolucao-mensal";

type Props = Parameters<typeof EvolucaoMensal>[0];
const render = (p: Props) => renderToString(createElement(EvolucaoMensal, p)).split("<!-- -->").join("");

const mes = (rotulo: string, faturamento: number, custoVariavel: number) => ({
  rotulo,
  rotuloCompleto: `${rotulo}/2026`,
  faturamento,
  custoVariavel,
  margem: faturamento - custoVariavel,
});

const seis = [
  mes("mai", 4140, 2683),
  mes("jun", 13483, 9896),
  mes("jul", 26120, 19984),
  mes("ago", 46411, 34946),
  mes("set", 20466, 14932),
  mes("out", 6275, 6238),
];

describe("EvolucaoMensal (SSR)", () => {
  it("uma coluna focável por mês, com aria-label completo", () => {
    const html = render({ meses: seis });
    expect(html.split('tabindex="0"').length - 1).toBe(6);
    // BRL usa espaço não quebrável depois do "R$"
    expect(html).toMatch(/aria-label="mai\/2026: faturamento R\$\s4\.140,00, custo R\$\s2\.683,00, margem R\$\s1\.457,00"/);
  });

  it("tooltip vidro no HTML, só por CSS, com a animação da dica", () => {
    const html = render({ meses: seis });
    expect(html).toContain("bg-vidro");
    expect(html).toContain("border-vidro-borda");
    expect(html).toContain("anim-dica");
    expect(html).toContain("group-hover/col:block");
    expect(html).toContain("group-focus-within/col:block");
    expect(html).not.toContain("onMouse");
  });

  it("legenda, eixo em mono e grade de pontos", () => {
    const html = render({ meses: seis });
    expect(html).toContain("Custo");
    expect(html).toContain("Margem");
    expect(html).toContain("50 mil");
    expect(html).toContain("font-mono");
    // O desenho vem de utilitarias nomeadas (globals.css), que leem os tokens.
    expect(html).toContain("bg-grade-pontos");
    expect(html).toContain("bg-hachura");
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toMatch(/@utility bg-grade-pontos \{[^}]*--grafico-trilha/);
    expect(css).toMatch(/@utility bg-hachura \{[^}]*--hachura-traco[^}]*--hachura-fundo/);
  });

  it("margem positiva tem topo verde (bg-primary) e as barras animam por --i", () => {
    const html = render({ meses: seis });
    expect(html).toContain("bg-primary");
    expect(html).toContain("anim-barra");
    expect(html).toContain("--i:3");
  });

  it("mês com margem negativa: sem topo verde e valor em text-error-text", () => {
    const html = render({ meses: [mes("ago", 1000, 1500)] });
    // (a legenda tem um bg-primary próprio; o topo da barra é o `min-h-1 ... bg-primary`)
    expect(html).not.toContain("min-h-1 rounded-sm bg-primary");
    expect(html).toContain("text-error-text");
    expect(render({ meses: seis })).toContain("min-h-1 rounded-sm bg-primary");
  });

  it("ancora a dica pelo índice: pontas para dentro, meio centralizado", () => {
    const html = render({ meses: seis });
    const dicas = html.split('role="tooltip"').slice(1);
    expect(dicas).toHaveLength(6);
    expect(dicas[0]).toContain("left-0");
    expect(dicas[1]).toContain("left-0");
    expect(dicas[2]).toContain("-translate-x-1/2");
    expect(dicas[3]).toContain("-translate-x-1/2");
    expect(dicas[4]).toContain("right-0");
    expect(dicas[5]).toContain("right-0");
  });

  it("modo discreto: eixo e barras/dica desfocam", () => {
    expect(render({ meses: seis }).split("bloco-sensivel").length - 1).toBeGreaterThanOrEqual(2);
  });

  it("sem meses: estado vazio, sem colunas", () => {
    const html = render({ meses: [] });
    expect(html).toContain("Sem dados suficientes");
    expect(html).not.toContain('tabindex="0"');
  });
});
