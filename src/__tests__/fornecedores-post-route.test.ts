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
