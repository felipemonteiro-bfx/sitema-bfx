import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks — mesmo padrao de src/__tests__/campanha-cota.test.ts: objeto local de mock,
// nunca importar `prisma`/`requireAdminOrThrow`/`createAuditLog` reais no teste (evita
// colisao de tipos do Prisma no `next build`).
const dbMock = {
  fornecedor: {
    updateMany: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
};
const guardsMock = { requireAdminOrThrow: vi.fn() };
const auditMock = { createAuditLog: vi.fn() };

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/guards", () => guardsMock);
vi.mock("@/lib/audit", () => auditMock);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { bulkDeleteFornecedores } = await import("@/app/(app)/cadastros/page");

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.fornecedor.findMany.mockResolvedValue([
    { id: 1, nome: "ACME" },
    { id: 2, nome: "BETA" },
  ]);
  dbMock.fornecedor.updateMany.mockResolvedValue({ count: 2 });
});

describe("bulkDeleteFornecedores — exclusao logica com guarda de admin (D-02, D-04)", () => {
  it("Teste 1: admin exclui via updateMany com deletedAt preenchido, sem chamada destrutiva", async () => {
    guardsMock.requireAdminOrThrow.mockResolvedValue({ id: 1, username: "admin", role: "admin" });

    await bulkDeleteFornecedores([1, 2]);

    expect(dbMock.fornecedor.updateMany).toHaveBeenCalledTimes(1);
    const args = dbMock.fornecedor.updateMany.mock.calls[0][0];
    expect(args.data.deletedAt).toBeInstanceOf(Date);
    expect(dbMock.fornecedor.deleteMany).not.toHaveBeenCalled();
  });

  it("Teste 2: sessao de vendedor rejeita e nenhuma escrita do Prisma acontece", async () => {
    guardsMock.requireAdminOrThrow.mockRejectedValue(
      new Error("Acesso negado. Requer perfil admin.")
    );

    await expect(bulkDeleteFornecedores([1, 2])).rejects.toThrow("Acesso negado");

    expect(dbMock.fornecedor.updateMany).not.toHaveBeenCalled();
    expect(dbMock.fornecedor.deleteMany).not.toHaveBeenCalled();
    expect(dbMock.fornecedor.create).not.toHaveBeenCalled();
    expect(dbMock.fornecedor.update).not.toHaveBeenCalled();
  });

  it("Teste 3: o where do updateMany exige deletedAt: null, para nao sobrescrever exclusao anterior", async () => {
    guardsMock.requireAdminOrThrow.mockResolvedValue({ id: 1, username: "admin", role: "admin" });

    await bulkDeleteFornecedores([1, 2]);

    const args = dbMock.fornecedor.updateMany.mock.calls[0][0];
    expect(args.where.deletedAt).toBeNull();
    expect(args.where.id).toEqual({ in: [1, 2] });
  });

  it("Teste 4: grava fornecedor:delete uma vez por id excluido", async () => {
    guardsMock.requireAdminOrThrow.mockResolvedValue({ id: 1, username: "admin", role: "admin" });

    await bulkDeleteFornecedores([1, 2]);

    expect(auditMock.createAuditLog).toHaveBeenCalledTimes(2);
    expect(auditMock.createAuditLog).toHaveBeenCalledWith("fornecedor:delete", {
      fornecedorId: 1,
      nome: "ACME",
    });
    expect(auditMock.createAuditLog).toHaveBeenCalledWith("fornecedor:delete", {
      fornecedorId: 2,
      nome: "BETA",
    });
  });
});
