// Leitura das regras por empresa no banco (spec 2026-09-30 §3.1).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { REGRA_PADRAO } from "@/lib/regra-empresa";

const dbMock = {
  regraEmpresa: { findMany: vi.fn() },
  cliente: { findUnique: vi.fn() },
};
vi.mock("@/lib/db", () => ({ prisma: dbMock }));

const { regrasDaEmpresa, regraDaEmpresaNaData, regraDoClienteNaData } = await import("@/lib/regra-empresa-db");

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const linha = (o: Record<string, unknown>) => ({
  id: 1,
  empresaParceiraId: 7,
  vigenteDe: d("2026-01-01"),
  vigenteAte: null,
  diaCorte: 20,
  diaVencimento: 10,
  diaPix: 15,
  repassePct: null,
  repasseBase: null,
  cobrancaViaBfx: false,
  observacao: null,
  criadaEm: d("2026-01-01"),
  criadaPor: "admin",
  ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.regraEmpresa.findMany.mockResolvedValue([
    linha({ id: 1, vigenteDe: d("2026-01-01"), vigenteAte: d("2026-10-01"), diaVencimento: 10 }),
    linha({ id: 2, vigenteDe: d("2026-10-01"), vigenteAte: null, diaVencimento: 15, repassePct: 7, repasseBase: "venda" }),
  ]);
});

describe("regrasDaEmpresa", () => {
  it("busca as regras da empresa em ordem de vigência e devolve só os campos da regra", async () => {
    const regras = await regrasDaEmpresa(7);
    expect(dbMock.regraEmpresa.findMany).toHaveBeenCalledWith({ where: { empresaParceiraId: 7 }, orderBy: { vigenteDe: "asc" } });
    expect(regras[1]).toEqual({
      id: 2,
      vigenteDe: d("2026-10-01"),
      vigenteAte: null,
      diaCorte: 20,
      diaVencimento: 15,
      diaPix: 15,
      repassePct: 7,
      repasseBase: "venda",
      cobrancaViaBfx: false,
    });
  });
  it("repasseBase desconhecida vira null", async () => {
    dbMock.regraEmpresa.findMany.mockResolvedValue([linha({ repasseBase: "outra" })]);
    expect((await regrasDaEmpresa(7))[0].repasseBase).toBeNull();
  });
});

describe("regraDaEmpresaNaData", () => {
  it("empresa nula devolve o padrão sem consultar o banco", async () => {
    expect(await regraDaEmpresaNaData(null, d("2026-10-05"))).toEqual(REGRA_PADRAO);
    expect(await regraDaEmpresaNaData(undefined, d("2026-10-05"))).toEqual(REGRA_PADRAO);
    expect(dbMock.regraEmpresa.findMany).not.toHaveBeenCalled();
  });
  it("a data escolhe a regra vigente", async () => {
    expect((await regraDaEmpresaNaData(7, d("2026-09-30"))).diaVencimento).toBe(10);
    expect((await regraDaEmpresaNaData(7, d("2026-10-01"))).diaVencimento).toBe(15);
  });
  it("antes de qualquer vigência, padrão", async () => {
    expect(await regraDaEmpresaNaData(7, d("2025-12-31"))).toEqual(REGRA_PADRAO);
  });
});

describe("regraDoClienteNaData", () => {
  it("cliente sem empresa parceira usa o padrão", async () => {
    dbMock.cliente.findUnique.mockResolvedValue({ empresaParceiraId: null });
    expect(await regraDoClienteNaData(3, d("2026-10-05"))).toEqual(REGRA_PADRAO);
    expect(dbMock.regraEmpresa.findMany).not.toHaveBeenCalled();
  });
  it("cliente inexistente usa o padrão", async () => {
    dbMock.cliente.findUnique.mockResolvedValue(null);
    expect(await regraDoClienteNaData(3, d("2026-10-05"))).toEqual(REGRA_PADRAO);
  });
  it("cliente com empresa usa a regra da empresa", async () => {
    dbMock.cliente.findUnique.mockResolvedValue({ empresaParceiraId: 7 });
    const r = await regraDoClienteNaData(3, d("2026-10-05"));
    expect(dbMock.cliente.findUnique).toHaveBeenCalledWith({ where: { id: 3 }, select: { empresaParceiraId: true } });
    expect(r.diaVencimento).toBe(15);
    expect(dbMock.regraEmpresa.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { empresaParceiraId: 7 } }));
  });
});
