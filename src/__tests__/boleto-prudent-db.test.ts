// Gravações do boleto Prudent (spec 2026-09-30 §3.4) e ajustes de 30/09: o direcionamento do boleto
// sai da regra do dia 1º da competência do vencimento (a mesma data do fechamento).
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));
const regraMock = { regrasDaEmpresa: vi.fn() };
vi.mock("@/lib/regra-empresa-db", () => regraMock);

const { criarBoletosDoLote } = await import("@/lib/boleto-prudent-db");

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const regra = (o: Record<string, unknown>) => ({
  vigenteDe: d("2026-01-01"),
  vigenteAte: null,
  diaCorte: 20,
  diaVencimento: 10,
  diaPix: 15,
  repassePct: null,
  repasseBase: null,
  cobrancaViaBfx: true,
  ...o,
});

const tx = {
  boletoPrudent: { create: vi.fn() },
  parcelaVencimento: { updateMany: vi.fn() },
};

beforeEach(() => {
  vi.clearAllMocks();
  let id = 100;
  tx.boletoPrudent.create.mockImplementation(async () => ({ id: ++id }));
  tx.parcelaVencimento.updateMany.mockImplementation(async (a: { where: { id: { in: number[] } } }) => ({ count: a.where.id.in.length }));
});

describe("criarBoletosDoLote — direcionamento", () => {
  it("regra BFX vigente no dia 1º do mês do vencimento → bfx", async () => {
    regraMock.regrasDaEmpresa.mockResolvedValue([regra({})]);
    await criarBoletosDoLote(tx as never, { id: 5, empresaParceiraId: 7 }, [{ id: 1, dataVencimento: d("2026-10-10"), valorParcela: 300 }]);
    expect(tx.boletoPrudent.create.mock.calls[0][0].data.direcionamento).toBe("bfx");
  });

  it("regra (antiga) que liga no meio do mês: o boleto segue o dia 1º, como o fechamento → empresa", async () => {
    regraMock.regrasDaEmpresa.mockResolvedValue([regra({ vigenteDe: d("2026-10-05") })]);
    await criarBoletosDoLote(tx as never, { id: 5, empresaParceiraId: 7 }, [{ id: 1, dataVencimento: d("2026-10-10"), valorParcela: 300 }]);
    expect(tx.boletoPrudent.create.mock.calls[0][0].data.direcionamento).toBe("empresa");
  });

  it("regra (antiga) que desliga no meio do mês: o mês inteiro continua BFX → bfx", async () => {
    regraMock.regrasDaEmpresa.mockResolvedValue([regra({ vigenteAte: d("2026-10-05") })]);
    await criarBoletosDoLote(tx as never, { id: 5, empresaParceiraId: 7 }, [{ id: 1, dataVencimento: d("2026-10-10"), valorParcela: 300 }]);
    expect(tx.boletoPrudent.create.mock.calls[0][0].data.direcionamento).toBe("bfx");
  });
});
