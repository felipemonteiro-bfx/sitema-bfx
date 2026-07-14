import { describe, it, expect } from "vitest";
import {
  pontosDaVenda,
  valorEmReais,
  pontosParaValor,
  podeResgatar,
  PONTOS_POR_REAL,
  VALOR_POR_PONTO,
} from "@/lib/fidelidade";

describe("fidelidade — regras de pontos", () => {
  it("defaults: 1 ponto por real, R$0,05 por ponto", () => {
    expect(PONTOS_POR_REAL).toBe(1);
    expect(VALOR_POR_PONTO).toBe(0.05);
  });

  it("pontosDaVenda: piso do total × pontos por real", () => {
    expect(pontosDaVenda(300)).toBe(300);
    expect(pontosDaVenda(299.9)).toBe(299);
    expect(pontosDaVenda(0)).toBe(0);
    expect(pontosDaVenda(-10)).toBe(0);
  });

  it("valorEmReais: 1.000 pontos = R$50", () => {
    expect(valorEmReais(1000)).toBe(50);
    expect(valorEmReais(250)).toBe(12.5);
    expect(valorEmReais(0)).toBe(0);
  });

  it("pontosParaValor: teto de pontos para um desconto em R$", () => {
    expect(pontosParaValor(50)).toBe(1000);
    expect(pontosParaValor(5)).toBe(100);
    expect(pontosParaValor(0)).toBe(0);
  });

  it("podeResgatar: exige saldo suficiente e quantidade positiva inteira", () => {
    expect(podeResgatar(1000, 500)).toBe(true);
    expect(podeResgatar(500, 500)).toBe(true);
    expect(podeResgatar(400, 500)).toBe(false);
    expect(podeResgatar(1000, 0)).toBe(false);
    expect(podeResgatar(1000, -5)).toBe(false);
    expect(podeResgatar(1000, 10.5)).toBe(false);
  });
});
