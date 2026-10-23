// db-search: o termo digitado vai sempre como parâmetro ($1) e os curingas do LIKE/ILIKE
// (%, _ e a própria barra) são escapados no SQL, para "50%" ou "_" não casarem tudo.
// Escopo de vendedor da busca fuzzy usa vendedor_id (com perna legada), não a coluna deprecated.
import { describe, it, expect, vi, beforeEach } from "vitest";

const dbMock = {
  $queryRawUnsafe: vi.fn(),
  venda: { findMany: vi.fn() },
  cliente: { findMany: vi.fn() },
};
vi.mock("@/lib/db", () => ({ prisma: dbMock }));

const { unaccentFindClienteIds, fuzzyFindVendas, fuzzyFindVendaIds } = await import("@/lib/db-search");

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.$queryRawUnsafe.mockResolvedValue([]);
  dbMock.venda.findMany.mockResolvedValue([]);
});

const ESCAPE_LIKE = /replace\(replace\(replace\(/;

describe("db-search — termo parametrizado e curingas escapados", () => {
  it("unaccentFindClienteIds: termo vai em $1 (nunca interpolado) e o LIKE escapa %, _ e barra", async () => {
    await unaccentFindClienteIds("50%'; DROP TABLE x;--", 10);
    const [sql, ...args] = dbMock.$queryRawUnsafe.mock.calls[0];
    expect(args[0]).toBe("50%'; DROP TABLE x;--");
    expect(sql).not.toContain("DROP");
    expect(sql).toMatch(ESCAPE_LIKE);
    expect(sql).toContain("$1");
  });

  it("fuzzyFindVendas: os ILIKE de vendedor e itens também escapam os curingas", async () => {
    await fuzzyFindVendas("a_b%", 10);
    const sqls = dbMock.$queryRawUnsafe.mock.calls.map((c) => String(c[0]));
    const comIlike = sqls.filter((s) => s.includes("ILIKE"));
    expect(comIlike.length).toBeGreaterThanOrEqual(3);
    for (const s of comIlike) expect(s).toMatch(ESCAPE_LIKE);
  });

  it("fuzzyFindVendas com escopo: SQL usa vendedor_id OU (vendedor_id nulo e texto igual), com parâmetros", async () => {
    dbMock.$queryRawUnsafe.mockResolvedValue([{ id: 1, venda_id: 1 }]);
    await fuzzyFindVendas("maria", 10, { id: 7, nome: "Ana" });
    const chamadas = dbMock.$queryRawUnsafe.mock.calls.filter((c) => /\n\s+FROM "(vendas|itens_venda)"/.test(String(c[0])));
    expect(chamadas.length).toBe(2);
    for (const [sql, ...args] of chamadas) {
      expect(String(sql)).toContain('"vendedor_id"');
      expect(args).toContain(7);
      expect(args).toContain("Ana");
    }
    const where = dbMock.venda.findMany.mock.calls[0][0].where;
    expect(JSON.stringify(where)).toContain('"vendedorId":7');
    expect(JSON.stringify(where)).toContain('"vendedorId":null');
  });
});

describe("db-search — escopo do vendedor entra no SQL ANTES do LIMIT", () => {
  const escopo = { id: 7, nome: "Ana" };

  it("fuzzyFindVendas com escopo: a busca de clientes também é travada nas vendas do vendedor (EXISTS) antes do LIMIT", async () => {
    await fuzzyFindVendas("maria", 10, escopo);
    const chamada = dbMock.$queryRawUnsafe.mock.calls.find((c) => /FROM "clientes"/.test(String(c[0])));
    expect(chamada).toBeTruthy();
    const [sql, ...args] = chamada!;
    const texto = String(sql);
    expect(texto).toMatch(/EXISTS \(SELECT 1 FROM "vendas"/);
    expect(texto).toContain('"vendedor_id"');
    // O EXISTS vem antes do LIMIT.
    expect(texto.indexOf("EXISTS")).toBeLessThan(texto.indexOf("LIMIT"));
    expect(args).toContain(7);
    expect(args).toContain("Ana");
  });

  it("fuzzyFindVendas sem escopo (admin): SQL de clientes sem EXISTS", async () => {
    await fuzzyFindVendas("maria", 10);
    const chamada = dbMock.$queryRawUnsafe.mock.calls.find((c) => /FROM "clientes"/.test(String(c[0])));
    expect(String(chamada![0])).not.toContain("EXISTS");
  });

  it("unaccentFindClienteIds com escopo: EXISTS parametrizado + ORDER BY antes do LIMIT", async () => {
    await unaccentFindClienteIds("maria", 500, escopo);
    const [sql, ...args] = dbMock.$queryRawUnsafe.mock.calls[0];
    const texto = String(sql);
    expect(texto).toMatch(/EXISTS \(SELECT 1 FROM "vendas"/);
    expect(texto).toContain("ORDER BY");
    expect(texto.indexOf("EXISTS")).toBeLessThan(texto.indexOf("LIMIT"));
    expect(texto.indexOf("ORDER BY")).toBeLessThan(texto.indexOf("LIMIT"));
    expect(args).toEqual(expect.arrayContaining(["maria", 500, 7, "Ana"]));
    expect(texto).not.toContain("Ana");
  });

  it("unaccentFindClienteIds sem escopo mantém o SQL do admin (sem EXISTS), agora com ORDER BY", async () => {
    await unaccentFindClienteIds("maria", 500);
    const texto = String(dbMock.$queryRawUnsafe.mock.calls[0][0]);
    expect(texto).not.toContain("EXISTS");
    expect(texto).toContain("ORDER BY");
    expect(texto).toMatch(ESCAPE_LIKE);
  });
});

describe("fuzzyFindVendaIds — variante só de ids", () => {
  it("busca só o id (sem include de cliente/itens) e devolve number[]", async () => {
    dbMock.$queryRawUnsafe.mockResolvedValue([{ id: 3, venda_id: 3 }]);
    dbMock.venda.findMany.mockResolvedValue([{ id: 3 }, { id: 4 }]);
    const ids = await fuzzyFindVendaIds("maria", 200, { id: 7, nome: "Ana" });
    expect(ids).toEqual([3, 4]);
    const arg = dbMock.venda.findMany.mock.calls[0][0];
    expect(arg.include).toBeUndefined();
    expect(arg.select).toEqual({ id: true });
    expect(JSON.stringify(arg.where)).toContain('"vendedorId":7');
  });
  it("termo vazio devolve lista vazia sem consultar", async () => {
    expect(await fuzzyFindVendaIds("  ")).toEqual([]);
    expect(dbMock.$queryRawUnsafe).not.toHaveBeenCalled();
  });
});
