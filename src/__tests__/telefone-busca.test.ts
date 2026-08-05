import { describe, it, expect } from "vitest";
import { variantesLocaisDeTelefone, somenteDigitos } from "@/lib/telefone-busca";

// O pre-atendimento do WhatsApp recebe o numero em E.164 ("5592981066004") e
// precisa achar o cliente. A busca antiga fazia `telefone contains <digitos>`
// contra a coluna FORMATADA — e "(92) 98106-6004" nao contem "92981066004".
// Achava so 32 dos 813 clientes: exatamente os que por acaso estavam gravados
// em digitos puros. Agora a comparacao e' digito contra digito nos dois lados.

describe("somenteDigitos", () => {
  it("tira formatacao", () => {
    expect(somenteDigitos("(92) 98106-6004")).toBe("92981066004");
    expect(somenteDigitos("92 9294-6066")).toBe("9292946066");
  });

  it("aguenta vazio e nulo", () => {
    expect(somenteDigitos("")).toBe("");
    expect(somenteDigitos(null)).toBe("");
    expect(somenteDigitos(undefined)).toBe("");
  });
});

describe("variantesLocaisDeTelefone", () => {
  it("tira o DDI 55 do numero que vem do WhatsApp", () => {
    expect(variantesLocaisDeTelefone("5592981066004")).toContain("92981066004");
  });

  it("aceita o numero ja local", () => {
    expect(variantesLocaisDeTelefone("92981066004")).toContain("92981066004");
  });

  it("gera a variante sem o nono digito", () => {
    // Cadastro antigo pode estar sem o 9: (92) 8106-6004
    expect(variantesLocaisDeTelefone("5592981066004")).toContain("9281066004");
  });

  it("gera a variante COM nono digito a partir de um numero de 10", () => {
    expect(variantesLocaisDeTelefone("9281066004")).toContain("92981066004");
  });

  it("acha o mesmo conjunto vindo formatado ou cru", () => {
    const cru = variantesLocaisDeTelefone("5592981066004");
    const formatado = variantesLocaisDeTelefone("+55 (92) 98106-6004");
    expect(new Set(formatado)).toEqual(new Set(cru));
  });

  it("nunca devolve variante com o 55 na frente — a coluna guarda o numero local", () => {
    for (const v of variantesLocaisDeTelefone("5592981066004")) {
      expect(v.startsWith("55")).toBe(false);
    }
  });

  it("nao duplica", () => {
    const v = variantesLocaisDeTelefone("5592981066004");
    expect(v.length).toBe(new Set(v).size);
  });

  it("descarta lixo curto demais para ser telefone", () => {
    expect(variantesLocaisDeTelefone("123")).toEqual([]);
    expect(variantesLocaisDeTelefone("")).toEqual([]);
  });

  it("so aplica a regra do nono digito quando o 3o digito e 9", () => {
    // 9281066004 tem 10 digitos e nao comeca com 9 apos o DDD; virar
    // 92-9-81066004 e' a insercao correta. Mas 9281066004 -> remover o "8"
    // nao pode acontecer.
    expect(variantesLocaisDeTelefone("9281066004")).not.toContain("921066004");
  });
});
