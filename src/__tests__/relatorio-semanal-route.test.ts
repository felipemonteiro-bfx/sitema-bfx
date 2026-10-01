import { beforeEach, describe, expect, it, vi } from "vitest";

const { empresaFindMany, vendaFindMany, sendWeeklyReport, parcelaUpdateMany } = vi.hoisted(() => ({
  empresaFindMany: vi.fn(),
  vendaFindMany: vi.fn(),
  sendWeeklyReport: vi.fn(),
  parcelaUpdateMany: vi.fn(),
}));

vi.mock("@/lib/segredo", () => ({ autorizarCron: () => true }));
vi.mock("@/lib/email", () => ({ sendWeeklyReport }));
vi.mock("@/lib/db", () => ({
  prisma: {
    empresaParceira: { findMany: empresaFindMany },
    venda: { findMany: vendaFindMany },
    parcelaVencimento: { updateMany: parcelaUpdateMany },
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
    parcelaUpdateMany.mockResolvedValue({ count: 0 });
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
      { inicioMes: expect.any(Date), fimPeriodo: expect.any(Date) },
      [],
      7
    );
  });

  it("repassa o emailCopia da empresa como cópia", async () => {
    empresaFindMany.mockResolvedValue([
      { id: 7, nome: "Empresa", emailRh: "rh@empresa.test", emailCopia: "fin@prudent.test; RH@empresa.test" },
    ]);
    const { GET } = await import("@/app/api/cron/relatorio-semanal/route");
    await GET(new Request("http://local/api/cron/relatorio-semanal"));

    expect(sendWeeklyReport).toHaveBeenCalledWith(
      "Empresa",
      [],
      "rh@empresa.test",
      { inicioMes: expect.any(Date), fimPeriodo: expect.any(Date) },
      ["fin@prudent.test"],
      7
    );
  });

  // Fase 3 (2026-09-30): o consolidado é o acumulado do mês, então a mesma venda sai em várias
  // sextas. `enviadaRhEm` guarda a primeira — o `where` só pega parcela ainda sem data.
  it("depois do envio marca as parcelas das vendas do e-mail como enviadas ao RH", async () => {
    vendaFindMany.mockResolvedValue([{ id: 10 }, { id: 11 }]);
    const { GET } = await import("@/app/api/cron/relatorio-semanal/route");
    await GET(new Request("http://local/api/cron/relatorio-semanal"));

    expect(parcelaUpdateMany).toHaveBeenCalledTimes(1);
    expect(parcelaUpdateMany).toHaveBeenCalledWith({
      where: { vendaId: { in: [10, 11] }, enviadaRhEm: null },
      data: { enviadaRhEm: expect.any(Date) },
    });
    expect(sendWeeklyReport.mock.invocationCallOrder[0]).toBeLessThan(parcelaUpdateMany.mock.invocationCallOrder[0]);
  });

  it("não marca nada quando o envio falha", async () => {
    vendaFindMany.mockResolvedValue([{ id: 10 }]);
    sendWeeklyReport.mockRejectedValue(new Error("SMTP não configurado"));
    const { GET } = await import("@/app/api/cron/relatorio-semanal/route");
    await GET(new Request("http://local/api/cron/relatorio-semanal"));

    expect(parcelaUpdateMany).not.toHaveBeenCalled();
  });

  it("não chama o banco quando o e-mail saiu sem vendas", async () => {
    const { GET } = await import("@/app/api/cron/relatorio-semanal/route");
    await GET(new Request("http://local/api/cron/relatorio-semanal"));

    expect(sendWeeklyReport).toHaveBeenCalled();
    expect(parcelaUpdateMany).not.toHaveBeenCalled();
  });

  it("falha ao marcar não desfaz a contagem do e-mail enviado", async () => {
    vendaFindMany.mockResolvedValue([{ id: 10 }]);
    parcelaUpdateMany.mockRejectedValue(new Error("P1001"));
    const { GET } = await import("@/app/api/cron/relatorio-semanal/route");
    const response = await GET(new Request("http://local/api/cron/relatorio-semanal"));
    const corpo = await response.json();

    expect(corpo.enviados).toBe(1);
    expect(corpo.erros).toEqual([expect.stringContaining("Empresa")]);
  });
});
