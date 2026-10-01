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
const recMock = { registrarRecebimentoManual: vi.fn(), confirmarRecebimento: vi.fn(), estornarRecebimento: vi.fn() };
vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/guards", () => guardsMock);
vi.mock("@/lib/audit", () => auditMock);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/fechamento-db", () => libMock);
vi.mock("@/lib/fechamento-envio", () => envioMock);
vi.mock("@/lib/recebimento-fechamento-db", () => recMock);

const a = await import("@/app/(app)/fechamento/actions");

function formRecebimento(campos: Record<string, string | File> = {}) {
  const fd = new FormData();
  const base: Record<string, string | File> = { fechamentoId: "11", valor: "1.500,00", data: "2026-09-29", ...campos };
  for (const [k, v] of Object.entries(base)) fd.set(k, v);
  return fd;
}

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
    ["enviarFechamentoAction", () => a.enviarFechamentoAction(11, 1)],
    ["registrarRecebimentoManualAction", () => a.registrarRecebimentoManualAction(formRecebimento())],
    ["confirmarRecebimentoAction", () => a.confirmarRecebimentoAction(5)],
    ["estornarRecebimentoAction", () => a.estornarRecebimentoAction(5)],
  ])("%s", async (_n, chamar) => {
    guardsMock.requireAdminOrThrow.mockRejectedValue(new Error("Acesso negado."));
    await expect(chamar()).rejects.toThrow("Acesso negado.");
    for (const fn of [...Object.values(libMock), ...Object.values(recMock), envioMock.enviarFechamento, dbMock.fechamento.findUnique]) {
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

  // Revisão: erro do Prisma sem `code` (inicialização, validação) também não vaza host/consulta.
  it("erro de classe do Prisma sem code não vaza", async () => {
    class PrismaClientInitializationError extends Error {}
    libMock.reabrirFechamento.mockRejectedValue(new PrismaClientInitializationError("Can't reach database server at db.interno:5432"));
    expect(await a.reabrirFechamentoAction(11)).toEqual({ ok: false, erro: "Não foi possível gravar. Recarregue e tente de novo." });
  });

  it("id inválido é recusado sem chamar a lib", async () => {
    expect(await a.conferirFechamentoAction(0)).toEqual({ ok: false, erro: "Fechamento inválido." });
    expect(await a.gerarFechamento(-1, "2026-10")).toEqual({ ok: false, erro: "Empresa ou competência inválida." });
    expect(libMock.conferirFechamento).not.toHaveBeenCalled();
  });
});

describe("recebimentos (Fase 6)", () => {
  it("registrar valida valor e data, passa o comprovante e audita", async () => {
    recMock.registrarRecebimentoManual.mockResolvedValue({ recebimentoId: 5 });
    const pdf = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "c.pdf", { type: "application/pdf" });
    expect(await a.registrarRecebimentoManualAction(formRecebimento({ comprovante: pdf }))).toEqual({ ok: true });
    const arg = recMock.registrarRecebimentoManual.mock.calls[0][0];
    expect(arg).toMatchObject({ fechamentoId: 11, valor: 1500, data: new Date("2026-09-29T00:00:00.000Z"), usuario: "André" });
    expect(arg.comprovante).toBeInstanceOf(File);
    expect(auditMock.createAuditLog).toHaveBeenCalledWith("fechamento:recebimento-manual", expect.objectContaining({ fechamentoId: 11, recebimentoId: 5, valor: 1500 }));
  });

  it("valor inválido ou data no futuro → erro sem chamar a lib", async () => {
    expect(await a.registrarRecebimentoManualAction(formRecebimento({ valor: "abc" }))).toMatchObject({ ok: false });
    expect(await a.registrarRecebimentoManualAction(formRecebimento({ data: "2999-01-01" }))).toMatchObject({ ok: false });
    expect(await a.registrarRecebimentoManualAction(formRecebimento({ fechamentoId: "x" }))).toEqual({ ok: false, erro: "Fechamento inválido." });
    expect(recMock.registrarRecebimentoManual).not.toHaveBeenCalled();
  });

  it("confirmar e estornar passam quem fez e auditam; erro da lib vira mensagem", async () => {
    recMock.confirmarRecebimento.mockResolvedValue(undefined);
    expect(await a.confirmarRecebimentoAction(5)).toEqual({ ok: true });
    expect(recMock.confirmarRecebimento).toHaveBeenCalledWith({ recebimentoId: 5, usuario: "André" });
    expect(auditMock.createAuditLog).toHaveBeenCalledWith("fechamento:recebimento-confirmado", { recebimentoId: 5 });
    recMock.estornarRecebimento.mockRejectedValue(new Error("Recebimento do Pix do Asaas não é estornado aqui."));
    expect(await a.estornarRecebimentoAction(5)).toEqual({ ok: false, erro: "Recebimento do Pix do Asaas não é estornado aqui." });
    expect(await a.confirmarRecebimentoAction(0)).toEqual({ ok: false, erro: "Recebimento inválido." });
  });
});
