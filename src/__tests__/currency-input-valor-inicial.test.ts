import { describe, it, expect } from "vitest";
import { parseCurrencyBR, valorInicialMoeda } from "@/lib/masks";


// Bug encontrado em 2026-08-05 testando /cadastros em producao: editar um
// cliente e salvar sem mudar nada multiplicava a renda por 100 —
// R$ 1.828,81 virou R$ 182.881,00 no banco.
//
// A causa: <CurrencyInput defaultValue={cliente.renda} /> recebe um NUMBER, e o
// componente fazia parseCurrencyBR(String(defaultValue)). String(1828.81) e'
// "1828.81", e parseCurrencyBR trata ponto como separador de MILHAR (correto
// para quem digita "1.828,81" em pt-BR) — entao apagava o ponto decimal.

describe("parseCurrencyBR — contrato que originou o bug", () => {
  it("com number, devolve o proprio valor", () => {
    expect(parseCurrencyBR(1828.81)).toBe(1828.81);
  });

  it("com string, ponto e' separador de milhar — por isso String(number) e' fatal", () => {
    // Este comportamento esta CORRETO para entrada digitada em pt-BR.
    // O erro era converter um number para string antes de chamar.
    expect(parseCurrencyBR("1.828,81")).toBe(1828.81);
    expect(parseCurrencyBR("1828.81")).toBe(182881);
  });
});

describe("valorInicialMoeda", () => {
  it("preserva os centavos de um valor vindo do banco", () => {
    expect(valorInicialMoeda(1828.81)).toBe(1828.81);
  });

  it("nao inflaciona valores inteiros (o caso que mascarava o bug)", () => {
    // Renda "2000" nao tem ponto, entao passava ilesa mesmo pelo caminho
    // quebrado — foi por isso que o bug sobreviveu sem ninguem notar.
    expect(valorInicialMoeda(2000)).toBe(2000);
  });

  it("aceita string digitada no formato pt-BR", () => {
    expect(valorInicialMoeda("1.828,81")).toBe(1828.81);
    expect(valorInicialMoeda("2.500,00")).toBe(2500);
  });

  it("trata vazio, undefined e null como zero", () => {
    expect(valorInicialMoeda(undefined)).toBe(0);
    expect(valorInicialMoeda("")).toBe(0);
    expect(valorInicialMoeda(null as unknown as undefined)).toBe(0);
  });

  it("preserva zero", () => {
    expect(valorInicialMoeda(0)).toBe(0);
  });

  it("preserva valores pequenos com centavos", () => {
    expect(valorInicialMoeda(0.99)).toBe(0.99);
    expect(valorInicialMoeda(12.5)).toBe(12.5);
  });
});
