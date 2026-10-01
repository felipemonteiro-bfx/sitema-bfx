// Actions do /fechamento (Fase 5): guarda de admin antes de tudo, erro das libs vira mensagem e
// erro do Prisma não vaza detalhe.
import { describe, it, expect, vi, beforeEach } from "vitest";

const dbMock = {
  fechamento: { findUnique: vi.fn() },
  fechamentoAjuste: { findUnique: vi.fn() },
};
const guardsMock = { requireAdminOrThrow: vi.fn() };
const auditMock = { createAuditLog: vi.fn() };
const libMock = {
  gerarOuAtualizarFechamento: vi.fn(),
  adicionarAjuste: vi.fn(),
  removerAjuste: vi.fn(),
  conferirFechamento: vi.fn(),
  reabrirFechamento: vi.fn(),
};
const envioMock = { enviarFechamento: vi.fn() };
vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/guards", () => guardsMock);
vi.mock("@/lib/audit", () => auditMock);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/fechamento-db", () => libMock);
vi.mock("@/lib/fechamento-envio", () => envioMock);

const a = await import("@/app/(app)/fechamento/actions");

beforeEach(() => {
  vi.clearAllMocks();
  guardsMock.requireAdminOrThrow.mockResolvedValue({ id: 1, username: "andre", role: "admin", nomeExibicao: "André" });
  dbMock.fechamento.findUnique.mockResolvedValue({ empresaParceiraId: 7, competencia: "2026-10" });
  libMock.gerarOuAtualizarFechamento.mockResolvedValue({ fechamentoId: 11, reservadas: 2, liberadas: 0, bloqueadas: [] });
});

describe("guarda de admin", () => {
  it.each([
    ["gerarFechamento", () => a.gerarFechamento(7, "2026-10")],
    ["atualizarParcelas", () => a.atualizarParcelas(11)],
    ["adicionarAjusteFechamento", () => a.adicionarAjusteFechamento(11, "10", "Diferença de mês")],
    ["removerAjusteFechamento", () => a.removerAjusteFechamento(3)],
    ["conferirFechamentoAction", () => a.conferirFechamentoAction(11)],
    ["reabrirFechamentoAction", () => a.reabrirFechamentoAction(11)],
    ["enviarFechamentoAction", () => a.enviarFechamentoAction(11)],
  ])("%s", async (_n, chamar) => {
    guardsMock.requireAdminOrThrow.mockRejectedValue(new Error("Acesso negado."));
    await expect(chamar()).rejects.toThrow("Acesso negado.");
    for (const fn of [...Object.values(libMock), envioMock.enviarFechamento, dbMock.fechamento.findUnique]) {
      expect(fn).not.toHaveBeenCalled();
    }
  });
});

describe("resultado", () => {
  it("gerar devolve o id, audita e grava quem gerou", async () => {
    expect(await a.gerarFechamento(7, "2026-10")).toEqual({ ok: true, fechamentoId: 11 });
    expect(libMock.gerarOuAtualizarFechamento).toHaveBeenCalledWith({ empresaParceiraId: 7, competencia: "2026-10", usuario: "André" });
    expect(auditMock.createAuditLog).toHaveBeenCalledWith("fechamento:gerar", expect.objectContaining({ fechamentoId: 11 }));
  });

  it("erro da lib vira mensagem; erro do Prisma não vaza", async () => {
    libMock.conferirFechamento.mockRejectedValue(new Error("O valor final do demonstrativo precisa ser maior que zero."));
    expect(await a.conferirFechamentoAction(11)).toEqual({ ok: false, erro: "O valor final do demonstrativo precisa ser maior que zero." });
    libMock.gerarOuAtualizarFechamento.mockRejectedValue(Object.assign(new Error("Unique constraint failed on fechamentos_x"), { code: "P2002" }));
    expect(await a.gerarFechamento(7, "2026-10")).toEqual({ ok: false, erro: "Outra operação está gerando este fechamento. Recarregue." });
    libMock.reabrirFechamento.mockRejectedValue(Object.assign(new Error("connection reset at 10.0.0.1"), { code: "P1001" }));
    const r = await a.reabrirFechamentoAction(11);
    expect(r).toEqual({ ok: false, erro: "Não foi possível gravar. Recarregue e tente de novo." });
    expect(auditMock.createAuditLog).not.toHaveBeenCalled();
  });

  it("id inválido é recusado sem chamar a lib", async () => {
    expect(await a.conferirFechamentoAction(0)).toEqual({ ok: false, erro: "Fechamento inválido." });
    expect(await a.gerarFechamento(-1, "2026-10")).toEqual({ ok: false, erro: "Empresa ou competência inválida." });
    expect(libMock.conferirFechamento).not.toHaveBeenCalled();
  });
});
