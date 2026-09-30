// O payload do limite (card da venda rápida) leva corte e dia de vencimento da regra da empresa
// do cliente vigente hoje, para a lista de parcelas do formulário nascer pela regra
// (spec 2026-09-30 §3.1 e §7).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { REGRA_PADRAO } from "@/lib/regra-empresa";

const dbMock = {
  cliente: { findUnique: vi.fn() },
  venda: { findMany: vi.fn() },
  contratoConsignado: { findMany: vi.fn() },
};
const regraDbMock = { regraDaEmpresaNaData: vi.fn() };
vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/regra-empresa-db", () => regraDbMock);

const { payloadLimiteCliente } = await import("@/lib/consignado-db");

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.cliente.findUnique.mockResolvedValue({ renda: 3000, nome: "Fulano", empresaParceiraId: 7 });
  dbMock.venda.findMany.mockResolvedValue([]);
  dbMock.contratoConsignado.findMany.mockResolvedValue([]);
  regraDbMock.regraDaEmpresaNaData.mockResolvedValue({ ...REGRA_PADRAO, diaCorte: 25, diaVencimento: 15, diaPix: 12 });
});

describe("payloadLimiteCliente", () => {
  it("inclui só corte e vencimento da regra vigente da empresa do cliente", async () => {
    const p = await payloadLimiteCliente(5);
    expect(regraDbMock.regraDaEmpresaNaData).toHaveBeenCalledWith(7, expect.any(Date));
    expect(p?.regraVencimento).toEqual({ diaCorte: 25, diaVencimento: 15 });
  });

  it("com a data da venda, lê a regra vigente nessa data e não na de hoje", async () => {
    const dataVenda = new Date("2026-12-22T00:00:00.000Z");
    await payloadLimiteCliente(5, dataVenda);
    expect(regraDbMock.regraDaEmpresaNaData).toHaveBeenCalledWith(7, dataVenda);
  });
});

describe("GET /api/clientes/[id]/limite?data=", () => {
  // A regra vigente muda com a data: a venda rápida com data retroativa ou futura precisa da
  // regra daquela data, não da de hoje (2026-09-30).
  const payloadMock = vi.fn();
  const chamar = async (qs: string) => {
    vi.resetModules();
    vi.doMock("@/lib/consignado-db", () => ({ payloadLimiteCliente: payloadMock }));
    const { GET } = await import("@/app/api/clientes/[id]/limite/route");
    const { NextRequest } = await import("next/server");
    payloadMock.mockResolvedValue({ margemTotal: 0 });
    await GET(new NextRequest(`http://localhost/api/clientes/5/limite${qs}`), { params: Promise.resolve({ id: "5" }) });
    return payloadMock.mock.calls.at(-1) as [number, Date];
  };

  it("data AAAA-MM-DD válida vai para o payload em UTC", async () => {
    const [id, data] = await chamar("?data=2026-12-22");
    expect(id).toBe(5);
    expect(data.toISOString()).toBe("2026-12-22T00:00:00.000Z");
  });

  it("data inválida ou em outro formato cai em hoje", async () => {
    for (const qs of ["?data=2026-13-40", "?data=22/12/2026", "?data=2026-02-30", ""]) {
      const antes = Date.now();
      const [, data] = await chamar(qs);
      expect(data.getTime()).toBeGreaterThanOrEqual(antes - 1000);
      expect(data.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
    }
  });
});
