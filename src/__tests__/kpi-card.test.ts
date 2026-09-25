import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { KpiCard } from "@/components/kpi-card";

type Props = Parameters<typeof KpiCard>[0];
// Tira os marcadores `<!-- -->` que o React põe entre trechos de texto no SSR.
const render = (p: Props) => renderToString(createElement(KpiCard, p)).split("<!-- -->").join("");

describe("KpiCard", () => {
  it("renderiza no servidor com o valor final, a variação e a linha dos últimos meses", () => {
    const html = render({
      titulo: "Faturamento",
      icone: "carteira",
      tom: "info",
      valor: 14960,
      contexto: "11 vendas · 9 clientes",
      variacao: { percentual: -52.04, rotulo: "vs 1/ago–25/ago" },
      tendencia: [10, 3, 8, 23, 38, 14.96],
    });
    // Pintura inicial = começo da contagem; o valor final vai para o leitor de tela.
    // (o BRL usa espaço não quebrável depois do "R$")
    expect(html).toContain("0,00</span>");
    expect(html).toMatch(/class="sr-only">R\$\s14\.960,00/);
    expect(html).toContain("11 vendas · 9 clientes");
    expect(html).toContain("52%");
    expect(html).toContain("vs 1/ago–25/ago");
    expect(html).toContain("kpi-tendencia");
    expect(html).toContain("valor-sensivel");
    expect(html).toContain("bloco-sensivel");
  });

  it("texto no lugar do número (top vendedor) e sem variação", () => {
    const html = render({ titulo: "Top vendedor", icone: "trofeu", tom: "warning", texto: "Jakeline", valorSensivel: false, contexto: "R$ 14.960,00" });
    expect(html).toContain("Jakeline");
    expect(html).not.toContain("kpi-tendencia");
  });

  it("série com um ponto só não desenha linha", () => {
    const html = render({ titulo: "Clientes", icone: "clientes", tom: "success", valor: 9, formato: "int", contexto: "x", tendencia: [9] });
    expect(html).not.toContain("kpi-tendencia");
  });
});
