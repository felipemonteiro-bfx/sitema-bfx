import { describe, it, expect, vi, beforeEach } from "vitest";

const dbMock = {
  fornecedor: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(async (callback: (tx: typeof dbMock) => Promise<void>) => callback(dbMock)),
};
const guardsMock = { requireAdminOrThrow: vi.fn() };
const auditMock = { createAuditLog: vi.fn() };
const revalidateMock = { revalidatePath: vi.fn() };

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/guards", () => guardsMock);
vi.mock("@/lib/audit", () => auditMock);
vi.mock("next/cache", () => revalidateMock);

const { confirmarImportacaoFornecedores } = await import(
  "@/app/(app)/importacao/fornecedores/actions"
);

beforeEach(() => {
  vi.clearAllMocks();
  guardsMock.requireAdminOrThrow.mockResolvedValue({ id: 1, username: "admin", role: "admin" });
  dbMock.fornecedor.create.mockResolvedValue({ id: 100 });
  dbMock.fornecedor.update.mockResolvedValue({ id: 100 });
});

const csvDuasLinhas = "nome;telefone\nAcme Distribuidora;92999990000\nBeta Comercio;92988880000\n";

describe("confirmarImportacaoFornecedores — idempotencia (D-01)", () => {
  it("Teste 1: primeira passada sobre banco vazio cria 2 fornecedores", async () => {
    dbMock.fornecedor.findMany.mockResolvedValue([]);

    const resultado = await confirmarImportacaoFornecedores(csvDuasLinhas);

    expect(resultado).toEqual({ criados: 2, reativados: 0, ignorados: 0, erros: [] });
    expect(dbMock.fornecedor.create).toHaveBeenCalledTimes(2);
  });

  it("Teste 1b: segunda passada com os 2 nomes ja ativos nao escreve nada e ignora os 2", async () => {
    dbMock.fornecedor.findMany.mockResolvedValue([
      { id: 1, nome: "ACME DISTRIBUIDORA", deletedAt: null },
      { id: 2, nome: "BETA COMERCIO", deletedAt: null },
    ]);

    const resultado = await confirmarImportacaoFornecedores(csvDuasLinhas);

    expect(resultado).toEqual({ criados: 0, reativados: 0, ignorados: 2, erros: [] });
    expect(dbMock.fornecedor.create).not.toHaveBeenCalled();
    expect(dbMock.fornecedor.update).not.toHaveBeenCalled();
  });
});

describe("confirmarImportacaoFornecedores — reativacao (D-03)", () => {
  it("Teste 2: nome soft-deletado produz reativados:1 e a escrita e um update que limpa deletedAt, nunca um create", async () => {
    dbMock.fornecedor.findMany.mockResolvedValue([
      { id: 9, nome: "BETA COMERCIO", deletedAt: "2026-08-01T00:00:00.000Z" },
    ]);

    const resultado = await confirmarImportacaoFornecedores(csvDuasLinhas);

    expect(resultado.reativados).toBe(1);
    expect(dbMock.fornecedor.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 9 },
        data: expect.objectContaining({ deletedAt: null }),
      })
    );
    expect(dbMock.fornecedor.create).toHaveBeenCalledTimes(1); // so a linha ACME, que e nova
  });
});

describe("confirmarImportacaoFornecedores — RBAC (T-06-06)", () => {
  it("Teste 3: sessao de vendedor rejeita e nenhuma escrita do Prisma acontece", async () => {
    guardsMock.requireAdminOrThrow.mockRejectedValue(
      new Error("Acesso negado. Requer perfil admin.")
    );
    dbMock.fornecedor.findMany.mockResolvedValue([]);

    await expect(confirmarImportacaoFornecedores(csvDuasLinhas)).rejects.toThrow();

    expect(dbMock.fornecedor.create).not.toHaveBeenCalled();
    expect(dbMock.fornecedor.update).not.toHaveBeenCalled();
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });
});

describe("confirmarImportacaoFornecedores — nao confia no cliente (T-06-05)", () => {
  it("Teste 4: o mesmo texto de entrada produz resultado diferente conforme o findMany mockado, provando que o plano e recalculado no servidor", async () => {
    dbMock.fornecedor.findMany.mockResolvedValue([]);
    const primeiraPassada = await confirmarImportacaoFornecedores(csvDuasLinhas);
    expect(primeiraPassada.criados).toBe(2);

    dbMock.fornecedor.findMany.mockResolvedValue([
      { id: 1, nome: "ACME DISTRIBUIDORA", deletedAt: null },
    ]);
    const segundaPassada = await confirmarImportacaoFornecedores(csvDuasLinhas);
    expect(segundaPassada.criados).toBe(1);
    expect(segundaPassada.ignorados).toBe(1);
  });
});

describe("confirmarImportacaoFornecedores — auditoria (T-06-09)", () => {
  it("Teste 5: grava createAuditLog(fornecedor:import, { criados, reativados, ignorados })", async () => {
    dbMock.fornecedor.findMany.mockResolvedValue([]);

    await confirmarImportacaoFornecedores(csvDuasLinhas);

    expect(auditMock.createAuditLog).toHaveBeenCalledWith("fornecedor:import", {
      criados: 2,
      reativados: 0,
      ignorados: 0,
    });
  });
});
