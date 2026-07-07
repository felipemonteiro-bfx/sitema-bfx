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

describe("validarItensContraCatalogo", () => {
  it("aceita item consistente sem correspondencia no catalogo (produto avulso)", () => {
    const erro = validarItensContraCatalogo([item()], []);
    expect(erro).toBeNull();
  });

  it("rejeita quando subtotal nao bate com valorVenda x quantidade", () => {
    const erro = validarItensContraCatalogo(
      [item({ quantidade: 5, valorVenda: 1000, subtotal: 1 })],
      []
    );
    expect(erro).not.toBeNull();
    expect(erro).toMatch(/subtotal/i);
  });

  it("aceita pequena diferenca de arredondamento (tolerancia de 1 centavo)", () => {
    const erro = validarItensContraCatalogo(
      [item({ quantidade: 3, valorVenda: 33.33, subtotal: 99.99 })],
      []
    );
    expect(erro).toBeNull();
  });

  it("permite vendedor dar desconto: valorVenda abaixo do catalogo passa", () => {
    const erro = validarItensContraCatalogo(
      [item({ produtoNome: "Fone Bluetooth X", valorVenda: 150, custoProduto: 100, subtotal: 150 })],
      [{ nome: "Fone Bluetooth X", custoPadrao: 100 }]
    );
    expect(erro).toBeNull();
  });

  it("permite valorVenda acima do catalogo tambem (sem teto)", () => {
    const erro = validarItensContraCatalogo(
      [item({ produtoNome: "Fone Bluetooth X", valorVenda: 500, custoProduto: 100, subtotal: 500 })],
      [{ nome: "Fone Bluetooth X", custoPadrao: 100 }]
    );
    expect(erro).toBeNull();
  });

  it("rejeita custoProduto informado abaixo do custo cadastrado no catalogo (fraude de comissao)", () => {
    const erro = validarItensContraCatalogo(
      [item({ produtoNome: "Fone Bluetooth X", custoProduto: 50, valorVenda: 1000, subtotal: 1000 })],
      [{ nome: "Fone Bluetooth X", custoPadrao: 700 }]
    );
    expect(erro).not.toBeNull();
    expect(erro).toMatch(/custo/i);
  });

  it("aceita custoProduto igual ao catalogo (dentro da tolerancia)", () => {
    const erro = validarItensContraCatalogo(
      [item({ produtoNome: "Fone Bluetooth X", custoProduto: 700, valorVenda: 1000, subtotal: 1000 })],
      [{ nome: "Fone Bluetooth X", custoPadrao: 700 }]
    );
    expect(erro).toBeNull();
  });

  it("aceita custoProduto acima do catalogo", () => {
    const erro = validarItensContraCatalogo(
      [item({ produtoNome: "Fone Bluetooth X", custoProduto: 900, valorVenda: 1000, subtotal: 1000 })],
      [{ nome: "Fone Bluetooth X", custoPadrao: 700 }]
    );
    expect(erro).toBeNull();
  });

  it("faz o match do nome do produto ignorando maiusculas/minusculas e espacos", () => {
    const erro = validarItensContraCatalogo(
      [item({ produtoNome: "  fone bluetooth x  ", custoProduto: 50, valorVenda: 1000, subtotal: 1000 })],
      [{ nome: "Fone Bluetooth X", custoPadrao: 700 }]
    );
    expect(erro).not.toBeNull();
  });

  it("quando ha duplicidade de produto por fornecedor, basta bater com um dos custos cadastrados", () => {
    const erro = validarItensContraCatalogo(
      [item({ produtoNome: "Fone Bluetooth X", custoProduto: 100, valorVenda: 1000, subtotal: 1000 })],
      [
        { nome: "Fone Bluetooth X", custoPadrao: 700 },
        { nome: "Fone Bluetooth X", custoPadrao: 100 },
      ]
    );
    expect(erro).toBeNull();
  });

  it("ignora produtos do catalogo sem custoPadrao definido (null)", () => {
    const erro = validarItensContraCatalogo(
      [item({ produtoNome: "Fone Bluetooth X", custoProduto: 1, valorVenda: 1000, subtotal: 1000 })],
      [{ nome: "Fone Bluetooth X", custoPadrao: null }]
    );
    expect(erro).toBeNull();
  });
});
