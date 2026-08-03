// Trava de nao-regressao UXP-03 / D-04.
//
// A Fase 8 mexe no estoque exibido na venda rapida (remove alertas e teto de
// quantidade, D-03), mas a aba Estoque do `/financeiro` NAO PODE mudar de
// numero por causa disso. D-04 e explicito: "o plano deve ter um teste que
// trave isso, nao so a promessa".
//
// Os valores esperados abaixo sao numeros dourados LITERAIS, escritos a mao —
// nunca recalculados com a mesma formula de `calcularMetricasEstoque`. Se
// recalcularmos o esperado com a formula do proprio modulo, o teste concorda
// com qualquer bug introduzido na formula. Quebrar este arquivo significa
// REGRESSAO EM RELATORIO FINANCEIRO, nao teste desatualizado.
import { describe, it, expect } from "vitest";
import { calcularMetricasEstoque, type ProdutoEstoque } from "@/lib/estoque-metrics";

function produtos(): ProdutoEstoque[] {
  return [
    { nome: "A", custoPadrao: 10, qtdEstoque: 3, valorVenda: 25 },
    { nome: "B", custoPadrao: 100, qtdEstoque: 2, valorVenda: 150 },
    { nome: "C", custoPadrao: null, qtdEstoque: null, valorVenda: null },
    { nome: "D", custoPadrao: 5, qtdEstoque: 0, valorVenda: 9 },
  ];
}

describe("UXP-03 / D-04: nao-regressao das metricas de estoque do /financeiro", () => {
  it("estoqueImobilizado = 230 (10x3 + 100x2 + 0 + 5x0) — numero dourado", () => {
    const r = calcularMetricasEstoque(produtos());
    expect(r.estoqueImobilizado).toBe(230);
  });

  it("estoquePotencialReceita = 375 (25x3 + 150x2 + 0 + 9x0) — numero dourado", () => {
    const r = calcularMetricasEstoque(produtos());
    expect(r.estoquePotencialReceita).toBe(375);
  });

  it("estoqueMargemPct = 38.666...% ((375-230)/375 * 100) — numero dourado, com tolerancia de ponto flutuante", () => {
    const r = calcularMetricasEstoque(produtos());
    expect(r.estoqueMargemPct).toBeCloseTo(38.66666666666667, 9);
  });

  it("estoqueItensZerados = 2 (C por null->0 via ?? 0, D por zero explicito) — numero dourado", () => {
    const r = calcularMetricasEstoque(produtos());
    expect(r.estoqueItensZerados).toBe(2);
  });

  it("produtosOrdenados[0] = B (maior capital imobilizado primeiro) e a entrada nao e mutada", () => {
    const entrada = produtos();
    const nomesAntes = entrada.map(p => p.nome).join("");
    const r = calcularMetricasEstoque(entrada);
    expect(r.produtosOrdenados[0].nome).toBe("B");
    expect(r.produtosOrdenados[1].nome).toBe("A");
    expect(entrada.map(p => p.nome).join("")).toBe(nomesAntes);
    expect(entrada[0].nome).toBe("A");
  });

  it("lista vazia devolve as quatro metricas em zero, sem divisao por zero", () => {
    const r = calcularMetricasEstoque([]);
    expect(r.estoqueImobilizado).toBe(0);
    expect(r.estoquePotencialReceita).toBe(0);
    expect(r.estoqueMargemPct).toBe(0);
    expect(r.estoqueItensZerados).toBe(0);
    expect(r.produtosOrdenados).toEqual([]);
  });

  it("qtdEstoque negativo (-2 com custo 10) propaga como -20, sem lancar (consequencia aceita de D-03, T-08-02)", () => {
    const r = calcularMetricasEstoque([
      { nome: "N", custoPadrao: 10, qtdEstoque: -2, valorVenda: 20 },
    ]);
    expect(r.estoqueImobilizado).toBe(-20);
  });

  it("dois produtos com o mesmo capital imobilizado: a ordenacao nao derruba nenhum dos dois da lista", () => {
    const empatados: ProdutoEstoque[] = [
      { nome: "E1", custoPadrao: 20, qtdEstoque: 5, valorVenda: 30 },
      { nome: "E2", custoPadrao: 50, qtdEstoque: 2, valorVenda: 60 },
    ];
    const r = calcularMetricasEstoque(empatados);
    expect(r.produtosOrdenados).toHaveLength(2);
    expect(r.produtosOrdenados.map(p => p.nome).sort()).toEqual(["E1", "E2"]);
    expect(r.estoqueImobilizado).toBe(200);
  });

  it("fracao (custo 3.33 x qtd 3) nao e arredondada pelo modulo — arredondamento e da camada de formatacao (formatBRL)", () => {
    const r = calcularMetricasEstoque([
      { nome: "F", custoPadrao: 3.33, qtdEstoque: 3, valorVenda: 5 },
    ]);
    expect(r.estoqueImobilizado).toBeCloseTo(9.99, 9);
    expect(r.estoqueImobilizado).not.toBe(10);
  });
});
