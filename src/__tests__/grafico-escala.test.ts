import { describe, expect, it } from "vitest";
import { montarColunas, passoRedondo, rotuloMil } from "@/lib/grafico-escala";

describe("passoRedondo", () => {
  it("escolhe degraus 1-2-2,5-5 x 10^n com no máximo 5 divisões", () => {
    expect(passoRedondo(46411)).toBe(10000);
    expect(passoRedondo(900)).toBe(200);
    expect(passoRedondo(1_200_000)).toBe(250_000);
    expect(passoRedondo(25)).toBe(5);
  });

  it("sem máximo positivo devolve 1 (eixo não quebra)", () => {
    expect(passoRedondo(0)).toBe(1);
    expect(passoRedondo(-5)).toBe(1);
    expect(passoRedondo(Number.NaN)).toBe(1);
  });
});

describe("rotuloMil", () => {
  it("abrevia em mil e mi, em pt-BR", () => {
    expect(rotuloMil(0)).toBe("0");
    expect(rotuloMil(50000)).toBe("50 mil");
    expect(rotuloMil(2500)).toBe("2,5 mil");
    expect(rotuloMil(1_200_000)).toBe("1,2 mi");
    expect(rotuloMil(1_000_000)).toBe("1 mi");
    expect(rotuloMil(800)).toBe("800");
    expect(rotuloMil(-10000)).toBe("-10 mil");
  });
});

describe("montarColunas", () => {
  const meses = [
    { rotulo: "mai", faturamento: 4140, custoVariavel: 2683, margem: 1457 },
    { rotulo: "jun", faturamento: 46411, custoVariavel: 34946, margem: 11465 },
    { rotulo: "jul", faturamento: 0, custoVariavel: 0, margem: 0 },
    { rotulo: "ago", faturamento: 1000, custoVariavel: 1500, margem: -500 },
  ];

  it("escala o eixo em degraus redondos e custo + margem somam o faturamento", () => {
    const { topo, ticks, colunas } = montarColunas(meses, 100);
    expect(topo).toBe(50000);
    expect(ticks).toEqual([0, 10000, 20000, 30000, 40000, 50000]);
    const jun = colunas[1];
    expect(jun.custoPct).toBeCloseTo((34946 / 50000) * 100, 5);
    expect(jun.margemPct).toBeCloseTo((11465 / 50000) * 100, 5);
    expect(jun.totalPct).toBeCloseTo((46411 / 50000) * 100, 5);
    expect(jun.negativa).toBe(false);
  });

  it("altura é a escala de saída (100 = porcentagem)", () => {
    const { colunas } = montarColunas(meses, 280);
    expect(colunas[1].totalPct).toBeCloseTo((46411 / 50000) * 280, 5);
  });

  it("mês vazio não tem altura nem negativa", () => {
    const c = montarColunas(meses, 100).colunas[2];
    expect(c.vazio).toBe(true);
    expect(c.totalPct).toBe(0);
    expect(c.margemPct).toBe(0);
  });

  it("margem negativa: sem topo, barra é o custo", () => {
    const c = montarColunas(meses, 100).colunas[3];
    expect(c.negativa).toBe(true);
    expect(c.margemPct).toBe(0);
    expect(c.custoPct).toBeCloseTo((1500 / 50000) * 100, 5);
    expect(c.totalPct).toBe(c.custoPct);
  });

  it("lista vazia ou tudo zero não explode", () => {
    expect(montarColunas([], 100).colunas).toEqual([]);
    const z = montarColunas([{ rotulo: "x", faturamento: 0, custoVariavel: 0, margem: 0 }], 100);
    expect(z.topo).toBeGreaterThan(0);
    expect(z.colunas[0].vazio).toBe(true);
  });

  it("mantém o índice e o rótulo", () => {
    const { colunas } = montarColunas(meses, 100);
    expect(colunas.map((c) => [c.indice, c.rotulo])).toEqual([[0, "mai"], [1, "jun"], [2, "jul"], [3, "ago"]]);
  });
});
