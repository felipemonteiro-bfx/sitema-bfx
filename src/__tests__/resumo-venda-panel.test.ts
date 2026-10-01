import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ResumoVendaPanel } from "@/components/resumo-venda-panel";
import { simularMargemVenda } from "@/lib/simular-margem-venda";

/** Venda de 1000 com 50 de desconto já abatido: subtotal 1000 + frete 50 − desconto 50. */
function entrada(): Parameters<typeof simularMargemVenda>[0] {
  return {
    dataVenda: "2026-01-01",
    formaPagamento: "PIX",
    subtotalProdutos: 1000,
    custoProdutos: 400,
    frete: 50,
    envio: 30,
    desconto: 50,
    temNota: false,
    taxaNotaPct: 0,
    comissaoPct: 10,
    parcelas: [],
    numParcelas: 1,
    repassePct: null,
    disponivelAntes: null,
  };
}

const simulacao = simularMargemVenda(entrada());

function render() {
  return renderToStaticMarkup(React.createElement(ResumoVendaPanel, { simulacao, comissaoPct: 10 }));
}

/** Trecho da lista "Custos da venda" (o `<dl>`). */
function listaDeCustos(markup: string): string {
  const inicio = markup.indexOf("<dl");
  const fim = markup.indexOf("</dl>", inicio);
  return markup.slice(inicio, fim);
}

describe("ResumoVendaPanel — custos da venda", () => {
  it("o desconto nao entra na lista de custos: ele ja saiu do total, somar de novo dobraria a conta", () => {
    expect(listaDeCustos(render())).not.toContain("Desconto");
  });

  it("o desconto continua visivel, dito como ja abatido do total", () => {
    const markup = render();
    expect(markup).toContain("já abatido do total");
    expect(markup).toContain("R$ 50,00");
  });

  it("sem desconto, nada de linha de desconto", () => {
    const semDesconto = simularMargemVenda({ ...entrada(), desconto: 0, frete: 0 });
    const markup = renderToStaticMarkup(React.createElement(ResumoVendaPanel, { simulacao: semDesconto }));
    expect(markup).not.toContain("já abatido do total");
  });
});
