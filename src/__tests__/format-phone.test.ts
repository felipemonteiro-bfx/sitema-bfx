import { describe, it, expect } from "vitest";
import { formatPhone } from "@/lib/masks";

// Bug encontrado em 2026-08-05: abrir a edicao de um cliente com telefone fixo
// (10 digitos) e salvar sem mudar nada regravava o numero mal agrupado.
// "92 9294-6066" virava "(92) 92946-066" — 5+3 em vez de 4+4 — porque a mascara
// cortava sempre no 7o digito, como se todo numero tivesse 11.
//
// O proprio docstring da funcao ja prometia os dois formatos:
// "(XX) XXXXX-XXXX ou (XX) XXXX-XXXX". A implementacao so fazia o primeiro.

describe("formatPhone — celular (11 digitos)", () => {
  it("agrupa 5+4", () => {
    expect(formatPhone("92991205758")).toBe("(92) 99120-5758");
  });

  it("reformatar um ja formatado nao muda nada (idempotente)", () => {
    expect(formatPhone("(92) 99120-5758")).toBe("(92) 99120-5758");
  });
});

describe("formatPhone — fixo (10 digitos)", () => {
  it("agrupa 4+4, nao 5+3 — este E o bug", () => {
    expect(formatPhone("9292946066")).toBe("(92) 9294-6066");
  });

  it("reformatar um ja formatado nao muda nada (idempotente)", () => {
    // Era aqui que o dado se corrompia: cada save reagrupava o numero.
    expect(formatPhone("(92) 9294-6066")).toBe("(92) 9294-6066");
  });

  it("aceita o formato sem parenteses que existe no banco", () => {
    expect(formatPhone("92 8105-7839")).toBe("(92) 8105-7839");
  });
});

describe("formatPhone — digitacao parcial", () => {
  it("string vazia", () => {
    expect(formatPhone("")).toBe("");
  });

  it("so o DDD", () => {
    expect(formatPhone("92")).toBe("(92");
  });

  it("DDD e comeco do numero", () => {
    expect(formatPhone("92929")).toBe("(92) 929");
  });

  it("descarta digitos alem de 11", () => {
    expect(formatPhone("929912057589999")).toBe("(92) 99120-5758");
  });

  it("ignora letras e simbolos", () => {
    expect(formatPhone("(92) 99120-5758 ramal 3")).toBe("(92) 99120-5758");
  });
});
