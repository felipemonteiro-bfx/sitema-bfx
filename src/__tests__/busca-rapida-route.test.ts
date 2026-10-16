import { describe, it, expect, vi, beforeEach } from "vitest";

const dbMock = {
  venda: { findMany: vi.fn(), count: vi.fn() },
  cliente: { findMany: vi.fn() },
  usuario: { findMany: vi.fn() },
};
const sessionMock = { getSession: vi.fn() };
const searchMock = {
  fuzzyFindVendas: vi.fn(),
  unaccentFindClienteIds: vi.fn(),
};

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/session", () => sessionMock);
vi.mock("@/lib/db-search", () => searchMock);

const { GET } = await import("@/app/api/busca-rapida/route");

const req = (q: string) => new Request(`http://local/api/busca-rapida?q=${encodeURIComponent(q)}`);

const vendaBD = {
  id: 258,
  dataVenda: new Date("2026-10-01T00:00:00Z"),
  valorVenda: 100,
  quantidade: 2,
  valorFrete: 0,
  desconto: 0,
  itens: [],
  assinaturaToken: "tok",
  assinatura: { assinaturaStatus: "pendente" },
  cliente: { nome: "Maria Souza" },
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.getSession.mockResolvedValue({ id: 1, username: "ana", nomeExibicao: "Ana", role: "vendedor" });
  dbMock.usuario.findMany.mockResolvedValue([
    { username: "ana", nomeExibicao: "Ana" },
    { username: "bia", nomeExibicao: "Bia" },
  ]);
  dbMock.venda.findMany.mockResolvedValue([vendaBD]);
  dbMock.venda.count.mockResolvedValue(1);
  dbMock.cliente.findMany.mockResolvedValue([{ id: 7, nome: "Maria Souza" }]);
  searchMock.fuzzyFindVendas.mockResolvedValue([{ id: 258 }]);
  searchMock.unaccentFindClienteIds.mockResolvedValue([7]);
});

describe("GET /api/busca-rapida", () => {
  it("sem sessao responde 401 e nao toca no banco", async () => {
    sessionMock.getSession.mockResolvedValue(null);
    const res = await GET(req("maria"));
    expect(res.status).toBe(401);
    expect(dbMock.venda.findMany).not.toHaveBeenCalled();
    expect(searchMock.fuzzyFindVendas).not.toHaveBeenCalled();
  });

  it("q com mais de 80 caracteres responde 400", async () => {
    const res = await GET(req("a".repeat(81)));
    expect(res.status).toBe(400);
  });

  it("q com 80 caracteres e aceita", async () => {
    const res = await GET(req("a".repeat(80)));
    expect(res.status).toBe(200);
  });

  it("vendedor: busca fuzzy, contagem e listagem levam o escopo do proprio vendedor", async () => {
    await GET(req("maria"));
    expect(searchMock.fuzzyFindVendas).toHaveBeenCalledWith("maria", expect.any(Number), "Ana");
    expect(dbMock.venda.findMany.mock.calls[0][0].where.vendedor).toBe("Ana");
    expect(dbMock.venda.count.mock.calls[0][0].where.vendedor).toBe("Ana");
  });

  it("vendedor citando outro vendedor: o where continua travado no proprio", async () => {
    await GET(req("pendentes da bia"));
    expect(dbMock.venda.findMany.mock.calls[0][0].where.vendedor).toBe("Ana");
  });

  it("vendedor: clientes so os das proprias vendas", async () => {
    await GET(req("maria"));
    const where = dbMock.cliente.findMany.mock.calls[0][0].where;
    expect(where.vendas).toEqual({ some: { vendedor: "Ana" } });
  });

  it("vendedor buscando por id: where inclui id e escopo", async () => {
    await GET(req("#258"));
    const where = dbMock.venda.findMany.mock.calls[0][0].where;
    expect(where.id).toBe(258);
    expect(where.vendedor).toBe("Ana");
  });

  it("admin: sem escopo de vendedor, e pode filtrar por vendedor citado", async () => {
    sessionMock.getSession.mockResolvedValue({ id: 2, username: "adm", role: "admin" });
    await GET(req("pendentes da bia"));
    expect(dbMock.venda.findMany.mock.calls[0][0].where.vendedor).toBe("Bia");
    await GET(req("maria"));
    expect(dbMock.venda.findMany.mock.calls[1][0].where.vendedor).toBeUndefined();
    expect(dbMock.cliente.findMany.mock.calls.at(-1)?.[0].where.vendas).toBeUndefined();
  });

  it("limita a 5 vendas e 5 clientes", async () => {
    await GET(req("maria"));
    expect(dbMock.venda.findMany.mock.calls[0][0].take).toBe(5);
    expect(dbMock.cliente.findMany.mock.calls[0][0].take).toBe(5);
  });

  it("resposta traz so os campos permitidos e nunca dado sensivel", async () => {
    // O banco mockado devolve campos a mais de proposito: a rota tem que filtrar.
    dbMock.venda.findMany.mockResolvedValue([{ ...vendaBD, custoProduto: 40, lucroLiquido: 60 }]);
    dbMock.cliente.findMany.mockResolvedValue([{ id: 7, nome: "Maria", cpf: "123", telefone: "9" }]);
    const res = await GET(req("maria"));
    const body = await res.json();
    expect(body.vendas[0]).toEqual({
      id: 258,
      cliente: "Maria Souza",
      data: "2026-10-01",
      valor: 200,
      statusAssinatura: "pendente",
    });
    expect(body.clientes[0]).toEqual({ id: 7, nome: "Maria" });
    expect(body.totalVendas).toBe(1);
    const texto = JSON.stringify(body).toLowerCase();
    for (const proibido of ["custo", "lucro", "cpf", "telefone", "email"]) {
      expect(texto).not.toContain(proibido);
    }
    // E nao pede esses campos ao banco.
    const select = JSON.stringify(dbMock.venda.findMany.mock.calls[0][0].select);
    expect(select).not.toMatch(/lucro|cpf|telefone|email|custo/);
    expect(dbMock.cliente.findMany.mock.calls[0][0].select).toEqual({ id: true, nome: true });
  });
});
