import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = { venda: { count: vi.fn() } };
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const { ehPrimeiraCompra } = await import("@/lib/primeira-compra");

beforeEach(() => vi.clearAllMocks());

describe("ehPrimeiraCompra", () => {
  it("true quando não existe venda anterior do cliente", async () => {
    prismaMock.venda.count.mockResolvedValue(0);
    expect(await ehPrimeiraCompra(7, 100)).toBe(true);
    const where = prismaMock.venda.count.mock.calls[0]![0].where;
    expect(where.clienteId).toBe(7);
    expect(where.id.lt).toBe(100);
  });

  it("false quando existe venda anterior", async () => {
    prismaMock.venda.count.mockResolvedValue(2);
    expect(await ehPrimeiraCompra(7, 100)).toBe(false);
  });
});
