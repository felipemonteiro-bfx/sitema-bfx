import { describe, it, expect } from "vitest";
import { calcularPrimeiroVencimento } from "@/lib/utils";
import { parcelasDaVendaRapida, parcelaUnicaDaFolha } from "@/lib/parcelas";
import { ajustarParcelas, sincronizarParcelasAuto } from "@/lib/parcelas-ajuste";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const iso = (x: Date) => x.toISOString().slice(0, 10);

describe("calcularPrimeiroVencimento com regra", () => {
  it("sem regra mantém corte 20 / dia 10", () => {
    expect(iso(calcularPrimeiroVencimento(d("2026-09-20")))).toBe("2026-10-10");
    expect(iso(calcularPrimeiroVencimento(d("2026-09-21")))).toBe("2026-11-10");
  });
  it("usa corte e dia da regra", () => {
    const regra = { diaCorte: 25, diaVencimento: 15 };
    expect(iso(calcularPrimeiroVencimento(d("2026-09-25"), regra))).toBe("2026-10-15");
    expect(iso(calcularPrimeiroVencimento(d("2026-09-26"), regra))).toBe("2026-11-15");
  });
  it("dia 28 em fevereiro não pula de mês", () => {
    expect(iso(calcularPrimeiroVencimento(d("2027-01-10"), { diaCorte: 20, diaVencimento: 28 }))).toBe("2027-02-28");
  });
  it("virada de ano", () => {
    expect(iso(calcularPrimeiroVencimento(d("2026-12-22"), { diaCorte: 20, diaVencimento: 15 }))).toBe("2027-02-15");
  });
});

describe("parcelas geradas pela regra", () => {
  it("venda rápida parcelada usa o dia da regra em todas as parcelas", () => {
    const ps = parcelasDaVendaRapida({ parcelas: 3, dataVenda: d("2026-09-10"), total: 300, emFolha: true, regra: { diaCorte: 20, diaVencimento: 15 } });
    expect(ps.map((p) => iso(p.dataVencimento))).toEqual(["2026-10-15", "2026-11-15", "2026-12-15"]);
  });
  it("sem regra continua dia 10", () => {
    const ps = parcelasDaVendaRapida({ parcelas: 2, dataVenda: d("2026-09-10"), total: 200, emFolha: true });
    expect(ps.map((p) => iso(p.dataVencimento))).toEqual(["2026-10-10", "2026-11-10"]);
  });
  it("folha em 1x usa a regra", () => {
    const [p] = parcelaUnicaDaFolha({ emFolha: true, dataVenda: d("2026-09-10"), total: 100, regra: { diaCorte: 20, diaVencimento: 15 } });
    expect(iso(p.dataVencimento)).toBe("2026-10-15");
  });
  it("ajustarParcelas gera do zero no dia da regra", () => {
    const { parcelas } = ajustarParcelas({ parcelas: [], numeroParcelas: 2, valorTotal: 200, dataVenda: "2026-09-10", regra: { diaCorte: 20, diaVencimento: 15 } });
    expect(parcelas.map((p) => p.dataVencimento)).toEqual(["2026-10-15", "2026-11-15"]);
  });
});

describe("formulário da venda rápida pela regra", () => {
  it("sincronizarParcelasAuto gera a lista do zero no dia da regra", () => {
    const { parcelas } = sincronizarParcelasAuto({
      parcelas: [],
      numeroParcelas: 2,
      valorTotal: 200,
      valorTotalAnterior: null,
      dataVenda: "2026-09-10",
      regra: { diaCorte: 20, diaVencimento: 15 },
    });
    expect(parcelas?.map((p) => p.dataVencimento)).toEqual(["2026-10-15", "2026-11-15"]);
  });
});
