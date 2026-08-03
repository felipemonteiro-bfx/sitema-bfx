// Testes da politica de teto de quantidade na venda rapida (UXP-02, D-03).
//
// D-03 (decisao do Andre, 2026-08-03): o teto de quantidade baseado em estoque
// disponivel sai da venda rapida. `aplicarTetoQuantidade` existe apenas como
// costura de reversibilidade — se o teto um dia voltar, volta aqui dentro,
// testado, e nao espalhado no componente.
import { describe, it, expect } from "vitest";
import { aplicarTetoQuantidade } from "@/lib/estoque-venda-policy";

describe("UXP-02: aplicarTetoQuantidade nao recorta a quantidade digitada (D-03)", () => {
  it("devolve 12 quando o estoque disponivel e 3 (quantidade acima do estoque nao e recortada)", () => {
    expect(aplicarTetoQuantidade(12, 3)).toBe(12);
  });

  it("devolve 12 quando o estoque disponivel e 0 (estoque zerado nao bloqueia)", () => {
    expect(aplicarTetoQuantidade(12, 0)).toBe(12);
  });

  it("devolve 12 quando o estoque disponivel e null (produto sem estoque cadastrado)", () => {
    expect(aplicarTetoQuantidade(12, null)).toBe(12);
  });

  it("devolve 7 quando chamada com um unico argumento (como o componente chama)", () => {
    expect(aplicarTetoQuantidade(7)).toBe(7);
  });

  it("devolve 1 quando a quantidade digitada e menor que o estoque (tambem passa inalterada)", () => {
    expect(aplicarTetoQuantidade(1, 100)).toBe(1);
  });
});
