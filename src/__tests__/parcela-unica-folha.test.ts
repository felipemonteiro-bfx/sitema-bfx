// Venda em desconto em folha em 1x grava a parcela (2026-09-17).
// Ver docs/superpowers/specs/2026-09-17-parcela-venda-folha-1x.md.
import { describe, it, expect } from "vitest";
import { parcelaUnicaDaFolha } from "@/lib/parcelas";

describe("parcelaUnicaDaFolha", () => {
  it("compra até o dia 20: uma linha, vence dia 10 do mês seguinte, com o total", () => {
    expect(parcelaUnicaDaFolha({ emFolha: true, dataVenda: new Date("2026-08-15T00:00:00.000Z"), total: 150 })).toEqual([
      { numeroParcela: 1, dataVencimento: new Date("2026-09-10T00:00:00.000Z"), valorParcela: 150 },
    ]);
  });

  it("compra depois do dia 20: vence dois meses à frente", () => {
    const [linha] = parcelaUnicaDaFolha({ emFolha: true, dataVenda: new Date("2026-12-25T00:00:00.000Z"), total: 99.9 });
    expect(linha.dataVencimento).toEqual(new Date("2027-02-10T00:00:00.000Z"));
  });

  it("valor em centavos: 0,1 + 0,2 de total vira 0,30", () => {
    expect(parcelaUnicaDaFolha({ emFolha: true, dataVenda: new Date("2026-08-15T00:00:00.000Z"), total: 0.1 + 0.2 })[0].valorParcela).toBe(0.3);
  });

  it("fora do desconto em folha: nenhuma linha", () => {
    expect(parcelaUnicaDaFolha({ emFolha: false, dataVenda: new Date("2026-08-15T00:00:00.000Z"), total: 150 })).toEqual([]);
  });

  it("total zero, negativo ou inválido, ou data inválida: nenhuma linha", () => {
    const data = new Date("2026-08-15T00:00:00.000Z");
    expect(parcelaUnicaDaFolha({ emFolha: true, dataVenda: data, total: 0 })).toEqual([]);
    expect(parcelaUnicaDaFolha({ emFolha: true, dataVenda: data, total: -5 })).toEqual([]);
    expect(parcelaUnicaDaFolha({ emFolha: true, dataVenda: data, total: Number.NaN })).toEqual([]);
    expect(parcelaUnicaDaFolha({ emFolha: true, dataVenda: new Date("x"), total: 150 })).toEqual([]);
  });
});

describe("venda-rapida/actions — usa a regra pura", () => {
  it("a lista gravada sai de parcelasDaVendaRapida, com a data, o total e a forma da venda", async () => {
    const { readFileSync } = await import("node:fs");
    const fonte = readFileSync("src/app/(app)/venda-rapida/actions.ts", "utf8");
    const inicio = fonte.indexOf("const parcelasParaGravar");
    const trecho = fonte.slice(inicio, fonte.indexOf("// Custo de antecipacao Prudent", inicio));
    expect(trecho.includes("parcelasDaVendaRapida({")).toBe(true);
    expect(trecho.includes("informadas: parcelasValidadas")).toBe(true);
    expect(trecho.includes("dataVenda: new Date(dataStr)")).toBe(true);
    expect(trecho.includes("total: totalVenda")).toBe(true);
    expect(trecho.includes("emFolha: formaPagamento === FORMA_PAGAMENTO.DESCONTO_FOLHA")).toBe(true);
  });
});

describe("parcelasDaVendaRapida", () => {
  const dataVenda = new Date("2026-08-15T00:00:00.000Z");

  it("com datas informadas, usa o que veio do formulário", async () => {
    const { parcelasDaVendaRapida } = await import("@/lib/parcelas");
    expect(
      parcelasDaVendaRapida({
        informadas: [{ numeroParcela: 1, dataVencimento: "2026-10-05", valorParcela: 75 }],
        parcelas: 2,
        dataVenda,
        total: 150,
        emFolha: true,
      })
    ).toEqual([{ numeroParcela: 1, dataVencimento: new Date("2026-10-05T00:00:00.000Z"), valorParcela: 75 }]);
  });

  it("parcelada sem datas: uma por mês no dia 10 em UTC, com o valor truncado da venda rápida", async () => {
    const { parcelasDaVendaRapida } = await import("@/lib/parcelas");
    // Fuso positivo de propósito: em UTC o construtor local e o UTC dariam o mesmo instante e o
    // teste passaria com a implementação antiga (o servidor a leste gravaria dia 9).
    const tz = process.env.TZ;
    process.env.TZ = "Asia/Tokyo";
    try {
    expect(parcelasDaVendaRapida({ parcelas: 3, dataVenda, total: 100, emFolha: true })).toEqual([
      { numeroParcela: 1, dataVencimento: new Date("2026-09-10T00:00:00.000Z"), valorParcela: 33.33 },
      { numeroParcela: 2, dataVencimento: new Date("2026-10-10T00:00:00.000Z"), valorParcela: 33.33 },
      { numeroParcela: 3, dataVencimento: new Date("2026-11-10T00:00:00.000Z"), valorParcela: 33.33 },
    ]);
    } finally {
      process.env.TZ = tz;
    }
  });

  it("parcelada fora da folha também tem linhas, como antes", async () => {
    const { parcelasDaVendaRapida } = await import("@/lib/parcelas");
    expect(parcelasDaVendaRapida({ parcelas: 2, dataVenda, total: 100, emFolha: false })).toHaveLength(2);
  });

  it("em 1x, só a venda em folha ganha linha", async () => {
    const { parcelasDaVendaRapida } = await import("@/lib/parcelas");
    expect(parcelasDaVendaRapida({ parcelas: 1, dataVenda, total: 150, emFolha: true })).toEqual([
      { numeroParcela: 1, dataVencimento: new Date("2026-09-10T00:00:00.000Z"), valorParcela: 150 },
    ]);
    expect(parcelasDaVendaRapida({ parcelas: 1, dataVenda, total: 150, emFolha: false })).toEqual([]);
  });
});
