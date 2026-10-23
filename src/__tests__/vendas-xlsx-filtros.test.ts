// R1-5: a exportação do Histórico respeita os filtros novos (assinatura e busca q),
// com os mesmos critérios da página, e preserva a sessão e o escopo de vendedor.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dbMock = { venda: { findMany: vi.fn() } };
const sessionMock = { getSession: vi.fn() };
const searchMock = { fuzzyFindVendaIds: vi.fn() };

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/session", () => sessionMock);
vi.mock("@/lib/db-search", () => searchMock);

const { GET } = await import("@/app/api/relatorios/vendas-xlsx/route");
const { whereAssinatura } = await import("@/lib/historico-filtros");

const req = (qs: string) => new Request(`http://x/api/relatorios/vendas-xlsx?${qs}`) as never;

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.getSession.mockResolvedValue({ id: 1, username: "adm", nomeExibicao: "Adm", role: "admin" });
  dbMock.venda.findMany.mockResolvedValue([]);
  searchMock.fuzzyFindVendaIds.mockResolvedValue([11, 12]);
});

describe("GET /api/relatorios/vendas-xlsx — filtros do Histórico", () => {
  it("sem sessão responde 401 e não consulta", async () => {
    sessionMock.getSession.mockResolvedValue(null);
    const res = await GET(req("assinatura=pendente"));
    expect(res.status).toBe(401);
    expect(dbMock.venda.findMany).not.toHaveBeenCalled();
  });

  it("assinatura=pendente aplica whereAssinatura (o mesmo da página)", async () => {
    await GET(req("from=2026-10-01&to=2026-10-16&assinatura=pendente"));
    const where = dbMock.venda.findMany.mock.calls[0][0].where;
    expect(where.AND).toContainEqual(whereAssinatura("pendente"));
  });

  it("assinatura=assinado aplica o critério de assinadas", async () => {
    await GET(req("assinatura=assinado"));
    const where = dbMock.venda.findMany.mock.calls[0][0].where;
    expect(where.AND).toContainEqual(whereAssinatura("assinado"));
  });

  it("sem assinatura o where não ganha AND", async () => {
    await GET(req("from=2026-10-01"));
    expect(dbMock.venda.findMany.mock.calls[0][0].where.AND).toBeUndefined();
  });

  it("q usa o MESMO fuzzyFindVendaIds da página (limite 200) e restringe por id", async () => {
    await GET(req("q=maria"));
    expect(searchMock.fuzzyFindVendaIds).toHaveBeenCalledWith("maria", 200);
    expect(dbMock.venda.findMany.mock.calls[0][0].where.id).toEqual({ in: [11, 12] });
  });

  it("sem q não chama a busca", async () => {
    await GET(req("from=2026-10-01"));
    expect(searchMock.fuzzyFindVendaIds).not.toHaveBeenCalled();
    expect(dbMock.venda.findMany.mock.calls[0][0].where.id).toBeUndefined();
  });

  it("q sem resultado exporta zero vendas (id in [])", async () => {
    searchMock.fuzzyFindVendaIds.mockResolvedValue([]);
    await GET(req("q=zzz"));
    expect(dbMock.venda.findMany.mock.calls[0][0].where.id).toEqual({ in: [] });
  });

  it("vendedor não-admin continua travado no próprio nome, com os filtros novos", async () => {
    sessionMock.getSession.mockResolvedValue({ id: 2, username: "ana", nomeExibicao: "Ana", role: "vendedor" });
    await GET(req("vendedor=Bia&assinatura=pendente&q=maria"));
    const where = dbMock.venda.findMany.mock.calls[0][0].where;
    expect(where.vendedor).toBe("Ana");
    expect(where.AND).toContainEqual(whereAssinatura("pendente"));
  });
});

describe("Histórico: o link de exportação leva os filtros novos", () => {
  it("page.tsx repassa assinatura e q ao xlsxHref", () => {
    const page = readFileSync(join(process.cwd(), "src/app/(app)/historico/page.tsx"), "utf8");
    expect(page).toContain('xlsxParams.set("assinatura"');
    expect(page).toContain('xlsxParams.set("q"');
  });
});
