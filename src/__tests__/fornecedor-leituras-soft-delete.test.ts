import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * D-02/DAT-02 (plano 06-03): fecha as quatro leituras de fornecedor fora de
 * /cadastros que ainda ressuscitavam registros soft-deletados — PDV, listagem
 * da IA, busca fuzzy da IA e criacao/reativacao por nome da IA (D-03).
 *
 * Mesmo padrao de src/__tests__/fornecedor-soft-delete.test.ts: mock local do
 * Prisma, nunca importar `@/lib/db` real (evita colisao de tipos no next build).
 */
const dbMock = {
  usuario: { findMany: vi.fn() },
  venda: { findFirst: vi.fn(), findMany: vi.fn() },
  produto: { findMany: vi.fn() },
  fornecedor: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  auditLog: { create: vi.fn() },
  $queryRawUnsafe: vi.fn(),
};

vi.mock("@/lib/db", () => ({ prisma: dbMock }));

const { default: VendaRapidaPage } = await import("@/app/(app)/venda-rapida/page");
const { executeAiAction } = await import("@/lib/ai-actions");
const { fuzzyFindFornecedores } = await import("@/lib/db-search");

type Ctx = { role: "admin" | "vendedor"; username: string; displayName: string; userId: number };
const adminCtx: Ctx = { role: "admin", username: "admin", displayName: "Admin", userId: 1 };

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.usuario.findMany.mockResolvedValue([]);
  dbMock.venda.findFirst.mockResolvedValue(null);
  dbMock.produto.findMany.mockResolvedValue([]);
  dbMock.fornecedor.findMany.mockResolvedValue([]);
  dbMock.auditLog.create.mockResolvedValue({});
});

describe("Leituras de fornecedor fora de /cadastros respeitam soft-delete (DAT-02)", () => {
  it("Teste 1 (PDV): venda-rapida consulta fornecedores com deletedAt: null", async () => {
    await VendaRapidaPage();

    expect(dbMock.fornecedor.findMany).toHaveBeenCalledTimes(1);
    const args = dbMock.fornecedor.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ deletedAt: null });
  });

  it("Teste 2 (IA, listagem): listar_fornecedores sem search consulta com deletedAt: null", async () => {
    await executeAiAction("listar_fornecedores", {}, adminCtx);

    expect(dbMock.fornecedor.findMany).toHaveBeenCalledTimes(1);
    const args = dbMock.fornecedor.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ deletedAt: null });
  });

  it("Teste 3 (IA, busca fuzzy): fuzzyFindFornecedores devolve apenas registros ativos", async () => {
    // SQL cru de similaridade devolve o id de um fornecedor excluido (id: 2)
    dbMock.$queryRawUnsafe.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    dbMock.fornecedor.findMany.mockResolvedValue([{ id: 1, nome: "ATIVO" }]);

    const resultado = await fuzzyFindFornecedores("acme", 50);

    expect(dbMock.fornecedor.findMany).toHaveBeenCalledTimes(1);
    const args = dbMock.fornecedor.findMany.mock.calls[0][0];
    expect(args.where.deletedAt).toBeNull();
    expect(args.where.id).toEqual({ in: [1, 2] });
    expect(resultado).toEqual([{ id: 1, nome: "ATIVO" }]);
  });

  it("Teste 4 (IA, criacao — D-03): nome existe soft-deletado reativa via update, sem create", async () => {
    dbMock.fornecedor.findMany.mockResolvedValue([
      { id: 5, nome: "ACME", deletedAt: new Date("2026-01-01T00:00:00Z") },
    ]);
    dbMock.fornecedor.update.mockResolvedValue({ id: 5, nome: "ACME", deletedAt: null });

    const resultado = (await executeAiAction("criar_fornecedor", { nome: "acme" }, adminCtx)) as {
      nome?: string;
    };

    expect(dbMock.fornecedor.create).not.toHaveBeenCalled();
    expect(dbMock.fornecedor.update).toHaveBeenCalledTimes(1);
    const args = dbMock.fornecedor.update.mock.calls[0][0];
    expect(args.where).toEqual({ id: 5 });
    expect(args.data.deletedAt).toBeNull();
    expect(resultado?.nome).toBe("ACME");
  });

  it("Teste 5 (IA, criacao): nome inedito continua criando normalmente", async () => {
    dbMock.fornecedor.findMany.mockResolvedValue([]);
    dbMock.fornecedor.create.mockResolvedValue({ id: 9, nome: "NOVO FORNECEDOR" });

    const resultado = (await executeAiAction(
      "criar_fornecedor",
      { nome: "novo fornecedor" },
      adminCtx
    )) as { nome?: string };

    expect(dbMock.fornecedor.create).toHaveBeenCalledTimes(1);
    expect(dbMock.fornecedor.update).not.toHaveBeenCalled();
    expect(resultado?.nome).toBe("NOVO FORNECEDOR");
  });
});
