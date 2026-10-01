// Confirmar e recusar títulos pelo RH (2026-09-30, Fase 3).
//
// A BFX registra à mão a resposta do RH ao consolidado semanal. Só parcela confirmada entra na
// fila da Prudent; recusa exige motivo e é negada para parcela que já foi à Prudent.
import { describe, it, expect, vi, beforeEach } from "vitest";

const dbMock = {
  parcelaVencimento: { findMany: vi.fn(), updateMany: vi.fn() },
};
const guardsMock = { requireAdminOrThrow: vi.fn() };
const auditMock = { createAuditLog: vi.fn() };
const cacheMock = { revalidatePath: vi.fn() };

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/guards", () => guardsMock);
vi.mock("@/lib/audit", () => auditMock);
vi.mock("next/cache", () => cacheMock);

const { confirmarParcelasRh, recusarParcelasRh } = await import("@/app/(app)/prudent/confirmacao-actions");

beforeEach(() => {
  vi.clearAllMocks();
  guardsMock.requireAdminOrThrow.mockResolvedValue({ id: 1, username: "andre", role: "admin", nomeExibicao: "André" });
  dbMock.parcelaVencimento.updateMany.mockResolvedValue({ count: 2 });
  dbMock.parcelaVencimento.findMany.mockResolvedValue([
    { id: 5, confirmacaoRh: null, antecipada: false, antecipacaoLoteId: null },
    { id: 6, confirmacaoRh: null, antecipada: false, antecipacaoLoteId: null },
  ]);
});

describe("confirmarParcelasRh", () => {
  it("exige admin antes de tocar no banco", async () => {
    guardsMock.requireAdminOrThrow.mockRejectedValue(new Error("Acesso negado."));
    await expect(confirmarParcelasRh([5])).rejects.toThrow("Acesso negado.");
    expect(dbMock.parcelaVencimento.updateMany).not.toHaveBeenCalled();
    expect(auditMock.createAuditLog).not.toHaveBeenCalled();
  });

  it("confirma só as aguardando ou recusadas, com origem rh, data e usuário", async () => {
    const r = await confirmarParcelasRh([5, 6, 6, -1, 1.5]);

    expect(r).toEqual({ ok: true, confirmadas: 2 });
    expect(dbMock.parcelaVencimento.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [5, 6] }, OR: [{ confirmacaoRh: null }, { confirmacaoRh: "recusada" }] },
      data: {
        confirmacaoRh: "confirmada",
        confirmacaoOrigem: "rh",
        confirmacaoEm: expect.any(Date),
        confirmacaoPor: "André",
        confirmacaoMotivo: null,
      },
    });
  });

  it("conta só as que o banco mudou", async () => {
    dbMock.parcelaVencimento.updateMany.mockResolvedValue({ count: 1 });
    expect(await confirmarParcelasRh([5, 6])).toEqual({ ok: true, confirmadas: 1 });
  });

  it("sem id válido não grava", async () => {
    expect(await confirmarParcelasRh([])).toEqual({ ok: false, erro: "Nenhum título selecionado." });
    expect(await confirmarParcelasRh("x" as unknown as number[])).toEqual({ ok: false, erro: "Nenhum título selecionado." });
    expect(dbMock.parcelaVencimento.updateMany).not.toHaveBeenCalled();
  });

  it("registra auditoria e revalida a tela", async () => {
    await confirmarParcelasRh([5, 6]);
    expect(auditMock.createAuditLog).toHaveBeenCalledWith("prudent:confirmacao-rh", {
      acao: "confirmar",
      ids: [5, 6],
      alteradas: 2,
    });
    expect(cacheMock.revalidatePath).toHaveBeenCalledWith("/prudent");
  });
});

describe("recusarParcelasRh", () => {
  it("exige admin antes de tocar no banco", async () => {
    guardsMock.requireAdminOrThrow.mockRejectedValue(new Error("Acesso negado."));
    await expect(recusarParcelasRh([5], "Colaborador desligado")).rejects.toThrow("Acesso negado.");
    expect(dbMock.parcelaVencimento.findMany).not.toHaveBeenCalled();
    expect(dbMock.parcelaVencimento.updateMany).not.toHaveBeenCalled();
  });

  it("motivo curto → erro, nada gravado", async () => {
    const r = await recusarParcelasRh([5], "  ok ");
    expect(r).toEqual({ ok: false, erro: "Informe o motivo da recusa (mínimo 5 caracteres)." });
    expect(dbMock.parcelaVencimento.updateMany).not.toHaveBeenCalled();
    expect(auditMock.createAuditLog).not.toHaveBeenCalled();
  });

  it("parcela em lote → erro e zero escrita", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([
      { id: 5, confirmacaoRh: null, antecipada: false, antecipacaoLoteId: null },
      { id: 6, confirmacaoRh: "confirmada", antecipada: false, antecipacaoLoteId: 9 },
    ]);
    const r = await recusarParcelasRh([5, 6], "Colaborador desligado");
    expect(r).toEqual({ ok: false, erro: "A parcela já está na Prudent; cancele o lote antes." });
    expect(dbMock.parcelaVencimento.updateMany).not.toHaveBeenCalled();
    expect(auditMock.createAuditLog).not.toHaveBeenCalled();
  });

  it("parcela já antecipada → erro e zero escrita", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([
      { id: 5, confirmacaoRh: "confirmada", antecipada: true, antecipacaoLoteId: null },
    ]);
    const r = await recusarParcelasRh([5], "Colaborador desligado");
    expect(r.ok).toBe(false);
    expect(dbMock.parcelaVencimento.updateMany).not.toHaveBeenCalled();
  });

  it("recusa com motivo, origem rh, data e usuário; o where repete a trava contra lote", async () => {
    const r = await recusarParcelasRh([5, 6], "  Colaborador desligado ");

    expect(r).toEqual({ ok: true, recusadas: 2 });
    expect(dbMock.parcelaVencimento.findMany).toHaveBeenCalledWith({
      where: { id: { in: [5, 6] } },
      select: { id: true, confirmacaoRh: true, antecipada: true, antecipacaoLoteId: true },
    });
    expect(dbMock.parcelaVencimento.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [5, 6] }, antecipada: false, antecipacaoLoteId: null },
      data: {
        confirmacaoRh: "recusada",
        confirmacaoOrigem: "rh",
        confirmacaoEm: expect.any(Date),
        confirmacaoPor: "André",
        confirmacaoMotivo: "Colaborador desligado",
      },
    });
    expect(auditMock.createAuditLog).toHaveBeenCalledWith("prudent:confirmacao-rh", {
      acao: "recusar",
      ids: [5, 6],
      motivo: "Colaborador desligado",
      alteradas: 2,
    });
    expect(cacheMock.revalidatePath).toHaveBeenCalledWith("/prudent");
  });
});
