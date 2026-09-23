import { describe, expect, it } from "vitest";
import { emailsCopia, normalizarEmailsCopia } from "@/lib/email-copia";

describe("normalizarEmailsCopia", () => {
  it("aceita vírgula ou ponto e vírgula, tira espaço, põe em minúsculas e remove repetidos", () => {
    expect(normalizarEmailsCopia(" Fin@Prudent.com.br; ops@prudent.com.br , fin@prudent.com.br ")).toEqual({
      ok: true,
      valor: "fin@prudent.com.br, ops@prudent.com.br",
    });
  });

  it("campo vazio grava nulo", () => {
    expect(normalizarEmailsCopia("   ")).toEqual({ ok: true, valor: null });
    expect(normalizarEmailsCopia(" , ; ")).toEqual({ ok: true, valor: null });
  });

  it("recusa endereço inválido e diz qual", () => {
    expect(normalizarEmailsCopia("fin@prudent.com.br, sem-arroba")).toEqual({ ok: false, invalidos: ["sem-arroba"] });
    expect(normalizarEmailsCopia("a@b.com\r\nBcc: x@y.com")).toMatchObject({ ok: false });
  });
});

describe("emailsCopia", () => {
  it("lê o valor gravado e não repete o próprio RH", () => {
    expect(emailsCopia("fin@prudent.com.br, rh@empresa.test", "RH@empresa.test")).toEqual(["fin@prudent.com.br"]);
  });

  it("sem cópia devolve lista vazia", () => {
    expect(emailsCopia(null)).toEqual([]);
    expect(emailsCopia(undefined, "rh@empresa.test")).toEqual([]);
  });

  it("descarta endereço inválido que tenha entrado no banco por fora da tela", () => {
    expect(emailsCopia("fin@prudent.com.br, lixo")).toEqual(["fin@prudent.com.br"]);
  });
});
