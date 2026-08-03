import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks — mesmo padrao de src/__tests__/fornecedor-soft-delete.test.ts: objeto
// local de mock, nunca importar `prisma`/`getSession`/`createAuditLog` reais
// no teste (evita colisao de tipos do Prisma no `next build`).
const dbMock = {
  cliente: {
    create: vi.fn(),
  },
  empresaParceira: {
    findUnique: vi.fn(),
  },
};
const sessionMock = { getSession: vi.fn() };
const auditMock = { createAuditLog: vi.fn() };

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/session", () => sessionMock);
vi.mock("@/lib/audit", () => auditMock);

const { POST } = await import("@/app/api/clientes/route");

function fakeRequest(body: unknown) {
  return new Request("http://local/api/clientes", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.getSession.mockResolvedValue({ id: 1, username: "vendedor", role: "vendedor" });
});

describe("POST /api/clientes — cadastro rapido pelo PDV (D-04, D-07, PDV-15)", () => {
  it("Teste 1: sem sessao responde 401 e nao chama create", async () => {
    sessionMock.getSession.mockResolvedValue(null);

    const res = await POST(fakeRequest({ nome: "Maria" }));

    expect(res.status).toBe(401);
    expect(dbMock.cliente.create).not.toHaveBeenCalled();
  });

  it("Teste 2: corpo sem nome responde 400 com mensagem legivel e nao chama create", async () => {
    const res = await POST(fakeRequest({}));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBeTruthy();
    expect(dbMock.cliente.create).not.toHaveBeenCalled();
  });

  it("Teste 3: nome com espacos extras e criado normalizado em caixa alta, 201 com id e nome", async () => {
    dbMock.cliente.create.mockResolvedValue({
      id: 10,
      nome: "ANA MARIA",
      telefone: null,
      cpf: null,
      cnpj: null,
      endereco: null,
      cep: null,
    });

    const res = await POST(fakeRequest({ nome: "  ana   maria  " }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.id).toBe(10);
    expect(body.nome).toBe("ANA MARIA");
    const args = dbMock.cliente.create.mock.calls[0][0];
    expect(args.data.nome).toBe("ANA MARIA");
  });

  it("Teste 4: create rejeita com P2002 vira 409 com mensagem citando o nome, sem codigo cru", async () => {
    dbMock.cliente.create.mockRejectedValue({ code: "P2002" });

    const res = await POST(fakeRequest({ nome: "Joao Silva" }));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toContain("JOAO SILVA");
    expect(body.error).not.toContain("P2002");
  });

  it("Teste 5: no sucesso grava audit log cliente:create com o id retornado", async () => {
    dbMock.cliente.create.mockResolvedValue({
      id: 20,
      nome: "CARLA",
      telefone: null,
      cpf: null,
      cnpj: null,
      endereco: null,
      cep: null,
    });

    await POST(fakeRequest({ nome: "Carla" }));

    expect(auditMock.createAuditLog).toHaveBeenCalledWith("cliente:create", {
      clienteId: 20,
      nome: "CARLA",
    });
  });

  it("Teste 6: empresa parceira valida grava empresaParceiraId e o nome resolvido no servidor; telefone/cpf chegam com trim", async () => {
    dbMock.empresaParceira.findUnique.mockResolvedValue({ id: 7, nome: "ACME LTDA" });
    dbMock.cliente.create.mockResolvedValue({
      id: 30,
      nome: "PEDRO",
      telefone: "11999990000",
      cpf: "12345678900",
      cnpj: null,
      endereco: null,
      cep: null,
    });

    await POST(
      fakeRequest({
        nome: "Pedro",
        telefone: " 11999990000 ",
        cpf: " 12345678900 ",
        empresaParceiraId: 7,
      })
    );

    const args = dbMock.cliente.create.mock.calls[0][0];
    expect(args.data.empresaParceiraId).toBe(7);
    expect(args.data.empresa).toBe("ACME LTDA");
    expect(args.data.telefone).toBe("11999990000");
    expect(args.data.cpf).toBe("12345678900");
  });

  it("Teste 7: empresaParceiraId que nao existe no banco grava empresaParceiraId e empresa como null, sem falhar a criacao", async () => {
    dbMock.empresaParceira.findUnique.mockResolvedValue(null);
    dbMock.cliente.create.mockResolvedValue({
      id: 31,
      nome: "LUCIA",
      telefone: null,
      cpf: null,
      cnpj: null,
      endereco: null,
      cep: null,
    });

    const res = await POST(fakeRequest({ nome: "Lucia", empresaParceiraId: 999 }));

    expect(res.status).toBe(201);
    const args = dbMock.cliente.create.mock.calls[0][0];
    expect(args.data.empresaParceiraId).toBeNull();
    expect(args.data.empresa).toBeNull();
  });
});
