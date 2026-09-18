// O ciclo do lote de antecipação (2026-09-17): abrir em andamento, concluir com o retorno da
// Prudent, cancelar quando ela recusa.
// Ver docs/superpowers/specs/2026-09-17-antecipacao-em-andamento.md.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flagDaVenda, STATUS_LOTE, ORIGEM_LOTE } from "@/lib/lote-antecipacao";

const dbMock = {
  parcelaVencimento: { findMany: vi.fn(), updateMany: vi.fn() },
  anticipacaoBatch: { create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() },
  venda: { update: vi.fn() },
  $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(dbMock)),
};
vi.mock("@/lib/db", () => ({ prisma: dbMock }));

const { abrirLote, concluirLote, cancelarLote, registrarLoteConcluido } = await import("@/lib/lote-antecipacao-db");

const parcela = (id: number, vendaId: number, extra: Record<string, unknown> = {}) => ({
  id,
  vendaId,
  valorParcela: 300,
  paga: false,
  antecipada: false,
  antecipacaoLoteId: null,
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.anticipacaoBatch.create.mockResolvedValue({ id: 42 });
  // O padrão é "gravou tudo que pediu": cada teste que precisa de disputa sobrescreve.
  dbMock.parcelaVencimento.updateMany.mockImplementation(async (args: { where?: { id?: { in?: number[] } } }) => ({
    count: args?.where?.id?.in?.length ?? 1,
  }));
  dbMock.anticipacaoBatch.updateMany.mockResolvedValue({ count: 1 });
});

describe("flagDaVenda", () => {
  it("todas antecipadas → 1; algumas → 3; nenhuma mas com lote aberto → 2; nada → 0", () => {
    const p = (antecipada: boolean, emAndamento = false) => ({ antecipada, emAndamento });
    expect(flagDaVenda([p(true), p(true)])).toBe(1);
    expect(flagDaVenda([p(true), p(false)])).toBe(3);
    expect(flagDaVenda([p(true), p(false, true)])).toBe(3);
    expect(flagDaVenda([p(false, true), p(false, true)])).toBe(2);
    expect(flagDaVenda([p(false, true), p(false)])).toBe(2);
    expect(flagDaVenda([p(false), p(false)])).toBe(0);
    expect(flagDaVenda([])).toBe(0);
  });
});

describe("abrirLote — o envio à Prudent", () => {
  it("cria o lote em andamento, liga as parcelas e não marca nada como pago", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([parcela(1, 10), parcela(2, 10), parcela(3, 11)]);

    const r = await abrirLote({ vendaIds: [10, 11], periodo: null, hoje: "2026-09-17" });

    expect(r).toMatchObject({ loteId: 42, parcelas: 3, valor: 900 });
    expect(dbMock.anticipacaoBatch.create.mock.calls[0][0].data).toMatchObject({
      status: STATUS_LOTE.emAndamento,
      origem: ORIGEM_LOTE.envio,
      quantidadeVendas: 2,
      valorTotal: 900,
    });
    const updates = dbMock.parcelaVencimento.updateMany.mock.calls.map((c) => c[0]);
    expect(updates).toHaveLength(1);
    // O `antecipacaoLoteId: null` no where é a trava contra dois envios simultâneos.
    expect(updates[0]).toEqual({ where: { id: { in: [1, 2, 3] }, antecipacaoLoteId: null }, data: { antecipacaoLoteId: 42 } });
    const gravado = JSON.stringify(dbMock.parcelaVencimento.updateMany.mock.calls);
    expect(gravado).not.toContain("paga");
    expect(gravado).not.toContain("antecipada");
  });

  it("marca a venda como em andamento (flag 2)", async () => {
    dbMock.parcelaVencimento.findMany
      // elegíveis, e depois a releitura para recalcular o flag (já ligadas ao lote)
      .mockResolvedValueOnce([parcela(1, 10), parcela(2, 10)])
      .mockResolvedValueOnce([parcela(1, 10, { antecipacaoLoteId: 42 }), parcela(2, 10, { antecipacaoLoteId: 42 })]);
    await abrirLote({ vendaIds: [10], periodo: null, hoje: "2026-09-17" });
    expect(dbMock.venda.update.mock.calls[0][0]).toMatchObject({ where: { id: 10 }, data: { antecipada: 2 } });
  });

  it("liga só parcela que continua livre, e aborta se alguém levou alguma no meio", async () => {
    // Dois envios ao mesmo tempo: sem o filtro no update, o segundo lote roubaria as parcelas do
    // primeiro e o primeiro ficaria sem nenhuma.
    dbMock.parcelaVencimento.findMany.mockResolvedValue([parcela(1, 10), parcela(2, 10)]);
    dbMock.parcelaVencimento.updateMany.mockResolvedValue({ count: 1 });

    await expect(abrirLote({ vendaIds: [10], periodo: null })).rejects.toThrow(/outro lote|de novo/i);
    expect(dbMock.parcelaVencimento.updateMany.mock.calls[0][0].where).toMatchObject({ antecipacaoLoteId: null });
  });

  it("sem parcela elegível, não cria lote nenhum", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([]);
    expect(await abrirLote({ vendaIds: [10], periodo: null, hoje: "2026-09-17" })).toBeNull();
    expect(dbMock.anticipacaoBatch.create).not.toHaveBeenCalled();
  });

  it("só pega parcela ainda livre: nem antecipada, nem já num lote", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([parcela(1, 10)]);
    await abrirLote({ vendaIds: [10], periodo: null, hoje: "2026-09-17" });
    expect(dbMock.parcelaVencimento.findMany.mock.calls[0][0].where).toMatchObject({
      antecipada: false,
      antecipacaoLoteId: null,
    });
  });
});

describe("concluirLote — o retorno chegou", () => {
  beforeEach(() => {
    dbMock.anticipacaoBatch.updateMany.mockResolvedValue({ count: 1 });
    dbMock.parcelaVencimento.findMany.mockResolvedValue([
      parcela(1, 10, { antecipacaoLoteId: 42 }),
      parcela(2, 10, { antecipacaoLoteId: 42 }),
    ]);
  });

  it("marca as parcelas como antecipadas e quitadas pela Prudent na data do retorno", async () => {
    await concluirLote({ loteId: 42, dataRetorno: "2026-09-20", usuario: "andre" });

    const updates = dbMock.parcelaVencimento.updateMany.mock.calls.map((c) => c[0]);
    expect(updates[0]).toMatchObject({ where: { antecipacaoLoteId: 42 }, data: { antecipada: true } });
    expect(updates[1]).toMatchObject({
      where: { antecipacaoLoteId: 42, paga: false },
      data: { paga: true, origemPagamento: "prudent", dataPagamento: new Date("2026-09-20T00:00:00.000Z") },
    });
  });

  it("fecha o lote com quem confirmou e quando", async () => {
    await concluirLote({ loteId: 42, dataRetorno: "2026-09-20", usuario: "andre" });
    // updateMany com o status no `where`: dois cliques ao mesmo tempo não fecham o lote duas vezes.
    expect(dbMock.anticipacaoBatch.updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: 42, status: STATUS_LOTE.emAndamento },
      data: { status: STATUS_LOTE.concluido, concluidaPor: "andre" },
    });
  });

  it("lote que não está em andamento é recusado, sem gravar nada", async () => {
    dbMock.anticipacaoBatch.updateMany.mockResolvedValue({ count: 0 });
    await expect(concluirLote({ loteId: 42, dataRetorno: "2026-09-20", usuario: "andre" })).rejects.toThrow(/andamento/i);
    expect(dbMock.parcelaVencimento.updateMany).not.toHaveBeenCalled();
  });

  it("lote sem nenhuma parcela ligada é recusado: concluir gravaria zero e diria que deu certo", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([]);
    await expect(concluirLote({ loteId: 42, dataRetorno: "2026-09-20", usuario: "andre" })).rejects.toThrow(/parcela/i);
  });

  it("data inválida é recusada", async () => {
    await expect(concluirLote({ loteId: 42, dataRetorno: "20/09/2026", usuario: "andre" })).rejects.toThrow(/data/i);
    expect(dbMock.parcelaVencimento.updateMany).not.toHaveBeenCalled();
  });
});

describe("cancelarLote — a Prudent recusou", () => {
  it("desliga as parcelas do lote e devolve a venda para a fila", async () => {
    dbMock.anticipacaoBatch.updateMany.mockResolvedValue({ count: 1 });
    dbMock.parcelaVencimento.findMany
      .mockResolvedValueOnce([parcela(1, 10, { antecipacaoLoteId: 42 })])
      .mockResolvedValueOnce([parcela(1, 10), parcela(2, 10)]);

    await cancelarLote({ loteId: 42 });

    expect(dbMock.parcelaVencimento.updateMany.mock.calls[0][0]).toEqual({
      where: { antecipacaoLoteId: 42 },
      data: { antecipacaoLoteId: null },
    });
    expect(dbMock.anticipacaoBatch.updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: 42, status: STATUS_LOTE.emAndamento },
      data: { status: STATUS_LOTE.cancelado },
    });
    expect(dbMock.venda.update.mock.calls[0][0]).toMatchObject({ where: { id: 10 }, data: { antecipada: 0 } });
  });
});

describe("registrarLoteConcluido — antecipação feita antes do sistema saber", () => {
  it("cria o lote já concluído, com origem registro, e marca as parcelas", async () => {
    dbMock.parcelaVencimento.findMany
      .mockResolvedValueOnce([parcela(1, 10), parcela(2, 10)])
      .mockResolvedValueOnce([
        parcela(1, 10, { antecipada: true, antecipacaoLoteId: 42 }),
        parcela(2, 10, { antecipada: true, antecipacaoLoteId: 42 }),
      ]);

    const r = await registrarLoteConcluido({ vendaIds: [10], periodo: null, dataRetorno: "2026-09-01", usuario: "andre" });

    expect(r).toMatchObject({ loteId: 42, parcelas: 2 });
    expect(dbMock.anticipacaoBatch.create.mock.calls[0][0].data).toMatchObject({
      status: STATUS_LOTE.concluido,
      origem: ORIGEM_LOTE.registro,
      concluidaPor: "andre",
    });
    const updates = dbMock.parcelaVencimento.updateMany.mock.calls.map((c) => c[0]);
    expect(updates.some((u) => u.data.antecipada === true)).toBe(true);
    expect(updates.some((u) => u.data.origemPagamento === "prudent")).toBe(true);
    expect(dbMock.venda.update.mock.calls[0][0]).toMatchObject({ data: { antecipada: 1 } });
  });
});
