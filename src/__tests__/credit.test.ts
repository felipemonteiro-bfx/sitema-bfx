import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    cliente: { findUnique: vi.fn() },
    venda: { findMany: vi.fn() },
  },
}));

import { checkCredito } from "@/lib/credit";
import { prisma } from "@/lib/db";

const mockFindUniqueCliente = vi.mocked(prisma.cliente.findUnique);
const mockFindManyVenda = vi.mocked(prisma.venda.findMany);

describe("checkCredito", () => {
  beforeEach(() => {
    mockFindUniqueCliente.mockReset();
    mockFindManyVenda.mockReset();
  });

  it("libera (ok=true) quando cliente nao tem renda cadastrada", async () => {
    mockFindUniqueCliente.mockResolvedValue({ id: 1, renda: null } as never);
    const result = await checkCredito(1, 500);
    expect(result.ok).toBe(true);
    expect(result.teto).toBe(0);
  });

  it("libera (ok=true) quando cliente nao existe", async () => {
    mockFindUniqueCliente.mockResolvedValue(null as never);
    const result = await checkCredito(999, 500);
    expect(result.ok).toBe(true);
  });

  it("bloqueia (ok=false) quando a nova parcela estoura o teto de 30% da renda", async () => {
    mockFindUniqueCliente.mockResolvedValue({ id: 1, renda: 1000 } as never); // teto = min(300, 475) = 300
    mockFindManyVenda.mockResolvedValue([]);
    const result = await checkCredito(1, 350);
    expect(result.ok).toBe(false);
    expect(result.teto).toBe(300);
  });

  it("libera quando a nova parcela cabe dentro do teto disponivel", async () => {
    mockFindUniqueCliente.mockResolvedValue({ id: 1, renda: 1000 } as never); // teto = 300
    mockFindManyVenda.mockResolvedValue([]);
    const result = await checkCredito(1, 200);
    expect(result.ok).toBe(true);
  });

  it("respeita o teto absoluto de R$475 mesmo com renda alta", async () => {
    mockFindUniqueCliente.mockResolvedValue({ id: 1, renda: 100000 } as never); // 30% seria 30000, teto trava em 475
    mockFindManyVenda.mockResolvedValue([]);
    const result = await checkCredito(1, 500);
    expect(result.ok).toBe(false);
    expect(result.teto).toBe(475);
  });

  it("soma o comprometimento de vendas ativas no mes corrente antes de decidir", async () => {
    mockFindUniqueCliente.mockResolvedValue({ id: 1, renda: 1000 } as never); // teto = 300
    const hoje = new Date();
    const vendaAntiga = {
      dataVenda: new Date(hoje.getFullYear(), hoje.getMonth() - 2, 5),
      parcelas: 12,
      valorParcela: 250,
    };
    mockFindManyVenda.mockResolvedValue([vendaAntiga] as never);
    const result = await checkCredito(1, 100);
    // 250 (ja comprometido) + 100 (nova) = 350 > 300 (teto) => estoura
    expect(result.ok).toBe(false);
    expect(result.tomado).toBe(250);
  });
});
