import { describe, it, expect } from "vitest";
import { normalize, fuzzyMatch } from "@/hooks/use-table-features";

/**
 * Regressao: "JOSÉ LOPES DOLZANE" existia no banco (id 867) mas nao aparecia em
 * nenhuma busca — o detector de duplicado usa f_unaccent e avisava "cliente com
 * nome similar", enquanto as buscas comparavam com acento e nao achavam nada.
 * Resultado: o vendedor cadastrava de novo sem acento (ver TAÍS/TAIS SILVA DE
 * SOUSA, mesmo CPF, dois registros).
 */
describe("busca acento-insensivel", () => {
  it("normalize remove acento e caixa", () => {
    expect(normalize("JOSÉ LOPES DOLZANE")).toBe("jose lopes dolzane");
    expect(normalize("TAÍS SILVA DE SOUSA")).toBe("tais silva de sousa");
    expect(normalize("JOÃO CONCEIÇÃO")).toBe("joao conceicao");
  });

  it("acha nome com acento digitando sem acento", () => {
    expect(fuzzyMatch("JOSÉ LOPES DOLZANE", "JOSE")).toBe(true);
    expect(fuzzyMatch("JOSÉ LOPES DOLZANE", "jose lopes dolzane")).toBe(true);
    expect(fuzzyMatch("TAÍS SILVA DE SOUSA", "tais")).toBe(true);
  });

  it("acha nome sem acento digitando com acento", () => {
    expect(fuzzyMatch("JOSE NEY LOPES ALMEIDA", "josé")).toBe(true);
  });

  it("continua nao casando quem realmente nao bate", () => {
    expect(fuzzyMatch("JOSÉ LOPES DOLZANE", "maria")).toBe(false);
  });
});
