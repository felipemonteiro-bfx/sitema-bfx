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
});
