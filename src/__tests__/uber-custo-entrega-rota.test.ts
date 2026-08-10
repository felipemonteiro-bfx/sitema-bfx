import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks — mesmo padrao de fornecedores-post-route.test.ts: objeto local de mock,
// nunca importar prisma/getSession/getUberDirectConfig reais no teste.
const dbMock = {
  venda: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  despesa: {
    create: vi.fn(),
  },
};
const sessionMock = { getSession: vi.fn() };
const uberMock = { getUberDirectConfig: vi.fn() };

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/session", () => sessionMock);
vi.mock("@/lib/uber", () => uberMock);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { POST } = await import("@/app/api/frete/uber/custo/route");
const { revalidatePath } = await import("next/cache");

const CONFIG_ESTATICA = { source: "static_token" as const, customerId: "cust1", token: "tok1" };

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.getSession.mockResolvedValue({ id: 1, username: "admin", role: "admin" });
  uberMock.getUberDirectConfig.mockResolvedValue(CONFIG_ESTATICA);
  dbMock.venda.findUnique.mockResolvedValue({ id: 7 });
  global.fetch = vi.fn();
});

function req(body: Record<string, unknown>) {
  return new Request("http://local/api/frete/uber/custo", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function mockFetchOnce(status: number, corpo: unknown) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => corpo,
  });
}

describe("POST /api/frete/uber/custo — RBAC (T-F21-01)", () => {
  it("Teste 10: sem sessao admin -> 401 e prisma.venda.update NAO foi chamado", async () => {
    sessionMock.getSession.mockResolvedValue(null);

    const res = await POST(req({ vendaId: 7, deliveryId: "del_1" }));

    expect(res.status).toBe(401);
    expect(dbMock.venda.update).not.toHaveBeenCalled();
  });
});

describe("POST /api/frete/uber/custo — caminho feliz", () => {
  it("Teste 11: fetch com full_fee.total 2490 -> 200 e prisma.venda.update com custoEnvio 24.9", async () => {
    mockFetchOnce(200, {
      id: "del_1",
      status: "delivered",
      full_fee: { total: 2490, currency_code: "BRL", line_items: [] },
    });
    dbMock.venda.update.mockResolvedValue({ id: 7, custoEnvio: 24.9 });

    const res = await POST(req({ vendaId: 7, deliveryId: "del_1" }));

    expect(res.status).toBe(200);
    expect(dbMock.venda.update).toHaveBeenCalledTimes(1);
    const chamada = dbMock.venda.update.mock.calls[0][0];
    expect(chamada.where).toEqual({ id: 7 });
    expect(chamada.data.custoEnvio).toBe(24.9);
  });

  it("Teste 12: apos gravar, revalidatePath foi chamado para /financeiro", async () => {
    mockFetchOnce(200, {
      id: "del_1",
      status: "delivered",
      full_fee: { total: 2490, currency_code: "BRL", line_items: [] },
    });
    dbMock.venda.update.mockResolvedValue({ id: 7, custoEnvio: 24.9 });

    await POST(req({ vendaId: 7, deliveryId: "del_1" }));

    expect(revalidatePath).toHaveBeenCalledWith("/financeiro");
  });

  it("Teste 13: prisma.despesa.create NUNCA e chamado (T-F21-06: trava contra dupla contagem no DRE)", async () => {
    mockFetchOnce(200, {
      id: "del_1",
      status: "delivered",
      full_fee: { total: 2490, currency_code: "BRL", line_items: [] },
    });
    dbMock.venda.update.mockResolvedValue({ id: 7, custoEnvio: 24.9 });

    await POST(req({ vendaId: 7, deliveryId: "del_1" }));

    expect(dbMock.despesa.create).not.toHaveBeenCalled();
  });
});

describe("POST /api/frete/uber/custo — falhas", () => {
  it("Teste 14: sem credencial -> 503, nenhuma escrita, mensagem em pt-BR", async () => {
    uberMock.getUberDirectConfig.mockResolvedValue(null);

    const res = await POST(req({ vendaId: 7, deliveryId: "del_1" }));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(dbMock.venda.update).not.toHaveBeenCalled();
    expect(body.mensagem ?? body.error).toMatch(/[a-zA-Z]/);
  });

  it("Teste 15: Uber responde 500 -> rota responde 502 e nenhuma escrita acontece", async () => {
    mockFetchOnce(500, { message: "internal error" });

    const res = await POST(req({ vendaId: 7, deliveryId: "del_1" }));

    expect(res.status).toBe(502);
    expect(dbMock.venda.update).not.toHaveBeenCalled();
  });

  it("Teste 16: corpo da resposta HTTP nunca contem a mensagem de erro crua devolvida pela Uber", async () => {
    mockFetchOnce(500, { message: "texto interno cru da uber que nao pode vazar" });

    const res = await POST(req({ vendaId: 7, deliveryId: "del_1" }));
    const texto = await res.text();

    expect(texto).not.toContain("texto interno cru da uber");
  });
});
