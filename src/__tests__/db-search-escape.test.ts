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

const { unaccentFindClienteIds, fuzzyFindVendas } = await import("@/lib/db-search");

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
    const chamadas = dbMock.$queryRawUnsafe.mock.calls.filter((c) => String(c[0]).includes('"vendas"') || String(c[0]).includes("itens_venda"));
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
