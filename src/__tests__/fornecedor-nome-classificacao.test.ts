import { describe, it, expect } from "vitest";
import {
  normalizarNomeFornecedor,
  classificarNomeFornecedor,
  type FornecedorExistente,
} from "@/lib/fornecedor-import";

describe("normalizarNomeFornecedor", () => {
  it("Teste 1: trim, colapsa espacos internos, caixa alta pt-BR", () => {
    expect(normalizarNomeFornecedor("  acme   distribuidora ")).toBe("ACME DISTRIBUIDORA");
  });

  it("Teste 2: null e string so com espacos viram string vazia", () => {
    expect(normalizarNomeFornecedor(null)).toBe("");
    expect(normalizarNomeFornecedor("   ")).toBe("");
  });
});

describe("classificarNomeFornecedor", () => {
  const existentes: FornecedorExistente[] = [
    { id: 7, nome: "ACME DISTRIBUIDORA", deletedAt: null },
    { id: 9, nome: "BETA COMERCIO", deletedAt: "2026-08-01T00:00:00.000Z" },
  ];

  it("Teste 3: nome que casa com existente ativo -> ignorar", () => {
    const r = classificarNomeFornecedor("acme distribuidora", existentes);
    expect(r.acao).toBe("ignorar");
    expect(r.motivo).toBe("ja_existe_ativo");
    expect(r.id).toBe(7);
  });

  it("Teste 4: nome que casa com existente soft-deletado -> reativar (D-03)", () => {
    const r = classificarNomeFornecedor("beta comercio", existentes);
    expect(r.acao).toBe("reativar");
    expect(r.motivo).toBe("existe_soft_deletado");
    expect(r.id).toBe(9);
  });

  it("Teste 5: nome que nao casa com nada -> criar", () => {
    const r = classificarNomeFornecedor("Gama LTDA", existentes);
    expect(r.acao).toBe("criar");
    expect(r.id).toBeNull();
  });

  it("Teste 6: casamento insensivel a caixa e espacos extras nos dois lados", () => {
    const r = classificarNomeFornecedor("acme  distribuidora", existentes);
    expect(r.acao).toBe("ignorar");
    expect(r.id).toBe(7);
  });

  it("Teste 7: nome vazio -> erro, nunca lanca excecao", () => {
    const r = classificarNomeFornecedor("   ", existentes);
    expect(r.acao).toBe("erro");
    expect(r.motivo).toBe("nome_vazio");
    expect(r.id).toBeNull();
  });
});
