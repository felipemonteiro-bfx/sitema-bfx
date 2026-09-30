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
  it("venda no dia 31 com corte 20 / vencimento 28: fevereiro fica em 28/02 e março não pula", () => {
    // 31 > corte 20: dois meses à frente. Somar meses a partir do dia 31 transbordaria (31/02 →
    // 03/03); a regra monta a data com o dia de vencimento, então cai em 28/03.
    expect(iso(calcularPrimeiroVencimento(d("2027-01-31"), { diaCorte: 20, diaVencimento: 28 }))).toBe("2027-03-28");
  });
  it("venda no dia 31 pelo padrão (corte 20 / dia 10)", () => {
    expect(iso(calcularPrimeiroVencimento(d("2026-10-31")))).toBe("2026-12-10");
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

describe("sincronizarParcelasAuto quando a regra chega depois da lista (2026-09-30)", () => {
  // O limite (com a regra) chega por fetch depois que o formulário já gerou a lista com o padrão.
  // Só o tamanho da lista disparava a regeneração, então a regra da empresa era ignorada.
  const gerar = (regra?: { diaCorte: number; diaVencimento: number }) =>
    ajustarParcelas({ parcelas: [], numeroParcelas: 3, valorTotal: 300, dataVenda: "2026-09-10", regra }).parcelas;
  const sync = (
    parcelas: ReturnType<typeof gerar>,
    regra: { diaCorte: number; diaVencimento: number } | undefined,
    regraAnterior: { diaCorte: number; diaVencimento: number } | undefined,
  ) =>
    sincronizarParcelasAuto({
      parcelas,
      numeroParcelas: 3,
      valorTotal: 300,
      valorTotalAnterior: 300,
      dataVenda: "2026-09-10",
      regra,
      regraAnterior,
    });

  it("lista gerada sem regra e chega a regra 20/15: re-sincroniza para o dia 15 mantendo os valores", () => {
    // Valor ajustado à mão não é edição de data: a troca pela regra nova mantém os valores.
    const antes = gerar().map((p, i) => ({ ...p, valorParcela: i === 0 ? 90 : 105 }));
    const { parcelas } = sync(antes, { diaCorte: 20, diaVencimento: 15 }, undefined);
    expect(parcelas?.map((p) => p.dataVencimento)).toEqual(["2026-10-15", "2026-11-15", "2026-12-15"]);
    expect(parcelas?.map((p) => p.valorParcela)).toEqual(antes.map((p) => p.valorParcela));
  });

  it("com uma data editada pelo usuário: preserva a lista", () => {
    const antes = gerar();
    antes[1] = { ...antes[1], dataVencimento: "2026-11-20" };
    const { parcelas } = sync(antes, { diaCorte: 20, diaVencimento: 15 }, undefined);
    expect(parcelas).toBeNull();
  });

  it("troca de regra A para B (outro cliente): re-sincroniza pela B", () => {
    const antes = gerar({ diaCorte: 20, diaVencimento: 15 });
    const { parcelas } = sync(antes, { diaCorte: 25, diaVencimento: 5 }, { diaCorte: 20, diaVencimento: 15 });
    expect(parcelas?.map((p) => p.dataVencimento)).toEqual(["2026-10-05", "2026-11-05", "2026-12-05"]);
  });

  it("regra igual à anterior: não mexe", () => {
    const antes = gerar({ diaCorte: 20, diaVencimento: 15 });
    expect(sync(antes, { diaCorte: 20, diaVencimento: 15 }, { diaCorte: 20, diaVencimento: 15 }).parcelas).toBeNull();
  });
});
