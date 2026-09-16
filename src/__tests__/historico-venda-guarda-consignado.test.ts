// Editar/excluir venda: guarda de sessao e recalculo da faixa de consignado (2026-09-16).
// Ver docs/superpowers/specs/2026-09-16-e-consignado-correcoes-auditoria.md, itens 4 e 7.
//
// O matcher do middleware cobre so /api e o layout roda depois da action: sem guarda
// propria, quem tiver o Action ID edita ou apaga venda sem estar logado.
import { describe, it, expect, vi, beforeEach } from "vitest";

const dbMock = {
  venda: { findUnique: vi.fn(), delete: vi.fn(), update: vi.fn() },
  itemVenda: { findMany: vi.fn() },
  produto: { updateMany: vi.fn() },
  assinatura: { deleteMany: vi.fn() },
  documento: { deleteMany: vi.fn() },
};
const guardsMock = { requireSessionOrThrow: vi.fn(), requireAdminOrThrow: vi.fn() };
const consignadoMock = { recalcularConsignadoSeguro: vi.fn() };

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/guards", () => guardsMock);
vi.mock("@/lib/consignado-db", () => consignadoMock);
vi.mock("@/lib/audit", () => ({ createAuditLog: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendVendaNotification: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { deleteVenda, updateVenda } = await import("@/app/(app)/historico/actions");

function formId(id: number) {
  const fd = new FormData();
  fd.set("id", String(id));
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  guardsMock.requireSessionOrThrow.mockResolvedValue({ id: 1, username: "vendedor", role: "vendedor" });
  dbMock.venda.findUnique.mockResolvedValue({ clienteId: 7 });
  dbMock.itemVenda.findMany.mockResolvedValue([]);
  dbMock.venda.delete.mockResolvedValue({});
  consignadoMock.recalcularConsignadoSeguro.mockResolvedValue(undefined);
});

describe("deleteVenda", () => {
  it("sem sessao lanca antes de tocar no banco", async () => {
    guardsMock.requireSessionOrThrow.mockRejectedValue(new Error("Nao autenticado."));

    await expect(deleteVenda(formId(10))).rejects.toThrow("Nao autenticado.");
    expect(dbMock.venda.delete).not.toHaveBeenCalled();
    expect(dbMock.itemVenda.findMany).not.toHaveBeenCalled();
  });

  it("recalcula a faixa do cliente da venda apagada, depois de apagar", async () => {
    await deleteVenda(formId(10));

    expect(consignadoMock.recalcularConsignadoSeguro).toHaveBeenCalledWith(7);
    const ordemDelete = dbMock.venda.delete.mock.invocationCallOrder[0];
    const ordemRecalculo = consignadoMock.recalcularConsignadoSeguro.mock.invocationCallOrder[0];
    expect(ordemRecalculo).toBeGreaterThan(ordemDelete);
  });
});

describe("updateVenda", () => {
  it("sem sessao lanca antes de tocar no banco", async () => {
    guardsMock.requireSessionOrThrow.mockRejectedValue(new Error("Nao autenticado."));

    await expect(updateVenda(formId(10))).rejects.toThrow("Nao autenticado.");
    expect(dbMock.venda.update).not.toHaveBeenCalled();
  });
});
