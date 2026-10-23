import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HistoricoLinhaVenda, HistoricoProdutosToggle } from "@/components/historico-produtos-expansiveis";

function renderizar(itens: { produtoNome: string; quantidade: number; subtotal: number }[]) {
  return renderToStaticMarkup(h("table", null, h("tbody", null,
    h(HistoricoLinhaVenda, { vendaId: 42, itens, children: h("td", null, h(HistoricoProdutosToggle)) })
  )));
}

describe("produtos expansíveis do Histórico", () => {
  it("associa o botão à linha de detalhes inicialmente recolhida e preserva os itens", () => {
    const html = renderizar([
      { produtoNome: "Produto com nome completo sem abreviação", quantidade: 2, subtotal: 1200 },
      { produtoNome: "Segundo produto", quantidade: 1, subtotal: 300 },
    ]);
    const controles = html.match(/aria-controls="([^"]+)"/)?.[1];
    expect(controles).toBeTruthy();
    expect(html).toContain(`id="${controles}"`);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-label="Mostrar produtos da venda 42"');
    expect(html).toContain('colSpan="10"');
    expect(html).toContain("hidden=");
    expect(html).toContain("Produto com nome completo sem abreviação");
    expect(html).toContain("Segundo produto");
    expect(html).toContain("1.200,00");
    expect(html).toContain("300,00");
  });

  it("não oferece expansão para uma venda com apenas um produto", () => {
    const html = renderizar([{ produtoNome: "Produto único", quantidade: 1, subtotal: 300 }]);
    expect(html).not.toContain("aria-expanded");
    expect(html).not.toContain("colSpan");
  });
});
