// O ciclo do lote de antecipação (2026-09-17): abrir em andamento, concluir com o retorno da
// Prudent, cancelar quando ela recusa.
// Ver docs/superpowers/specs/2026-09-17-antecipacao-em-andamento.md.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flagDaVenda, STATUS_LOTE, ORIGEM_LOTE } from "@/lib/lote-antecipacao";

const dbMock = {
  parcelaVencimento: { findMany: vi.fn(), updateMany: vi.fn() },
  anticipacaoBatch: { create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() },
  boletoPrudent: { create: vi.fn(), findMany: vi.fn() },
  venda: { update: vi.fn() },
  $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(dbMock)),
};
vi.mock("@/lib/db", () => ({ prisma: dbMock }));
const regraMock = { regrasDaEmpresa: vi.fn() };
vi.mock("@/lib/regra-empresa-db", () => regraMock);

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
  dbMock.anticipacaoBatch.findUnique.mockResolvedValue({ id: 42, empresaParceiraId: null });
  let proximoBoleto = 500;
  dbMock.boletoPrudent.create.mockImplementation(async () => ({ id: proximoBoleto++ }));
  regraMock.regrasDaEmpresa.mockResolvedValue([]);
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

    const r = await abrirLote({ vendaIds: [10, 11], periodo: null });

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
    expect(updates[0]).toEqual({
      where: { id: { in: [1, 2, 3] }, antecipacaoLoteId: null, confirmacaoRh: "confirmada", paga: false },
      data: { antecipacaoLoteId: 42 },
    });
    // Só o `data` conta: o `where` do vínculo filtra `paga: false` desde a Fase 3 (gate repetido).
    const gravado = JSON.stringify(dbMock.parcelaVencimento.updateMany.mock.calls.map((c) => c[0].data));
    expect(gravado).not.toContain("paga");
    expect(gravado).not.toContain("antecipada");
  });

  it("marca a venda como em andamento (flag 2)", async () => {
    dbMock.parcelaVencimento.findMany
      // elegíveis, e depois a releitura para recalcular o flag (já ligadas ao lote)
      .mockResolvedValueOnce([parcela(1, 10), parcela(2, 10)])
      .mockResolvedValueOnce([parcela(1, 10, { antecipacaoLoteId: 42 }), parcela(2, 10, { antecipacaoLoteId: 42 })]);
    await abrirLote({ vendaIds: [10], periodo: null });
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
    expect(await abrirLote({ vendaIds: [10], periodo: null })).toBeNull();
    expect(dbMock.anticipacaoBatch.create).not.toHaveBeenCalled();
  });

  it("só pega parcela ainda livre: nem antecipada, nem já num lote", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([parcela(1, 10)]);
    await abrirLote({ vendaIds: [10], periodo: null });
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
      parcela(1, 10, { antecipacaoLoteId: 42, dataVencimento: new Date("2026-10-10T00:00:00.000Z") }),
      parcela(2, 10, { antecipacaoLoteId: 42, dataVencimento: new Date("2026-11-10T00:00:00.000Z") }),
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

  // Fase 3 (2026-09-30): o retorno registra quanto a Prudent aprovou e quanto caiu na conta.
  it("grava aprovado, depositado e data do depósito no mesmo fechamento do lote", async () => {
    await concluirLote({
      loteId: 42,
      dataRetorno: "2026-09-20",
      usuario: "andre",
      valorAprovado: 1234.567,
      valorDepositado: 1200.5,
      dataDeposito: "2026-09-21",
    });
    expect(dbMock.anticipacaoBatch.updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: 42, status: STATUS_LOTE.emAndamento },
      data: {
        status: STATUS_LOTE.concluido,
        valorAprovado: 1234.57,
        valorDepositado: 1200.5,
        dataDeposito: new Date("2026-09-21T00:00:00.000Z"),
      },
    });
  });

  it("sem data do depósito, vale a data do retorno; sem valores, continua funcionando", async () => {
    await concluirLote({ loteId: 42, dataRetorno: "2026-09-20", usuario: "andre" });
    const data = dbMock.anticipacaoBatch.updateMany.mock.calls[0][0].data;
    expect(data.dataDeposito).toEqual(new Date("2026-09-20T00:00:00.000Z"));
    expect(data.valorAprovado).toBeNull();
    expect(data.valorDepositado).toBeNull();
  });

  it("valor negativo ou não numérico é recusado, sem gravar nada", async () => {
    await expect(
      concluirLote({ loteId: 42, dataRetorno: "2026-09-20", usuario: "andre", valorDepositado: -1 })
    ).rejects.toThrow(/valor/i);
    await expect(
      concluirLote({ loteId: 42, dataRetorno: "2026-09-20", usuario: "andre", valorAprovado: Number.NaN })
    ).rejects.toThrow(/valor/i);
    expect(dbMock.anticipacaoBatch.updateMany).not.toHaveBeenCalled();
  });

  it("data do depósito ilegível é recusada", async () => {
    await expect(
      concluirLote({ loteId: 42, dataRetorno: "2026-09-20", usuario: "andre", dataDeposito: "21/09/2026" })
    ).rejects.toThrow(/data/i);
    expect(dbMock.anticipacaoBatch.updateMany).not.toHaveBeenCalled();
  });
});

// Fase 4 (2026-09-30, spec §3.4): a conclusão cria os boletos Prudent esperados, um por
// vencimento, na mesma transação.
describe("concluirLote — boletos Prudent esperados", () => {
  const venc = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
  const regraBfx = (de: string, ate: string | null) => ({
    vigenteDe: venc(de),
    vigenteAte: ate ? venc(ate) : null,
    diaCorte: 20,
    diaVencimento: 10,
    diaPix: 15,
    repassePct: null,
    repasseBase: null,
    cobrancaViaBfx: true,
  });

  beforeEach(() => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([
      parcela(1, 10, { antecipacaoLoteId: 42, valorParcela: 100.1, dataVencimento: venc("2026-10-10") }),
      parcela(2, 11, { antecipacaoLoteId: 42, valorParcela: 200.2, dataVencimento: venc("2026-10-10") }),
      parcela(3, 10, { antecipacaoLoteId: 42, valorParcela: 300, dataVencimento: venc("2026-11-10") }),
    ]);
  });

  it("3 parcelas em 2 datas → 2 boletos aguardando documento, com as somas em centavos", async () => {
    await concluirLote({ loteId: 42, dataRetorno: "2026-09-20", usuario: "andre" });
    const criados = dbMock.boletoPrudent.create.mock.calls.map((c) => c[0].data);
    expect(criados).toEqual([
      expect.objectContaining({
        loteId: 42,
        empresaParceiraId: null,
        vencimento: venc("2026-10-10"),
        valorEsperado: 300.3,
        status: "aguardando_documento",
        direcionamento: "empresa",
      }),
      expect.objectContaining({ loteId: 42, vencimento: venc("2026-11-10"), valorEsperado: 300 }),
    ]);
    // cada boleto liga as suas parcelas, e só as que ainda não têm boleto
    const ligacoes = dbMock.parcelaVencimento.updateMany.mock.calls
      .map((c) => c[0])
      .filter((a) => "boletoPrudentId" in (a.data ?? {}));
    expect(ligacoes).toEqual([
      { where: { id: { in: [1, 2] }, boletoPrudentId: null }, data: { boletoPrudentId: 500 } },
      { where: { id: { in: [3] }, boletoPrudentId: null }, data: { boletoPrudentId: 501 } },
    ]);
  });

  it("os boletos nascem depois de marcar antecipada e paga, na mesma transação", async () => {
    await concluirLote({ loteId: 42, dataRetorno: "2026-09-20", usuario: "andre" });
    const ordemPaga = dbMock.parcelaVencimento.updateMany.mock.invocationCallOrder[1];
    expect(dbMock.boletoPrudent.create.mock.invocationCallOrder[0]).toBeGreaterThan(ordemPaga);
    expect(dbMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it("empresa com cobrança via BFX vigente no vencimento → direcionamento bfx", async () => {
    dbMock.anticipacaoBatch.findUnique.mockResolvedValue({ id: 42, empresaParceiraId: 7 });
    // a regra só vale a partir de novembro: outubro fica com a empresa
    regraMock.regrasDaEmpresa.mockResolvedValue([regraBfx("2026-11-01", null)]);
    await concluirLote({ loteId: 42, dataRetorno: "2026-09-20", usuario: "andre" });
    expect(regraMock.regrasDaEmpresa).toHaveBeenCalledWith(7);
    const criados = dbMock.boletoPrudent.create.mock.calls.map((c) => c[0].data);
    expect(criados.map((b) => [b.empresaParceiraId, b.direcionamento])).toEqual([
      [7, "empresa"],
      [7, "bfx"],
    ]);
  });

  it("lote sem empresa parceira → direcionamento empresa, sem consultar regras", async () => {
    dbMock.anticipacaoBatch.findUnique.mockResolvedValue({ id: 42, empresaParceiraId: null });
    await concluirLote({ loteId: 42, dataRetorno: "2026-09-20", usuario: "andre" });
    expect(regraMock.regrasDaEmpresa).not.toHaveBeenCalled();
    expect(dbMock.boletoPrudent.create.mock.calls.every((c) => c[0].data.direcionamento === "empresa")).toBe(true);
  });

  it("parcela que ganhou boleto no meio do caminho aborta a conclusão", async () => {
    dbMock.parcelaVencimento.updateMany.mockImplementation(async (args: { data?: Record<string, unknown> }) => ({
      count: args?.data && "boletoPrudentId" in args.data ? 0 : 1,
    }));
    await expect(concluirLote({ loteId: 42, dataRetorno: "2026-09-20", usuario: "andre" })).rejects.toThrow(/boleto/i);
  });

  it("cancelar e registrar lote já concluído não criam boleto", async () => {
    await cancelarLote({ loteId: 42 });
    dbMock.parcelaVencimento.findMany.mockResolvedValue([parcela(1, 10, { dataVencimento: venc("2026-10-10") })]);
    await registrarLoteConcluido({ vendaIds: [10], periodo: null, dataRetorno: "2026-09-20", usuario: "andre" });
    expect(dbMock.boletoPrudent.create).not.toHaveBeenCalled();
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
