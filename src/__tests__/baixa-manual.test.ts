// Baixa manual de parcela e baixa da Prudent ao antecipar (2026-09-16).
// Ver docs/superpowers/specs/2026-09-16-baixa-de-parcelas.md.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dbMock = {
  parcelaVencimento: { findUnique: vi.fn(), updateMany: vi.fn() },
};
const guardsMock = { requireAdminOrThrow: vi.fn() };
const auditMock = { createAuditLog: vi.fn() };

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/guards", () => guardsMock);
vi.mock("@/lib/audit", () => auditMock);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { darBaixaParcela, desfazerBaixaParcela } = await import("@/app/(app)/historico/baixa-actions");

function form(campos: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  guardsMock.requireAdminOrThrow.mockResolvedValue({ id: 1, username: "andre", role: "admin", nomeExibicao: "André" });
  dbMock.parcelaVencimento.updateMany.mockResolvedValue({ count: 1 });
  dbMock.parcelaVencimento.findUnique.mockResolvedValue({ id: 5, vendaId: 7, paga: true, origemPagamento: "manual" });
});

describe("darBaixaParcela", () => {
  it("exige admin antes de tocar no banco", async () => {
    guardsMock.requireAdminOrThrow.mockRejectedValue(new Error("Acesso negado."));
    await expect(darBaixaParcela(form({ parcelaId: "5" }))).rejects.toThrow("Acesso negado.");
    expect(dbMock.parcelaVencimento.updateMany).not.toHaveBeenCalled();
  });

  it("baixa parcela aberta com a data informada, origem manual e quem deu a baixa", async () => {
    const r = await darBaixaParcela(form({ parcelaId: "5", dataPagamento: "2026-09-15" }));

    expect(r).toEqual({ success: true });
    expect(dbMock.parcelaVencimento.updateMany).toHaveBeenCalledWith({
      // `antecipacaoLoteId: null`: parcela em lote enviado à Prudent não aceita baixa manual — a
      // baixa dela é a conclusão do lote, no histórico (2026-09-17).
      where: { id: 5, paga: false, antecipacaoLoteId: null },
      data: {
        paga: true,
        dataPagamento: new Date("2026-09-15T00:00:00.000Z"),
        origemPagamento: "manual",
        asaasPaymentId: null,
        baixaPor: "André",
      },
    });
    expect(auditMock.createAuditLog).toHaveBeenCalledWith("parcela:baixa", expect.objectContaining({ parcelaId: 5, origem: "manual" }));
  });

  it("parcela ja paga ou inexistente devolve erro sem audit", async () => {
    dbMock.parcelaVencimento.updateMany.mockResolvedValue({ count: 0 });
    const r = await darBaixaParcela(form({ parcelaId: "5", dataPagamento: "2026-09-15" }));
    expect(r.success).toBe(false);
    expect(auditMock.createAuditLog).not.toHaveBeenCalled();
  });

  it("data invalida, futura ou id ausente recusa", async () => {
    expect((await darBaixaParcela(form({ parcelaId: "5", dataPagamento: "31/02/2026" }))).success).toBe(false);
    expect((await darBaixaParcela(form({ parcelaId: "5", dataPagamento: "2099-01-01" }))).success).toBe(false);
    expect((await darBaixaParcela(form({ parcelaId: "abc" }))).success).toBe(false);
    expect(dbMock.parcelaVencimento.updateMany).not.toHaveBeenCalled();
  });
});

describe("desfazerBaixaParcela", () => {
  it("desfaz baixa manual", async () => {
    const r = await desfazerBaixaParcela(form({ parcelaId: "5" }));
    expect(r).toEqual({ success: true });
    // A origem lida entra no where: se o Asaas trocou a baixa no meio, nada e desfeito sem confirmacao.
    expect(dbMock.parcelaVencimento.updateMany).toHaveBeenCalledWith({
      where: { id: 5, paga: true, origemPagamento: "manual" },
      data: { paga: false, dataPagamento: null, origemPagamento: null, asaasPaymentId: null, baixaPor: null },
    });
  });

  it("baixa automatica (Asaas ou Prudent) so desfaz com confirmacao explicita", async () => {
    for (const origem of ["asaas", "prudent"]) {
      dbMock.parcelaVencimento.updateMany.mockClear();
      dbMock.parcelaVencimento.findUnique.mockResolvedValue({ id: 5, vendaId: 7, paga: true, origemPagamento: origem });
      const sem = await desfazerBaixaParcela(form({ parcelaId: "5" }));
      expect(sem.success).toBe(false);
      expect(dbMock.parcelaVencimento.updateMany).not.toHaveBeenCalled();
      const com = await desfazerBaixaParcela(form({ parcelaId: "5", confirmar: "1" }));
      expect(com.success).toBe(true);
    }
  });
});

describe("antecipar na /prudent so abre o lote (2026-09-17)", () => {
  // Antes esta action gravava paga + origem prudent no mesmo clique. Agora o envio abre um lote
  // em andamento e a baixa e' o retorno confirmado, em `concluirLote`
  // (src/lib/lote-antecipacao-db.ts, coberto por lote-antecipacao.test.ts).
  it("o envio nao marca nada como pago", () => {
    const fonte = readFileSync(join(process.cwd(), "src/app/(app)/prudent/page.tsx"), "utf8");
    const inicio = fonte.indexOf("async function antecipar(");
    const corpo = fonte.slice(inicio, fonte.indexOf("revalidarVenda()", inicio));
    expect(corpo.includes("abrirLote(")).toBe(true);
    expect(corpo.includes('origemPagamento: "prudent"')).toBe(false);
    expect(corpo.includes("paga: true")).toBe(false);
    expect(corpo.includes("antecipada: true")).toBe(false);
  });
});
