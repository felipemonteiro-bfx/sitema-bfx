import { beforeEach, describe, expect, it, vi } from "vitest";

const { empresaFindMany, vendaFindMany, sendWeeklyReport } = vi.hoisted(() => ({
  empresaFindMany: vi.fn(),
  vendaFindMany: vi.fn(),
  sendWeeklyReport: vi.fn(),
}));

vi.mock("@/lib/segredo", () => ({ autorizarCron: () => true }));
vi.mock("@/lib/email", () => ({ sendWeeklyReport }));
vi.mock("@/lib/db", () => ({
  prisma: {
    empresaParceira: { findMany: empresaFindMany },
    venda: { findMany: vendaFindMany },
  },
}));

describe("cron do consolidado semanal", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    empresaFindMany.mockResolvedValue([
      { id: 7, nome: "Empresa", emailRh: "rh@empresa.test" },
    ]);
    vendaFindMany.mockResolvedValue([]);
    sendWeeklyReport.mockResolvedValue(undefined);
  });

  it("busca o acumulado do mês, filtra vendas ativas e envia somente ao emailRh", async () => {
    const { GET } = await import("@/app/api/cron/relatorio-semanal/route");
    const response = await GET(new Request("http://local/api/cron/relatorio-semanal"));

    expect(response.status).toBe(200);
    expect(vendaFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: "ativa",
        dataVenda: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) }),
      }),
    }));
    expect(sendWeeklyReport).toHaveBeenCalledWith(
      "Empresa",
      [],
      "rh@empresa.test",
      { inicioMes: expect.any(Date), fimPeriodo: expect.any(Date) }
    );
  });
});
