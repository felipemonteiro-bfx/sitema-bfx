import { describe, expect, it } from "vitest";
import { agruparVendasPorSemana, type VendaSemanal } from "@/lib/relatorio-semanal";

const venda = (id: number, data: string, valor: number): VendaSemanal => ({
  id,
  dataVenda: new Date(`${data}T00:00:00.000Z`),
  valorVenda: valor,
  quantidade: 1,
});

describe("agruparVendasPorSemana", () => {
  it("divide o acumulado do mês em semanas de sábado a sexta e soma cada semana", () => {
    const grupos = agruparVendasPorSemana(
      [
        venda(1, "2026-09-01", 10),
        venda(2, "2026-09-04", 20),
        venda(3, "2026-09-05", 30),
        venda(4, "2026-09-11", 40),
        venda(5, "2026-09-22", 50),
      ],
      new Date("2026-09-01T00:00:00.000Z"),
      new Date("2026-09-22T23:59:59.999Z")
    );

    expect(grupos.map((g) => [g.inicio, g.fim, g.vendas.map((v) => v.id), g.total])).toEqual([
      ["01/09/2026", "04/09/2026", [1, 2], 30],
      ["05/09/2026", "11/09/2026", [3, 4], 70],
      ["12/09/2026", "18/09/2026", [], 0],
      ["19/09/2026", "22/09/2026", [5], 50],
    ]);
  });

  it("mantém o total acumulado igual à soma das semanas", () => {
    const grupos = agruparVendasPorSemana(
      [venda(1, "2026-10-03", 12.5), venda(2, "2026-10-16", 7.5)],
      new Date("2026-10-01T00:00:00.000Z"),
      new Date("2026-10-16T23:59:59.999Z")
    );

    expect(grupos.reduce((total, grupo) => total + grupo.total, 0)).toBe(20);
  });

  it("encerra no próprio dia quando o mês começa em uma sexta-feira", () => {
    const grupos = agruparVendasPorSemana(
      [],
      new Date("2026-05-01T00:00:00.000Z"),
      new Date("2026-05-08T23:59:59.999Z")
    );

    expect(grupos.map(({ inicio, fim }) => `${inicio} - ${fim}`)).toEqual([
      "01/05/2026 - 01/05/2026",
      "02/05/2026 - 08/05/2026",
    ]);
  });
});
