// Cadastro das regras por empresa (spec 2026-09-30 §3.1): guarda de admin, validação,
// vigências sem sobreposição e audit.
import { describe, it, expect, vi, beforeEach } from "vitest";

const dbMock = {
  regraEmpresa: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
};
const guardsMock = { requireAdminOrThrow: vi.fn() };
const auditMock = { createAuditLog: vi.fn() };
const cacheMock = { revalidatePath: vi.fn() };
vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/guards", () => guardsMock);
vi.mock("@/lib/audit", () => auditMock);
vi.mock("next/cache", () => cacheMock);

const { salvarRegraEmpresa, excluirRegraEmpresa } = await import("@/app/(app)/cadastros/regras-actions");

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
function form(campos: Record<string, string>): FormData {
  const fd = new FormData();
  const base = { empresaParceiraId: "7", vigenteDe: "2026-10-01", vigenteAte: "", diaCorte: "20", diaVencimento: "15", diaPix: "15", repassePct: "" };
  for (const [k, v] of Object.entries({ ...base, ...campos })) fd.set(k, v);
  return fd;
}
const existente = (o: Record<string, unknown> = {}) => ({
  id: 1,
  empresaParceiraId: 7,
  vigenteDe: d("2026-01-01"),
  vigenteAte: d("2026-10-01"),
  diaCorte: 20,
  diaVencimento: 10,
  diaPix: 15,
  repassePct: null,
  repasseBase: null,
  cobrancaViaBfx: false,
  ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  guardsMock.requireAdminOrThrow.mockResolvedValue({ id: 1, username: "andre", role: "admin" });
  dbMock.regraEmpresa.findMany.mockResolvedValue([existente()]);
  dbMock.regraEmpresa.findUnique.mockResolvedValue(existente());
  dbMock.regraEmpresa.create.mockResolvedValue({ id: 2 });
  dbMock.regraEmpresa.update.mockResolvedValue({ id: 1 });
  dbMock.regraEmpresa.delete.mockResolvedValue({ id: 1 });
});

describe("salvarRegraEmpresa", () => {
  it("sem admin nada é lido nem gravado", async () => {
    guardsMock.requireAdminOrThrow.mockRejectedValue(new Error("Acesso negado. Requer perfil admin."));
    await expect(salvarRegraEmpresa(form({}))).rejects.toThrow("Acesso negado");
    expect(dbMock.regraEmpresa.findMany).not.toHaveBeenCalled();
    expect(dbMock.regraEmpresa.create).not.toHaveBeenCalled();
    expect(dbMock.regraEmpresa.update).not.toHaveBeenCalled();
  });

  it("payload inválido devolve o erro da validação sem gravar", async () => {
    expect(await salvarRegraEmpresa(form({ diaVencimento: "31" }))).toEqual({ ok: false, erro: "Dia de vencimento deve ser entre 1 e 28." });
    expect(dbMock.regraEmpresa.create).not.toHaveBeenCalled();
  });

  it("empresa ausente é recusada", async () => {
    expect(await salvarRegraEmpresa(form({ empresaParceiraId: "" }))).toEqual({ ok: false, erro: "Empresa inválida." });
    expect(dbMock.regraEmpresa.create).not.toHaveBeenCalled();
  });

  it("regra nova que se sobrepõe a outra da mesma empresa é recusada", async () => {
    const r = await salvarRegraEmpresa(form({ vigenteDe: "2026-09-01" }));
    expect(r).toEqual({ ok: false, erro: "Vigência se sobrepõe a outra regra desta empresa." });
    expect(dbMock.regraEmpresa.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { empresaParceiraId: 7 } }));
    expect(dbMock.regraEmpresa.create).not.toHaveBeenCalled();
  });

  it("vigência encostada na anterior é aceita, gravada e auditada", async () => {
    const r = await salvarRegraEmpresa(form({ cobrancaViaBfx: "on" }));
    expect(r).toEqual({ ok: true });
    expect(dbMock.regraEmpresa.create).toHaveBeenCalledWith({
      data: {
        empresaParceiraId: 7,
        vigenteDe: d("2026-10-01"),
        vigenteAte: null,
        diaCorte: 20,
        diaVencimento: 15,
        diaPix: 15,
        repassePct: null,
        repasseBase: null,
        cobrancaViaBfx: true,
        criadaPor: "andre",
      },
    });
    expect(auditMock.createAuditLog).toHaveBeenCalledWith(
      "empresa:regra",
      expect.objectContaining({ empresaParceiraId: 7, vigenteDe: "2026-10-01", cobrancaViaBfx: true })
    );
    expect(cacheMock.revalidatePath).toHaveBeenCalledWith("/cadastros");
  });

  it("atualização ignora a própria regra na checagem de sobreposição", async () => {
    const r = await salvarRegraEmpresa(form({ id: "1", vigenteDe: "2026-01-01", vigenteAte: "2026-11-01" }));
    expect(r).toEqual({ ok: true });
    expect(dbMock.regraEmpresa.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1 } }));
    expect(dbMock.regraEmpresa.create).not.toHaveBeenCalled();
  });

  it("atualização de regra de outra empresa é recusada", async () => {
    dbMock.regraEmpresa.findUnique.mockResolvedValue(existente({ empresaParceiraId: 8 }));
    const r = await salvarRegraEmpresa(form({ id: "1" }));
    expect(r).toEqual({ ok: false, erro: "Regra não encontrada." });
    expect(dbMock.regraEmpresa.update).not.toHaveBeenCalled();
  });
});

describe("excluirRegraEmpresa", () => {
  it("exige admin antes de tudo", async () => {
    guardsMock.requireAdminOrThrow.mockRejectedValue(new Error("Nao autenticado."));
    await expect(excluirRegraEmpresa(1)).rejects.toThrow("Nao autenticado.");
    expect(dbMock.regraEmpresa.delete).not.toHaveBeenCalled();
  });

  it("exclui e audita", async () => {
    expect(await excluirRegraEmpresa(1)).toEqual({ ok: true });
    expect(dbMock.regraEmpresa.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(auditMock.createAuditLog).toHaveBeenCalledWith("empresa:regra:delete", expect.objectContaining({ regraId: 1, empresaParceiraId: 7 }));
  });

  it("regra inexistente devolve erro", async () => {
    dbMock.regraEmpresa.findUnique.mockResolvedValue(null);
    expect(await excluirRegraEmpresa(9)).toEqual({ ok: false, erro: "Regra não encontrada." });
    expect(dbMock.regraEmpresa.delete).not.toHaveBeenCalled();
  });
});
