import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { empresaFindMany, empresaVinculoFindMany, processarRelatorioMensal } = vi.hoisted(() => ({
  empresaFindMany: vi.fn(),
  empresaVinculoFindMany: vi.fn(),
  processarRelatorioMensal: vi.fn(),
}));

vi.mock("@/lib/segredo", () => ({ autorizarCron: () => true }));
vi.mock("@/lib/db", () => ({
  prisma: {
    empresaParceira: { findMany: empresaFindMany },
    empresaVinculo: { findMany: empresaVinculoFindMany },
  },
}));
vi.mock("@/lib/relatorio-mensal-service", () => ({ processarRelatorioMensal }));

const resultadoVazio = { periodo: "2026-09", resultados: [] };

describe("cron do relatorio mensal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-22T01:00:00.000Z")); // 21/09, 21:00 em Manaus
    vi.resetAllMocks();
    empresaVinculoFindMany.mockResolvedValue([]);
    processarRelatorioMensal.mockResolvedValue(resultadoVazio);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("processa somente empresas configuradas para o dia atual com o mes corrente parcial", async () => {
    empresaFindMany.mockResolvedValue([
      { id: 10, nome: "Empresa 10", emailRh: null, emailsExtras: null, telefoneRh: null, diaRelatorioMensal: 21 },
      { id: 11, nome: "Empresa 11", emailRh: null, emailsExtras: null, telefoneRh: null, diaRelatorioMensal: 22 },
      { id: 12, nome: "Empresa 12", emailRh: null, emailsExtras: null, telefoneRh: null, diaRelatorioMensal: null },
    ]);
    const { GET } = await import("@/app/api/cron/relatorio-mensal/route");

    const response = await GET(new Request("http://local/api/cron/relatorio-mensal"));

    expect(response.status).toBe(200);
    expect(empresaFindMany).toHaveBeenCalledWith({
      select: {
        id: true,
        nome: true,
        emailRh: true,
        emailsExtras: true,
        telefoneRh: true,
        diaRelatorioMensal: true,
      },
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
      { id: 10, nome: "Empresa 10", emailRh: null, emailsExtras: null, telefoneRh: null, diaRelatorioMensal: 21 },
      { id: 12, nome: "Empresa 12", emailRh: null, emailsExtras: null, telefoneRh: null, diaRelatorioMensal: null },
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
    empresaFindMany.mockResolvedValue([
      { id: 11, nome: "Empresa 11", emailRh: null, emailsExtras: null, telefoneRh: null, diaRelatorioMensal: 22 },
    ]);
    const { GET } = await import("@/app/api/cron/relatorio-mensal/route");

    const response = await GET(new Request("http://local/api/cron/relatorio-mensal"));

    expect(processarRelatorioMensal).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({ ok: true, periodo: "2026-09", empresas: 0, resultados: [] });
  });

  it("processa o dia 31 configurado no ultimo dia de fevereiro", async () => {
    vi.setSystemTime(new Date("2026-02-28T16:00:00.000Z"));
    empresaFindMany.mockResolvedValue([
      { id: 31, nome: "Empresa 31", emailRh: null, emailsExtras: null, telefoneRh: null, diaRelatorioMensal: 31 },
    ]);
    const { GET } = await import("@/app/api/cron/relatorio-mensal/route");

    await GET(new Request("http://local/api/cron/relatorio-mensal"));

    expect(processarRelatorioMensal).toHaveBeenCalledWith(expect.objectContaining({
      periodo: "2026-02",
      empresaId: 31,
      inicio: new Date("2026-02-01T04:00:00.000Z"),
      fim: new Date("2026-03-01T03:59:59.999Z"),
    }));
  });

  it("processa o dia 31 configurado no ultimo dia de abril", async () => {
    vi.setSystemTime(new Date("2026-04-30T16:00:00.000Z"));
    empresaFindMany.mockResolvedValue([
      { id: 31, nome: "Empresa 31", emailRh: null, emailsExtras: null, telefoneRh: null, diaRelatorioMensal: 31 },
    ]);
    const { GET } = await import("@/app/api/cron/relatorio-mensal/route");

    await GET(new Request("http://local/api/cron/relatorio-mensal"));

    expect(processarRelatorioMensal).toHaveBeenCalledWith(expect.objectContaining({
      periodo: "2026-04",
      empresaId: 31,
      inicio: new Date("2026-04-01T04:00:00.000Z"),
      fim: new Date("2026-05-01T03:59:59.999Z"),
    }));
  });

  it("processa um grupo vinculado uma vez no menor dia efetivo dos membros", async () => {
    empresaFindMany.mockResolvedValue([
      { id: 10, nome: "Filial", emailRh: null, emailsExtras: null, telefoneRh: null, diaRelatorioMensal: 23 },
      { id: 11, nome: "Matriz", emailRh: "rh@matriz.test", emailsExtras: null, telefoneRh: null, diaRelatorioMensal: 21 },
    ]);
    empresaVinculoFindMany.mockResolvedValue([{ empresaId: 10, vinculadaId: 11 }]);
    const { GET } = await import("@/app/api/cron/relatorio-mensal/route");

    await GET(new Request("http://local/api/cron/relatorio-mensal"));

    expect(processarRelatorioMensal).toHaveBeenCalledTimes(1);
    expect(processarRelatorioMensal).toHaveBeenCalledWith(expect.objectContaining({ empresaId: 11 }));
  });

  it("preserva os parametros manuais de periodo, empresa e force", async () => {
    const { GET } = await import("@/app/api/cron/relatorio-mensal/route");

    const response = await GET(new Request("http://local/api/cron/relatorio-mensal?periodo=2026-08&empresaId=7&force=1"));

    expect(response.status).toBe(200);
    expect(empresaFindMany).not.toHaveBeenCalled();
    expect(processarRelatorioMensal).toHaveBeenCalledWith({ periodo: "2026-08", empresaId: 7, force: true });
    expect(await response.json()).toMatchObject({ ok: true, periodo: "2026-08" });
  });
});
