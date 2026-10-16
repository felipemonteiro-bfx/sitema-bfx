import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { KpiCard } from "@/components/kpi-card";

type Props = Parameters<typeof KpiCard>[0];
// Tira os marcadores `<!-- -->` que o React põe entre trechos de texto no SSR.
const render = (p: Props) => renderToString(createElement(KpiCard, p)).split("<!-- -->").join("");

describe("KpiCard", () => {
  // Redesign Vantage (decisão 2 do spec): o count-up saiu. Antes o teste fixava a pintura
  // inicial em "0,00" com o valor final só no sr-only; agora o SSR já entrega o valor final,
  // em font-mono, e a linha de tendência virou sparkline de barras.
  it("valor final já no SSR, em mono, com modo discreto no valor e na sparkline", () => {
    const html = render({
      rotulo: "Faturamento",
      valor: "R$ 14.960,00",
      rodape: "11 vendas · 9 clientes",
      serie: [10, 3, 8, 23, 38, 14.96],
    });
    expect(html).toContain("R$ 14.960,00");
    expect(html).not.toContain("sr-only");
    expect(html).toContain("font-mono");
    expect(html).toContain("text-kpi");
    expect(html).toContain("bg-card-elevated");
    expect(html).toContain("rounded-interno");
    expect(html).toContain("11 vendas · 9 clientes");
    expect(html).toMatch(/valor-sensivel[^>]*>R\$ 14\.960,00/);
    expect(html).toContain("bloco-sensivel");
  });

  it("sparkline: uma barra por ponto, só a última em primary, as demais inativas", () => {
    const html = render({ rotulo: "Faturamento", valor: "R$ 1,00", rodape: "x", serie: [4, 13, 26, 46, 20, 6] });
    expect(html.split("anim-barra").length - 1).toBe(6);
    expect(html.split("bg-primary").length - 1).toBe(1);
    expect(html.split("bg-grafico-inativo").length - 1).toBe(5);
    expect(html).toContain("--i:5");
    expect(html.lastIndexOf("bg-primary")).toBeGreaterThan(html.lastIndexOf("bg-grafico-inativo"));
  });

  it("sem série e com valorSensivel desligado: sem sparkline nem máscara", () => {
    const html = render({ rotulo: "Margem", valor: "29,3%", rodape: "ticket", valorSensivel: false });
    expect(html).not.toContain("anim-barra");
    expect(html).not.toContain("bloco-sensivel");
    expect(html).not.toContain("valor-sensivel");
  });

  it("série toda zerada mantém as barras (baixas, mas visíveis)", () => {
    const html = render({ rotulo: "Clientes", valor: "0", rodape: "x", serie: [0, 0, 0] });
    expect(html.split("anim-barra").length - 1).toBe(3);
  });

  it("série com um ponto só não desenha sparkline", () => {
    const html = render({ rotulo: "Clientes", valor: "9", rodape: "x", serie: [9] });
    expect(html).not.toContain("anim-barra");
  });

  it("compat com a página antiga (a D2 troca): número + formato + contexto + tendência", () => {
    const html = render({
      titulo: "Faturamento",
      icone: "carteira",
      tom: "info",
      valor: 14960,
      contexto: "11 vendas",
      variacao: { percentual: -52.04, rotulo: "vs ago" },
      tendencia: [1, 2],
    });
    expect(html).toMatch(/R\$\s14\.960,00/);
    expect(html).toContain("11 vendas");
    expect(html).toContain("52%");
    expect(html.split("anim-barra").length - 1).toBe(2);
  });
});
