// Excluir venda × fechamento mensal e boleto Prudent (2026-09-30, Fase 5; spec §3.2).
// Parcela com boleto Prudent ou em fechamento conferido/enviado → recusado, nada apagado.
// Só em fechamento em preparação → apaga e marca o fechamento desatualizado (antes de apagar).
import { describe, it, expect, vi, beforeEach } from "vitest";

const dbMock = {
  venda: { findUnique: vi.fn(), delete: vi.fn() },
  itemVenda: { findMany: vi.fn() },
  produto: { updateMany: vi.fn() },
  assinatura: { deleteMany: vi.fn() },
  documento: { deleteMany: vi.fn() },
  parcelaVencimento: { findMany: vi.fn() },
  fechamento: { updateMany: vi.fn() },
};
vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/guards", () => ({ requireSessionOrThrow: vi.fn(async () => ({ id: 1, username: "andre", role: "admin" })) }));
vi.mock("@/lib/consignado-db", () => ({ recalcularConsignadoSeguro: vi.fn() }));
vi.mock("@/lib/audit", () => ({ createAuditLog: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendVendaNotification: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { deleteVenda } = await import("@/app/(app)/historico/actions");

function formId(id: number) {
  const fd = new FormData();
  fd.set("id", String(id));
  return fd;
}

const parcela = (numeroParcela: number, extra: Record<string, unknown> = {}) => ({
  numeroParcela,
  dataVencimento: new Date("2026-10-10T00:00:00Z"),
  valorParcela: 300,
  boletoPrudentId: null,
  fechamentoId: null,
  fechamento: null,
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.venda.findUnique.mockResolvedValue({ clienteId: 7 });
  dbMock.itemVenda.findMany.mockResolvedValue([]);
  dbMock.venda.delete.mockResolvedValue({});
  dbMock.parcelaVencimento.findMany.mockResolvedValue([parcela(1), parcela(2)]);
  dbMock.fechamento.updateMany.mockResolvedValue({ count: 1 });
});

describe("deleteVenda × reserva", () => {
  it("venda sem reserva nem boleto é excluída", async () => {
    expect(await deleteVenda(formId(10))).toEqual({ success: true });
    expect(dbMock.venda.delete).toHaveBeenCalledWith({ where: { id: 10 } });
    expect(dbMock.fechamento.updateMany).not.toHaveBeenCalled();
  });

  it("parcela em fechamento conferido ou enviado → recusado, nada apagado nem devolvido ao estoque", async () => {
    for (const status of ["conferido", "enviado"]) {
      dbMock.parcelaVencimento.findMany.mockResolvedValue([
        parcela(1),
        parcela(2, { fechamentoId: 11, fechamento: { id: 11, status, competencia: "2026-10" } }),
      ]);
      const r = await deleteVenda(formId(10));
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/^Parcela V10-2\/2 está no fechamento de outubro de 2026/);
    }
    expect(dbMock.venda.delete).not.toHaveBeenCalled();
    expect(dbMock.produto.updateMany).not.toHaveBeenCalled();
    expect(dbMock.assinatura.deleteMany).not.toHaveBeenCalled();
  });

  it("parcela com boleto Prudent → recusado", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([parcela(1, { boletoPrudentId: 30 })]);
    expect(await deleteVenda(formId(10))).toEqual({
      success: false,
      error: "A Prudent já emitiu boleto da parcela 1; a venda não pode ser excluída.",
    });
    expect(dbMock.venda.delete).not.toHaveBeenCalled();
  });

  it("só em fechamento em preparação → marca desatualizado antes de apagar", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([
      parcela(1, { fechamentoId: 11, fechamento: { id: 11, status: "em_preparacao", competencia: "2026-10" } }),
    ]);
    expect(await deleteVenda(formId(10))).toEqual({ success: true });
    expect(dbMock.fechamento.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [11] }, status: "em_preparacao" },
      data: { desatualizado: true },
    });
    expect(dbMock.fechamento.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      dbMock.venda.delete.mock.invocationCallOrder[0]
    );
  });

  it("o fechamento foi conferido no meio (count 0) → recusado", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([
      parcela(1, { fechamentoId: 11, fechamento: { id: 11, status: "em_preparacao", competencia: "2026-10" } }),
    ]);
    dbMock.fechamento.updateMany.mockResolvedValue({ count: 0 });
    const r = await deleteVenda(formId(10));
    expect(r.success).toBe(false);
    expect(dbMock.venda.delete).not.toHaveBeenCalled();
  });
});
