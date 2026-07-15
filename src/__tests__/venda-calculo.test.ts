import { describe, it, expect } from "vitest";
import {
  valorTotalVenda,
  produtosTexto,
  quantidadeTotal,
  custoTotalVenda,
  margemVenda,
} from "@/lib/venda-utils";

describe("valorTotalVenda", () => {
  it("multi-produto: soma subtotais + frete - desconto", () => {
    const v = {
      itens: [{ subtotal: 100 }, { subtotal: 250 }],
      valorFrete: 30,
      desconto: 20,
    };
    expect(valorTotalVenda(v)).toBe(360);
  });

  it("legado: valorVenda * quantidade + frete - desconto", () => {
    expect(valorTotalVenda({ valorVenda: 100, quantidade: 3, valorFrete: 10, desconto: 5 })).toBe(305);
  });

  it("sem frete/desconto usa defaults 0", () => {
    expect(valorTotalVenda({ itens: [{ subtotal: 200 }] })).toBe(200);
  });
});

describe("produtosTexto", () => {
  it("multi-produto lista com quantidade quando > 1", () => {
    expect(
      produtosTexto({ itens: [{ produtoNome: "Fone", quantidade: 2 }, { produtoNome: "Capa", quantidade: 1 }] })
    ).toBe("Fone (2x), Capa");
  });

  it("legado usa produtoNome, com fallback —", () => {
    expect(produtosTexto({ produtoNome: "TV" })).toBe("TV");
    expect(produtosTexto({})).toBe("—");
  });
});

describe("quantidadeTotal", () => {
  it("soma quantidades dos itens", () => {
    expect(quantidadeTotal({ itens: [{ quantidade: 2 }, { quantidade: 3 }] })).toBe(5);
  });
  it("legado usa quantidade com fallback 1", () => {
    expect(quantidadeTotal({ quantidade: 4 })).toBe(4);
    expect(quantidadeTotal({})).toBe(1);
  });
});

describe("custoTotalVenda", () => {
  it("soma custoProduto * quantidade dos itens", () => {
    expect(
      custoTotalVenda({ itens: [{ custoProduto: 50, quantidade: 2 }, { custoProduto: 30, quantidade: 1 }] })
    ).toBe(130);
  });
  it("retorna null quando itens não têm custo", () => {
    expect(custoTotalVenda({ itens: [{ custoProduto: 0, quantidade: 2 }] })).toBeNull();
  });
  it("legado: null quando custoProduto ausente", () => {
    expect(custoTotalVenda({ quantidade: 2 })).toBeNull();
    expect(custoTotalVenda({ custoProduto: 40, quantidade: 2 })).toBe(80);
  });
});

describe("margemVenda", () => {
  it("calcula (receita - custo) / receita * 100", () => {
    const v = { itens: [{ custoProduto: 60, quantidade: 1, subtotal: 100 }] };
    expect(margemVenda(v)).toBeCloseTo(40, 5);
  });
  it("retorna null quando não há dados de custo", () => {
    expect(margemVenda({ itens: [{ custoProduto: 0, quantidade: 1, subtotal: 100 }] })).toBeNull();
  });
});
