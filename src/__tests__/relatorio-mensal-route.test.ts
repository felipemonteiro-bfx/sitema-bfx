import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { empresaFindMany, processarRelatorioMensal } = vi.hoisted(() => ({
  empresaFindMany: vi.fn(),
  processarRelatorioMensal: vi.fn(),
}));

vi.mock("@/lib/segredo", () => ({ autorizarCron: () => true }));
vi.mock("@/lib/db", () => ({
  prisma: { empresaParceira: { findMany: empresaFindMany } },
}));
vi.mock("@/lib/relatorio-mensal-service", () => ({ processarRelatorioMensal }));

const resultadoVazio = { periodo: "2026-09", resultados: [] };

describe("cron do relatorio mensal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-22T01:00:00.000Z")); // 21/09, 21:00 em Manaus
    vi.resetAllMocks();
    processarRelatorioMensal.mockResolvedValue(resultadoVazio);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("processa somente empresas configuradas para o dia atual com o mes corrente parcial", async () => {
    empresaFindMany.mockResolvedValue([
      { id: 10, diaRelatorioMensal: 21 },
      { id: 11, diaRelatorioMensal: 22 },
      { id: 12, diaRelatorioMensal: null },
    ]);
    const { GET } = await import("@/app/api/cron/relatorio-mensal/route");

    const response = await GET(new Request("http://local/api/cron/relatorio-mensal"));

    expect(response.status).toBe(200);
    expect(empresaFindMany).toHaveBeenCalledWith({
      select: { id: true, diaRelatorioMensal: true },
      orderBy: { id: "asc" },
    });
    expect(processarRelatorioMensal).toHaveBeenCalledTimes(1);
    expect(processarRelatorioMensal).toHaveBeenCalledWith({
      periodo: "2026-09",
      empresaId: 10,
      force: false,
      inicio: new Date("2026-09-01T04:00:00.000Z"),
      fim: new Date("2026-09-22T03:59:59.999Z"),
    });
    expect(await response.json()).toMatchObject({ ok: true, periodo: "2026-09", empresas: 1 });
  });

  it("considera configuracao ausente como dia 1", async () => {
    vi.setSystemTime(new Date("2026-09-01T12:00:00.000Z"));
    empresaFindMany.mockResolvedValue([
      { id: 10, diaRelatorioMensal: 21 },
      { id: 12, diaRelatorioMensal: null },
    ]);
    const { GET } = await import("@/app/api/cron/relatorio-mensal/route");

    await GET(new Request("http://local/api/cron/relatorio-mensal"));

    expect(processarRelatorioMensal).toHaveBeenCalledTimes(1);
    expect(processarRelatorioMensal).toHaveBeenCalledWith(expect.objectContaining({
      periodo: "2026-09",
      empresaId: 12,
      inicio: new Date("2026-09-01T04:00:00.000Z"),
      fim: new Date("2026-09-02T03:59:59.999Z"),
    }));
  });

  it("nao envia quando nenhuma empresa vence hoje", async () => {
    empresaFindMany.mockResolvedValue([{ id: 11, diaRelatorioMensal: 22 }]);
    const { GET } = await import("@/app/api/cron/relatorio-mensal/route");

    const response = await GET(new Request("http://local/api/cron/relatorio-mensal"));

    expect(processarRelatorioMensal).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({ ok: true, periodo: "2026-09", empresas: 0, resultados: [] });
  });
});
