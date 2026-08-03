import { describe, it, expect, vi, beforeEach } from "vitest";

const dbMock = {
  empresaParceira: {
    findUnique: vi.fn(),
  },
  cliente: {
    findMany: vi.fn(),
    createMany: vi.fn(),
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

const { confirmarImportacaoClientes } = await import("@/app/(app)/importacao/clientes/actions");

const EMPRESA = { id: 3, nome: "EQUILIBRIUM" };

beforeEach(() => {
  vi.clearAllMocks();
  guardsMock.requireAdminOrThrow.mockResolvedValue({ id: 1, username: "admin", role: "admin" });
  dbMock.empresaParceira.findUnique.mockResolvedValue(EMPRESA);
  dbMock.cliente.createMany.mockResolvedValue({ count: 2 });
  dbMock.cliente.update.mockResolvedValue({ id: 100 });
});

const csvDuasPessoas =
  "nome;cpf;telefone;matricula;email\n" +
  "Maria da Silva;123.456.789-09;92999990000;12345;maria@exemplo.com\n" +
  "joao souza;;;;\n";

describe("confirmarImportacaoClientes — idempotencia (INT-03, criterio central)", () => {
  it("Teste 1: primeira passada sobre banco vazio cria 2 clientes", async () => {
    dbMock.cliente.findMany.mockResolvedValue([]);

    const resultado = await confirmarImportacaoClientes(csvDuasPessoas, 3);

    expect(resultado.criados).toBe(2);
    expect(resultado.vinculados).toBe(0);
    expect(resultado.ignorados).toBe(0);
    expect(dbMock.cliente.createMany).toHaveBeenCalledTimes(1);
  });

  it("Teste 1b: segunda passada com os 2 ja vinculados a mesma empresa nao escreve nada e ignora os 2", async () => {
    dbMock.cliente.findMany.mockResolvedValue([
      { id: 1, nome: "MARIA DA SILVA", cpf: "12345678909", empresaParceiraId: 3 },
      { id: 2, nome: "JOAO SOUZA", cpf: null, empresaParceiraId: 3 },
    ]);

    const resultado = await confirmarImportacaoClientes(csvDuasPessoas, 3);

    expect(resultado).toEqual({ criados: 0, vinculados: 0, ignorados: 2, erros: [] });
    expect(dbMock.cliente.createMany).not.toHaveBeenCalled();
    expect(dbMock.cliente.update).not.toHaveBeenCalled();
  });
});

describe("confirmarImportacaoClientes — vinculo com a empresa parceira (D-05)", () => {
  it("Teste 2: clientes criados recebem empresaParceiraId e empresa resolvidos no servidor", async () => {
    dbMock.cliente.findMany.mockResolvedValue([]);

    await confirmarImportacaoClientes(csvDuasPessoas, 3);

    const chamada = dbMock.cliente.createMany.mock.calls[0][0];
    for (const registro of chamada.data) {
      expect(registro.empresaParceiraId).toBe(3);
      expect(registro.empresa).toBe("EQUILIBRIUM");
    }
  });
});

describe("confirmarImportacaoClientes — estagio de novo lead (D-05)", () => {
  it("Teste 3: clientes criados nascem com estagioCrm novo_lead e origem import_funcionarios; existente vinculado nao tem o estagio alterado", async () => {
    dbMock.cliente.findMany.mockResolvedValue([
      { id: 9, nome: "JOAO SOUZA", cpf: null, empresaParceiraId: null },
    ]);

    await confirmarImportacaoClientes(csvDuasPessoas, 3);

    const chamadaCreateMany = dbMock.cliente.createMany.mock.calls[0][0];
    expect(chamadaCreateMany.data).toHaveLength(1);
    expect(chamadaCreateMany.data[0].estagioCrm).toBe("novo_lead");
    expect(chamadaCreateMany.data[0].origem).toBe("import_funcionarios");

    const chamadaUpdate = dbMock.cliente.update.mock.calls[0][0];
    expect(chamadaUpdate.where).toEqual({ id: 9 });
    expect(chamadaUpdate.data.estagioCrm).toBeUndefined();
  });
});

describe("confirmarImportacaoClientes — RBAC", () => {
  it("Teste 4: sessao de vendedor rejeita e nenhuma escrita do Prisma acontece", async () => {
    guardsMock.requireAdminOrThrow.mockRejectedValue(
      new Error("Acesso negado. Requer perfil admin.")
    );
    dbMock.cliente.findMany.mockResolvedValue([]);

    await expect(confirmarImportacaoClientes(csvDuasPessoas, 3)).rejects.toThrow();

    expect(dbMock.cliente.createMany).not.toHaveBeenCalled();
    expect(dbMock.cliente.update).not.toHaveBeenCalled();
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });
});

describe("confirmarImportacaoClientes — nao confia no cliente", () => {
  it("Teste 5: o mesmo texto de entrada produz resultado diferente conforme o findMany mockado, provando que o plano e recalculado no servidor", async () => {
    dbMock.cliente.findMany.mockResolvedValue([]);
    const primeiraPassada = await confirmarImportacaoClientes(csvDuasPessoas, 3);
    expect(primeiraPassada.criados).toBe(2);

    dbMock.cliente.findMany.mockResolvedValue([
      { id: 1, nome: "MARIA DA SILVA", cpf: "12345678909", empresaParceiraId: 3 },
    ]);
    const segundaPassada = await confirmarImportacaoClientes(csvDuasPessoas, 3);
    expect(segundaPassada.criados).toBe(1);
    expect(segundaPassada.ignorados).toBe(1);
  });
});

describe("confirmarImportacaoClientes — empresa invalida (T-09-08)", () => {
  it("Teste 6: id de empresa inexistente nao escreve nada e devolve erro reportado", async () => {
    dbMock.empresaParceira.findUnique.mockResolvedValue(null);
    dbMock.cliente.findMany.mockResolvedValue([]);

    const resultado = await confirmarImportacaoClientes(csvDuasPessoas, 999);

    expect(resultado.criados).toBe(0);
    expect(resultado.vinculados).toBe(0);
    expect(resultado.ignorados).toBe(0);
    expect(resultado.erros).toEqual([{ linha: 0, motivo: "empresa_invalida", conteudo: "" }]);
    expect(dbMock.cliente.createMany).not.toHaveBeenCalled();
    expect(dbMock.cliente.update).not.toHaveBeenCalled();
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });
});

describe("confirmarImportacaoClientes — auditoria (T-09-11)", () => {
  it("Teste 7: grava createAuditLog(cliente:import, { empresaParceiraId, criados, vinculados, ignorados })", async () => {
    dbMock.cliente.findMany.mockResolvedValue([]);

    await confirmarImportacaoClientes(csvDuasPessoas, 3);

    expect(auditMock.createAuditLog).toHaveBeenCalledWith("cliente:import", {
      empresaParceiraId: 3,
      criados: 2,
      vinculados: 0,
      ignorados: 0,
    });
  });
});
