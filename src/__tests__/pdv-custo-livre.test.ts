// Trava de regressao da decisao de negocio PDV-14 / D-01 / D-03.
//
// O commit `a63dc04` introduziu um piso de custo em `validarItensContraCatalogo`
// (recusar custoProduto < custoPadrao do catalogo). Esse piso foi removido de
// proposito por PDV-14 (D-01): o vendedor pode lancar qualquer custo no PDV. A
// decisao de liberar para TODOS os vendedores (nao so admin) e D-03 — decisao do
// Andre em 2026-08-03, contra a recomendacao do Grok, que sugeria restringir a
// admin. Ver nota de risco `⚠️ Revisit` no PROJECT.md.
//
// Este arquivo trava a DECISAO DE NEGOCIO, nao o detalhe de implementacao: se
// algum "hardening" futuro reintroduzir a comparacao de custo contra o catalogo,
// os testes abaixo devem quebrar, com esta explicacao a vista.
import { describe, it, expect } from "vitest";
import { validarItensContraCatalogo } from "@/lib/venda-item-validation";

function item(overrides: Partial<Parameters<typeof validarItensContraCatalogo>[0][number]> = {}) {
  return {
    produtoNome: "Fone Bluetooth X",
    custoProduto: 100,
    valorVenda: 200,
    quantidade: 1,
    subtotal: 200,
    ...overrides,
  };
}

describe("PDV-14: custo livre no PDV (trava de regressao D-01/D-03)", () => {
  it("aceita custo muito abaixo do catalogo em item unico (caso literal da demanda 7)", () => {
    const erro = validarItensContraCatalogo(
      [item({ custoProduto: 50, valorVenda: 1000, subtotal: 1000 })],
      [{ nome: "Fone Bluetooth X", custoPadrao: 700 }]
    );
    expect(erro).toBeNull();
  });

  it("aceita varios itens todos com custo abaixo do respectivo catalogo, sem piso em nenhuma posicao", () => {
    const erro = validarItensContraCatalogo(
      [
        item({ produtoNome: "A", custoProduto: 1, valorVenda: 10, subtotal: 10 }),
        item({ produtoNome: "B", custoProduto: 2, valorVenda: 20, quantidade: 2, subtotal: 40 }),
      ],
      [
        { nome: "A", custoPadrao: 900 },
        { nome: "B", custoPadrao: 900 },
      ]
    );
    expect(erro).toBeNull();
  });

  it("aceita custo zero com catalogo preenchido (limite inferior)", () => {
    const erro = validarItensContraCatalogo(
      [item({ custoProduto: 0, valorVenda: 1000, subtotal: 1000 })],
      [{ nome: "Fone Bluetooth X", custoPadrao: 700 }]
    );
    expect(erro).toBeNull();
  });

  it("custo abaixo do catalogo combinado com subtotal errado ainda e recusado, mas so pela regra de subtotal (D-01)", () => {
    const erro = validarItensContraCatalogo(
      [item({ custoProduto: 1, valorVenda: 10, quantidade: 2, subtotal: 5 })],
      [{ nome: "Fone Bluetooth X", custoPadrao: 900 }]
    );
    expect(erro).not.toBeNull();
    expect(erro).toMatch(/subtotal/i);
    expect(erro?.toLowerCase()).not.toContain("custo informado");
  });

  it("venda criada pelo chat da IA (quantidade 1, subtotal = valorVenda) com custo abaixo do catalogo tambem e aceita", () => {
    const erro = validarItensContraCatalogo(
      [item({ custoProduto: 10, valorVenda: 500, quantidade: 1, subtotal: 500 })],
      [{ nome: "Fone Bluetooth X", custoPadrao: 700 }]
    );
    expect(erro).toBeNull();
  });
});
