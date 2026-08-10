import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks — mesmo padrao de fornecedores-post-route.test.ts.
const dbMock = {
  venda: { findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  despesa: { create: vi.fn() },
};
const sessionMock = { getSession: vi.fn() };
const cacheMock = { revalidatePath: vi.fn() };

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/session", () => sessionMock);
vi.mock("next/cache", () => cacheMock);

const { GET, POST } = await import("@/app/api/admin/backfill-taxa-antecipacao/route");

beforeEach(() => {
  vi.clearAllMocks();
});

/** Mesmo caso dourado das Tasks 1 e 2: 4 parcelas de 1000 vencendo 31/61/91/121 dias -> 416.78. */
function vendaDourada(id: number) {
  return {
    id,
    dataVenda: new Date("2026-01-01T00:00:00.000Z"),
    formaPagamento: "DESCONTO_FOLHA",
    descontoEmFolha: true,
    parcelas: 4,
    valorVenda: null,
    quantidade: null,
    valorFrete: 0,
    desconto: 0,
    itens: [{ subtotal: 4000 }],
    parcelasVencimento: [
      { dataVencimento: new Date("2026-01-31T00:00:00.000Z"), valorParcela: 1000 },
      { dataVencimento: new Date("2026-03-02T00:00:00.000Z"), valorParcela: 1000 },
      { dataVencimento: new Date("2026-04-01T00:00:00.000Z"), valorParcela: 1000 },
      { dataVencimento: new Date("2026-05-01T00:00:00.000Z"), valorParcela: 1000 },
    ],
  };
}

describe("GET/POST /api/admin/backfill-taxa-antecipacao — RBAC", () => {
  it("Teste 1: GET sem sessao admin responde 401 e nao le nem escreve nada", async () => {
    sessionMock.getSession.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(dbMock.venda.findMany).not.toHaveBeenCalled();
    expect(dbMock.venda.update).not.toHaveBeenCalled();
    expect(dbMock.venda.updateMany).not.toHaveBeenCalled();
  });

  it("Teste 2: POST sem sessao admin responde 401 e nao escreve nada", async () => {
    sessionMock.getSession.mockResolvedValue({ id: 1, role: "vendedor" });

    const res = await POST();

    expect(res.status).toBe(401);
    expect(dbMock.venda.update).not.toHaveBeenCalled();
    expect(dbMock.venda.updateMany).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/backfill-taxa-antecipacao — previa", () => {
  beforeEach(() => {
    sessionMock.getSession.mockResolvedValue({ id: 1, role: "admin" });
  });

  it("Teste 3: com admin devolve a previa com id, valorTotal e taxa calculada, sem chamar nenhuma escrita", async () => {
    dbMock.venda.findMany.mockResolvedValue([vendaDourada(1)]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.preview).toHaveLength(1);
    expect(body.preview[0]).toMatchObject({ id: 1, valorTotal: 4000, taxa: 416.78 });
    expect(dbMock.venda.update).not.toHaveBeenCalled();
    expect(dbMock.venda.updateMany).not.toHaveBeenCalled();
  });

  it("Teste 4: o where combina o filtro de venda antecipavel com taxaFinanceiraValor nulo", async () => {
    dbMock.venda.findMany.mockResolvedValue([]);

    await GET();

    const where = dbMock.venda.findMany.mock.calls[0][0].where;
    expect(where.taxaFinanceiraValor).toBeNull();
    expect(Array.isArray(where.OR)).toBe(true);
    expect(where.OR.length).toBeGreaterThan(0);
  });
});

describe("POST /api/admin/backfill-taxa-antecipacao — aplicacao", () => {
  beforeEach(() => {
    sessionMock.getSession.mockResolvedValue({ id: 1, role: "admin" });
  });

  it("Teste 5 (historico nao e reescrito): o data de todo venda.update contem taxaFinanceiraValor e NAO contem lucroLiquido", async () => {
    dbMock.venda.findMany.mockResolvedValue([vendaDourada(1)]);

    await POST();

    expect(dbMock.venda.update).toHaveBeenCalledTimes(1);
    const data = dbMock.venda.update.mock.calls[0][0].data;
    expect(data).toHaveProperty("taxaFinanceiraValor");
    expect(data).not.toHaveProperty("lucroLiquido");
  });

  it("Teste 6 (idempotencia): na segunda passada a lista vem vazia (filtro de nulo) e o POST responde atualizadas 0 sem escrever", async () => {
    dbMock.venda.findMany.mockResolvedValueOnce([vendaDourada(1)]);
    await POST();
    expect(dbMock.venda.update).toHaveBeenCalledTimes(1);

    vi.clearAllMocks();
    sessionMock.getSession.mockResolvedValue({ id: 1, role: "admin" });
    dbMock.venda.findMany.mockResolvedValueOnce([]);

    const res = await POST();
    const body = await res.json();

    expect(body.atualizadas).toBe(0);
    expect(dbMock.venda.update).not.toHaveBeenCalled();
  });

  it("Teste 7: o numero gravado bate com o dourado — nao pode divergir do que a venda nova produziria", async () => {
    dbMock.venda.findMany.mockResolvedValue([vendaDourada(1)]);

    await POST();

    expect(dbMock.venda.update.mock.calls[0][0].data.taxaFinanceiraValor).toBe(416.78);
  });

  it("Teste 8: prisma.despesa.create nunca e chamado", async () => {
    dbMock.venda.findMany.mockResolvedValue([vendaDourada(1)]);

    await POST();

    expect(dbMock.despesa.create).not.toHaveBeenCalled();
  });

  it("Teste 9: o POST chama revalidatePath para /financeiro", async () => {
    dbMock.venda.findMany.mockResolvedValue([vendaDourada(1)]);

    await POST();

    expect(cacheMock.revalidatePath).toHaveBeenCalledWith("/financeiro");
  });
});
