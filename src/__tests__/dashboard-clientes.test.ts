import { describe, expect, it } from "vitest";
import { contarClientes, periodoAnteriorComparavel, variacao } from "@/lib/dashboard-clientes";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

describe("periodoAnteriorComparavel", () => {
  it("1 a 25 de setembro compara com 1 a 25 de agosto (fim exclusivo)", () => {
    const r = periodoAnteriorComparavel(d("2026-09-01"), d("2026-09-26"));
    expect(r).toEqual({ inicio: d("2026-08-01"), fim: d("2026-08-26") });
  });

  it("dia que não existe no mês anterior cai no último dia", () => {
    const r = periodoAnteriorComparavel(d("2026-03-01"), d("2026-03-31"));
    expect(r).toEqual({ inicio: d("2026-02-01"), fim: d("2026-03-01") });
  });

  it("não perde o último dia quando o período termina perto do fim do mês", () => {
    // 1–30/mai → 1–30/abr (fim exclusivo 01/mai), não 1–29/abr
    expect(periodoAnteriorComparavel(d("2026-05-01"), d("2026-05-31"))).toEqual({ inicio: d("2026-04-01"), fim: d("2026-05-01") });
    // 1–29/mar → 1–28/fev inteiro
    expect(periodoAnteriorComparavel(d("2026-03-01"), d("2026-03-30"))).toEqual({ inicio: d("2026-02-01"), fim: d("2026-03-01") });
  });

  it("mês cheio compara com o mês anterior cheio, virando o ano", () => {
    const r = periodoAnteriorComparavel(d("2026-01-01"), d("2026-02-01"));
    expect(r).toEqual({ inicio: d("2025-12-01"), fim: d("2026-01-01") });
  });
});

describe("variacao", () => {
  it("diferença e percentual", () => {
    expect(variacao(9, 28)).toEqual({ diferenca: -19, percentual: -67.86 });
    expect(variacao(38, 23)).toEqual({ diferenca: 15, percentual: 65.22 });
  });
  it("base negativa: melhora é positiva (lucro de -100 para 50 = +150%)", () => {
    expect(variacao(50, -100)).toEqual({ diferenca: 150, percentual: 150 });
  });

  it("sem base não inventa percentual", () => {
    expect(variacao(5, 0)).toEqual({ diferenca: 5, percentual: null });
  });
});

describe("contarClientes", () => {
  it("conta cada cliente uma vez e separa quem comprou pela primeira vez no período", () => {
    const primeira = new Map([[1, d("2026-09-03")], [2, d("2026-05-10")], [3, d("2026-09-20")]]);
    const r = contarClientes(
      [{ clienteId: 1 }, { clienteId: 1 }, { clienteId: 2 }, { clienteId: 3 }],
      primeira,
      d("2026-09-01"),
      d("2026-09-26")
    );
    expect(r).toEqual({ total: 3, novos: 2, recorrentes: 1 });
  });
});
