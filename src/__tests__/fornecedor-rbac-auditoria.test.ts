import { describe, it, expect, vi, beforeEach } from "vitest";

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

const { bulkDeleteFornecedores, addFornecedor } = await import("@/app/(app)/cadastros/page");

beforeEach(() => {
  vi.clearAllMocks();
  // addFornecedor tambem passou a exigir admin (a regra e' que so cliente e
  // produto ficam com o vendedor). Sem este padrao, os testes de auditoria
  // dependeriam da implementacao deixada pelo teste anterior para passar.
  guardsMock.requireAdminOrThrow.mockResolvedValue({ id: 1, username: "admin", role: "admin" });
});

function formDataCom(nome: string) {
  const fd = new FormData();
  fd.set("nome", nome);
  fd.set("telefone", "11999999999");
  return fd;
}

describe("Trava de regressao de RBAC (D-04)", () => {
  it("Teste 1: sessao de vendedor rejeita bulkDeleteFornecedores e nenhuma escrita do Prisma acontece", async () => {
    guardsMock.requireAdminOrThrow.mockRejectedValue(
      new Error("Acesso negado. Requer perfil admin.")
    );
    dbMock.fornecedor.findMany.mockResolvedValue([{ id: 1, nome: "ACME" }]);

    await expect(bulkDeleteFornecedores([1])).rejects.toThrow();

    const metodosChamados = Object.entries(dbMock.fornecedor)
      .filter(([, fn]) => (fn as ReturnType<typeof vi.fn>).mock.calls.length > 0)
      .map(([nome]) => nome);
    expect(metodosChamados).toEqual([]);
  });

  it("Teste 2: sessao admin passa e updateMany e chamado", async () => {
    guardsMock.requireAdminOrThrow.mockResolvedValue({ id: 1, username: "admin", role: "admin" });
    dbMock.fornecedor.findMany.mockResolvedValue([{ id: 1, nome: "ACME" }]);
    dbMock.fornecedor.updateMany.mockResolvedValue({ count: 1 });

    await bulkDeleteFornecedores([1]);

    expect(dbMock.fornecedor.updateMany).toHaveBeenCalledTimes(1);
  });
});

describe("Trilha de auditoria da restauracao (D-05)", () => {
  it("Teste 3: reativar por addFornecedor grava fornecedor:restore com fornecedorId e nome", async () => {
    dbMock.fornecedor.findMany.mockResolvedValue([
      { id: 9, nome: "BETA COMERCIO", deletedAt: "2026-08-01T00:00:00.000Z" },
    ]);
    dbMock.fornecedor.update.mockResolvedValue({ id: 9 });

    await addFornecedor(formDataCom("beta comercio"));

    expect(auditMock.createAuditLog).toHaveBeenCalledWith("fornecedor:restore", {
      fornecedorId: 9,
      nome: "BETA COMERCIO",
    });
  });

  it("Teste 4: criar um fornecedor novo grava fornecedor:create e nao grava fornecedor:restore", async () => {
    dbMock.fornecedor.findMany.mockResolvedValue([]);
    dbMock.fornecedor.create.mockResolvedValue({ id: 42 });

    await addFornecedor(formDataCom("Gama LTDA"));

    expect(auditMock.createAuditLog).toHaveBeenCalledWith("fornecedor:create", {
      fornecedorId: 42,
      nome: "GAMA LTDA",
    });
    expect(auditMock.createAuditLog).not.toHaveBeenCalledWith(
      "fornecedor:restore",
      expect.anything()
    );
  });
});
