// Alinhamento numerico nas tabelas que a IA devolve no chat (auditoria visual
// de 2026-08-11): `MarkdownTable` alinhava TODA celula a esquerda, inclusive
// valor monetario, divergindo do resto do sistema.
import { describe, it, expect } from "vitest";
import { pareceNumero, colunasNumericas } from "@/lib/markdown-tabela";

describe("pareceNumero", () => {
  it("reconhece os formatos que `buildToolSummary` produz", () => {
    expect(pareceNumero("R$ 1.450,00")).toBe(true);
    expect(pareceNumero("890")).toBe(true);
    expect(pareceNumero("4x")).toBe(true);
    expect(pareceNumero("31,2%")).toBe(true);
    expect(pareceNumero("(1.200,00)")).toBe(true);
  });

  it("nao trata data e hora como numero — elas ficam a esquerda", () => {
    expect(pareceNumero("24/02/2026")).toBe(false);
    expect(pareceNumero("14:30")).toBe(false);
  });

  it("texto nao e numero", () => {
    expect(pareceNumero("AMAZON FIVE")).toBe(false);
    expect(pareceNumero("Jorgete da Silva")).toBe(false);
    expect(pareceNumero("")).toBe(false);
    expect(pareceNumero("   ")).toBe(false);
  });

  it("simbolo sozinho nao e numero", () => {
    expect(pareceNumero("R$")).toBe(false);
    expect(pareceNumero("—")).toBe(false);
  });
});

describe("colunasNumericas", () => {
  it("tabela de vendas: so Valor e Parcelas alinham a direita", () => {
    // Cliente | Data | Valor | Parcelas
    const linhas = [
      ["Jorgete da Silva", "24/02/2026", "R$ 1.450,00", "4x"],
      ["Cleusa Ferreira", "23/02/2026", "R$ 890,00", "3x"],
    ];
    expect([...colunasNumericas(linhas, 4)].sort()).toEqual([2, 3]);
  });

  it("celula vazia ou travessao nao desclassifica a coluna", () => {
    const linhas = [
      ["Produto A", "R$ 100,00"],
      ["Produto B", "—"],
      ["Produto C", "R$ 200,00"],
    ];
    expect([...colunasNumericas(linhas, 2)]).toEqual([1]);
  });

  it("coluna majoritariamente textual fica a esquerda mesmo com um numero solto", () => {
    const linhas = [
      ["Centrifuga Suggar"],
      ["Ventilador WAP"],
      ["220"],
    ];
    expect(colunasNumericas(linhas, 1).size).toBe(0);
  });

  it("tabela sem linhas nao quebra", () => {
    expect(colunasNumericas([], 3).size).toBe(0);
  });

  it("linha mais curta que o cabecalho nao quebra", () => {
    const linhas = [["Cliente", "R$ 10,00"], ["Só um campo"]];
    expect([...colunasNumericas(linhas, 2)]).toEqual([1]);
  });
});
