import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), groupBy: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { venda: { findMany: mocks.findMany, groupBy: mocks.groupBy } } }));

import { serieMensalClientes } from "@/lib/dashboard-clientes-db";

const d = (s: string) => new Date(`${s}T12:00:00.000Z`);

beforeEach(() => {
  mocks.findMany.mockReset();
  mocks.groupBy.mockReset();
});

describe("serieMensalClientes", () => {
  it("conta clientes por mês, separa novos e compara o mês corrente com os mesmos dias do anterior", async () => {
    mocks.findMany.mockResolvedValue([
      { clienteId: 1, dataVenda: d("2026-08-05") },
      { clienteId: 2, dataVenda: d("2026-08-20") },
      { clienteId: 3, dataVenda: d("2026-08-28") }, // depois do dia 25: fora da comparação de setembro
      { clienteId: 1, dataVenda: d("2026-09-10") },
      { clienteId: 1, dataVenda: d("2026-09-11") },
      { clienteId: 4, dataVenda: d("2026-09-12") },
    ]);
    mocks.groupBy.mockResolvedValue([
      { clienteId: 1, _min: { dataVenda: d("2026-08-05") } },
      { clienteId: 2, _min: { dataVenda: d("2026-01-01") } },
      { clienteId: 3, _min: { dataVenda: d("2026-08-28") } },
      { clienteId: 4, _min: { dataVenda: d("2026-09-12") } },
    ]);

    const serie = await serieMensalClientes(new Date("2026-09-26T00:00:00.000Z"), 2);

    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: { not: { in: ["cancelada", "estornada"] } } }),
    }));
    expect(serie.map((m) => [m.mesLongo, m.total, m.novos, m.vendas])).toEqual([
      ["agosto/2026", 3, 2, 3],
      ["setembro/2026", 2, 1, 3],
    ]);
    // setembro (2) contra 1–25 de agosto (clientes 1 e 2) = 0
    expect(serie[1].variacao).toEqual({ diferenca: 0, percentual: 0, base: "os mesmos dias (1 a 25) de agosto" });
    // agosto (3) contra julho inteiro (0) = sem percentual
    expect(serie[0].variacao).toEqual({ diferenca: 3, percentual: null, base: "julho" });
  });

  it("em 31/12 a janela fica no ano certo", async () => {
    mocks.findMany.mockResolvedValue([]);
    mocks.groupBy.mockResolvedValue([]);
    const serie = await serieMensalClientes(new Date("2027-01-01T00:00:00.000Z"), 2);
    expect(serie.map((m) => m.mesLongo)).toEqual(["novembro/2026", "dezembro/2026"]);
  });
});
