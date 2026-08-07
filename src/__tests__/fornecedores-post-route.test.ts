import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks — mesmo padrao de fornecedor-soft-delete.test.ts: objeto local de mock,
// nunca importar `prisma`/`getSession`/`createAuditLog` reais no teste (evita
// colisao de tipos do Prisma no `next build`).
const dbMock = {
  fornecedor: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};
const sessionMock = { getSession: vi.fn() };
const auditMock = { createAuditLog: vi.fn() };

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/session", () => sessionMock);
vi.mock("@/lib/audit", () => auditMock);
// A rota passou a revalidar; sem este mock o teste importaria `next/cache`
// de verdade, fora de contexto de request.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { POST } = await import("@/app/api/fornecedores/route");

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.getSession.mockResolvedValue({ id: 1, username: "vendedor", role: "vendedor" });
  dbMock.fornecedor.findMany.mockResolvedValue([]);
});

function req(body: Record<string, unknown>) {
  return new Request("http://local/api/fornecedores", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/fornecedores — cadastro rapido de fornecedor no PDV (D-06, D-07, PDV-16)", () => {
  it("Teste 1: sem sessao responde 401 e nenhuma escrita acontece", async () => {
    sessionMock.getSession.mockResolvedValue(null);

    const res = await POST(req({ nome: "ACME" }));

    expect(res.status).toBe(401);
    expect(dbMock.fornecedor.create).not.toHaveBeenCalled();
    expect(dbMock.fornecedor.update).not.toHaveBeenCalled();
  });

  it("Teste 2: nome em branco responde 400 legivel, sem escrita", async () => {
    const res = await POST(req({ nome: "   " }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBeTruthy();
    expect(dbMock.fornecedor.create).not.toHaveBeenCalled();
    expect(dbMock.fornecedor.update).not.toHaveBeenCalled();
  });

  it("Teste 3: nome novo com espacos/caixa mistos e criado normalizado, 201 com id e nome no corpo", async () => {
    dbMock.fornecedor.create.mockResolvedValue({ id: 5, nome: "ACME DISTRIBUIDORA" });

    const res = await POST(req({ nome: "  acme   distribuidora " }));
    const body = await res.json();

    expect(dbMock.fornecedor.create).toHaveBeenCalledTimes(1);
    expect(dbMock.fornecedor.create.mock.calls[0][0].data.nome).toBe("ACME DISTRIBUIDORA");
    expect(res.status).toBe(201);
    expect(body.id).toBe(5);
    expect(body.nome).toBe("ACME DISTRIBUIDORA");
  });

  it("Teste 4: no ramo de criacao, createAuditLog e chamado com fornecedor:create", async () => {
    dbMock.fornecedor.create.mockResolvedValue({ id: 5, nome: "ACME" });

    await POST(req({ nome: "acme" }));

    expect(auditMock.createAuditLog).toHaveBeenCalledWith("fornecedor:create", {
      fornecedorId: 5,
      nome: "ACME",
    });
  });
});

describe("POST /api/fornecedores — reativacao de soft-deletado (D-06, PDV-16)", () => {
  it("Teste 5: existente soft-deletado com nome equivalente e reativado (update, sem create), 200 com reativado true", async () => {
    dbMock.fornecedor.findMany.mockResolvedValue([
      { id: 9, nome: "BETA COMERCIO", deletedAt: "2026-08-01T00:00:00.000Z" },
    ]);
    dbMock.fornecedor.update.mockResolvedValue({ id: 9, nome: "BETA COMERCIO" });

    const res = await POST(req({ nome: "  beta   comercio " }));
    const body = await res.json();

    expect(dbMock.fornecedor.update).toHaveBeenCalledTimes(1);
    expect(dbMock.fornecedor.update.mock.calls[0][0].where.id).toBe(9);
    expect(dbMock.fornecedor.update.mock.calls[0][0].data.deletedAt).toBeNull();
    expect(dbMock.fornecedor.create).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(body.id).toBe(9);
    expect(body.reativado).toBe(true);
  });

  it("Teste 6: a reativacao grava createAuditLog com fornecedor:restore", async () => {
    dbMock.fornecedor.findMany.mockResolvedValue([
      { id: 9, nome: "BETA COMERCIO", deletedAt: "2026-08-01T00:00:00.000Z" },
    ]);
    dbMock.fornecedor.update.mockResolvedValue({ id: 9, nome: "BETA COMERCIO" });

    await POST(req({ nome: "beta comercio" }));

    expect(auditMock.createAuditLog).toHaveBeenCalledWith("fornecedor:restore", {
      fornecedorId: 9,
      nome: "BETA COMERCIO",
    });
  });

  it("Teste 7: existente ativo com nome equivalente nao escreve nada, 200 com jaExistia true", async () => {
    dbMock.fornecedor.findMany.mockResolvedValue([
      { id: 7, nome: "ACME", deletedAt: null },
    ]);

    const res = await POST(req({ nome: "acme" }));
    const body = await res.json();

    expect(dbMock.fornecedor.create).not.toHaveBeenCalled();
    expect(dbMock.fornecedor.update).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(body.id).toBe(7);
    expect(body.jaExistia).toBe(true);
  });

  it("Teste 8: telefone informado chega ao banco com trim tanto na criacao quanto na reativacao", async () => {
    dbMock.fornecedor.create.mockResolvedValue({ id: 1, nome: "ACME" });
    await POST(req({ nome: "acme", telefone: "  11999999999  " }));
    expect(dbMock.fornecedor.create.mock.calls[0][0].data.telefone).toBe("11999999999");

    vi.clearAllMocks();
    sessionMock.getSession.mockResolvedValue({ id: 1, username: "vendedor", role: "vendedor" });
    dbMock.fornecedor.findMany.mockResolvedValue([
      { id: 9, nome: "BETA COMERCIO", deletedAt: "2026-08-01T00:00:00.000Z" },
    ]);
    dbMock.fornecedor.update.mockResolvedValue({ id: 9, nome: "BETA COMERCIO" });
    await POST(req({ nome: "beta comercio", telefone: "  11988888888  " }));
    expect(dbMock.fornecedor.update.mock.calls[0][0].data.telefone).toBe("11988888888");
  });
});

describe("POST /api/fornecedores — trava de regressao (D-06, PDV-16)", () => {
  it("Teste 9: sem sessao, nenhum metodo do Prisma de fornecedor e chamado (trava de RBAC)", async () => {
    sessionMock.getSession.mockResolvedValue(null);

    await POST(req({ nome: "ACME" }));

    const metodosChamados = Object.entries(dbMock.fornecedor)
      .filter(([, fn]) => (fn as ReturnType<typeof vi.fn>).mock.calls.length > 0)
      .map(([nome]) => nome);
    expect(metodosChamados).toEqual([]);
  });

  it("Teste 10: conflito de nome unico (P2002) no create vira 409 com mensagem legivel citando o nome", async () => {
    const erro = Object.assign(new Error("Unique constraint failed on the fields: (`nome`)"), {
      code: "P2002",
    });
    dbMock.fornecedor.create.mockRejectedValue(erro);

    const res = await POST(req({ nome: "ACME" }));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toContain("ACME");
    expect(body.error).not.toContain("P2002");
    expect(body.error).not.toContain("Unique constraint failed");
  });

  it("Teste 11: erro inesperado sem code vira 500 generico, sem vazar o erro original no corpo", async () => {
    dbMock.fornecedor.create.mockRejectedValue(new Error("connection reset by peer"));

    const res = await POST(req({ nome: "ACME" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBeTruthy();
    expect(body.error).not.toContain("connection reset by peer");
  });
});
