// Lote por parcela e gate de confirmação do RH (2026-09-30, Fase 3).
//
// Só parcela confirmada pelo RH entra num lote enviado à Prudent; a fila deixa desmarcar parcelas
// de uma venda (3 de 4); o lote guarda empresa, taxa, líquido solicitado e depósito previsto.
// `registrarLoteConcluido` (antecipação feita fora do sistema) não passa pelo gate.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TAXA_MENSAL_PADRAO, calcularAntecipacao, titulosDeVenda } from "@/lib/antecipacao";

const dbMock = {
  parcelaVencimento: { findMany: vi.fn(), updateMany: vi.fn() },
  anticipacaoBatch: { create: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() },
  // a conclusão cria os boletos Prudent esperados (Fase 4)
  boletoPrudent: { create: vi.fn(async () => ({ id: 900 })) },
  venda: { update: vi.fn(), findMany: vi.fn() },
  $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(dbMock)),
};
vi.mock("@/lib/db", () => ({ prisma: dbMock }));
const guardsMock = { requireAdmin: vi.fn(async () => true), requireAdminOrThrow: vi.fn(async () => ({ id: 1, username: "andre" })) };
vi.mock("@/lib/guards", () => guardsMock);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { abrirLote, registrarLoteConcluido, resolverParcelasDoLote } = await import("@/lib/lote-antecipacao-db");

const parcela = (id: number, vendaId: number, venc: string, valor = 300) => ({
  id,
  vendaId,
  valorParcela: valor,
  dataVencimento: new Date(`${venc}T00:00:00.000Z`),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  // 30/09/2026 meio-dia em Manaus.
  vi.setSystemTime(new Date("2026-09-30T16:00:00.000Z"));
  dbMock.anticipacaoBatch.create.mockResolvedValue({ id: 42 });
  dbMock.parcelaVencimento.updateMany.mockImplementation(async (args: { where?: { id?: { in?: number[] } } }) => ({
    count: args?.where?.id?.in?.length ?? 1,
  }));
  dbMock.venda.findMany.mockResolvedValue([
    { id: 10, dataVenda: new Date("2026-09-05T00:00:00.000Z"), cliente: { empresa: "AMAZON FIVE", empresaParceiraId: 3 } },
  ]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("resolverParcelasDoLote", () => {
  it("exige confirmação do RH e aplica a exclusão no where", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([]);
    await resolverParcelasDoLote(dbMock as never, { vendaIds: [10], periodo: null, excluirParcelaIds: [4] });
    const where = dbMock.parcelaVencimento.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({
      vendaId: { in: [10] },
      antecipada: false,
      antecipacaoLoteId: null,
      confirmacaoRh: "confirmada",
      id: { notIn: [4] },
    });
  });

  // Revisão (2026-09-30): o card (`titulosDeVenda`) já descartava parcela paga; o lote e o CSV
  // não — parcela quitada por boleto ia à Prudent sem aparecer no total da tela.
  it("parcela já paga não entra no envio, como no card", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([]);
    await resolverParcelasDoLote(dbMock as never, { vendaIds: [10], periodo: null, excluirParcelaIds: [] });
    expect(dbMock.parcelaVencimento.findMany.mock.calls[0][0].where).toMatchObject({ paga: false });
  });

  it("sem exclusão não põe filtro de id", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([]);
    await resolverParcelasDoLote(dbMock as never, { vendaIds: [10], periodo: null, excluirParcelaIds: [] });
    expect(dbMock.parcelaVencimento.findMany.mock.calls[0][0].where).not.toHaveProperty("id");
  });
});

describe("abrirLote", () => {
  it("parcela aguardando RH não entra: o where pede confirmada", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([parcela(1, 10, "2026-10-10")]);
    await abrirLote({ vendaIds: [10], periodo: null });
    expect(dbMock.parcelaVencimento.findMany.mock.calls[0][0].where).toMatchObject({ confirmacaoRh: "confirmada" });
  });

  it("a exclusão chega ao where", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([parcela(1, 10, "2026-10-10")]);
    await abrirLote({ vendaIds: [10], periodo: null, excluirParcelaIds: [4, 5] });
    expect(dbMock.parcelaVencimento.findMany.mock.calls[0][0].where).toMatchObject({ id: { notIn: [4, 5] } });
  });

  it("todas as parcelas excluídas → null e nenhum lote", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([]);
    expect(await abrirLote({ vendaIds: [10], periodo: null, excluirParcelaIds: [1, 2, 3, 4] })).toBeNull();
    expect(dbMock.anticipacaoBatch.create).not.toHaveBeenCalled();
  });

  it("grava empresa, taxa, líquido solicitado e depósito previsto (hoje + 2)", async () => {
    const escolhidas = [parcela(1, 10, "2026-10-10"), parcela(2, 10, "2026-11-10"), parcela(3, 10, "2026-12-10")];
    dbMock.parcelaVencimento.findMany.mockResolvedValue(escolhidas);

    await abrirLote({ vendaIds: [10], periodo: null, excluirParcelaIds: [4] });

    const esperado = calcularAntecipacao(
      titulosDeVenda({
        dataVenda: new Date("2026-09-05T00:00:00.000Z"),
        valorVenda: null,
        parcelas: null,
        parcelas_detalhes: escolhidas,
      })
    ).valorLiquido;
    const data = dbMock.anticipacaoBatch.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      empresaParceiraId: 3,
      taxaMensal: TAXA_MENSAL_PADRAO,
      valorLiquidoSolicitado: Math.round(esperado * 100) / 100,
      dataDepositoPrevista: new Date("2026-10-02T00:00:00.000Z"),
      valorTotal: 900,
    });
    expect(data.valorLiquidoSolicitado).toBeLessThan(900);
  });

  it("empresa parceira sai só das vendas que têm parcela no lote", async () => {
    dbMock.venda.findMany.mockResolvedValue([
      { id: 9, dataVenda: new Date("2026-09-05T00:00:00.000Z"), cliente: { empresa: "A", empresaParceiraId: 7 } },
      { id: 10, dataVenda: new Date("2026-09-05T00:00:00.000Z"), cliente: { empresa: "A", empresaParceiraId: 3 } },
    ]);
    dbMock.parcelaVencimento.findMany.mockResolvedValue([parcela(1, 10, "2026-10-10")]);
    await abrirLote({ vendaIds: [9, 10], periodo: null });
    expect(dbMock.anticipacaoBatch.create.mock.calls[0][0].data.empresaParceiraId).toBe(3);
  });

  // Revisão: entre a leitura e o vínculo, uma recusa do RH não pode deixar a parcela entrar.
  it("o vínculo ao lote repete o gate no where", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([parcela(1, 10, "2026-10-10")]);
    await abrirLote({ vendaIds: [10], periodo: null });
    expect(dbMock.parcelaVencimento.updateMany.mock.calls[0][0].where).toEqual({
      id: { in: [1] },
      antecipacaoLoteId: null,
      fechamentoId: null, // Fase 5: reservada num fechamento fica fora do lote
      confirmacaoRh: "confirmada",
      paga: false,
    });
  });

  it("cliente sem empresa parceira → empresaParceiraId nulo", async () => {
    dbMock.venda.findMany.mockResolvedValue([
      { id: 10, dataVenda: new Date("2026-09-05T00:00:00.000Z"), cliente: { empresa: "X", empresaParceiraId: null } },
    ]);
    dbMock.parcelaVencimento.findMany.mockResolvedValue([parcela(1, 10, "2026-10-10")]);
    await abrirLote({ vendaIds: [10], periodo: null });
    expect(dbMock.anticipacaoBatch.create.mock.calls[0][0].data.empresaParceiraId).toBeNull();
  });
});

describe("registrarLoteConcluido", () => {
  it("não exige confirmação do RH — a antecipação já aconteceu fora do sistema", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([parcela(1, 10, "2026-10-10")]);
    await registrarLoteConcluido({ vendaIds: [10], periodo: null, dataRetorno: "2026-09-01", usuario: "andre" });
    expect(dbMock.parcelaVencimento.findMany.mock.calls[0][0].where).not.toHaveProperty("confirmacaoRh");
  });

  it("respeita as parcelas desmarcadas na fila", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([parcela(1, 10, "2026-10-10")]);
    await registrarLoteConcluido({
      vendaIds: [10],
      periodo: null,
      dataRetorno: "2026-09-01",
      usuario: "andre",
      excluirParcelaIds: [2, 3],
    });
    expect(dbMock.parcelaVencimento.findMany.mock.calls[0][0].where).toMatchObject({ id: { notIn: [2, 3] } });
  });

  it("a action repassa a exclusão", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([parcela(1, 10, "2026-10-10")]);
    const { registrarAntecipacaoConcluidaAction } = await import("@/app/(app)/prudent/actions");
    await registrarAntecipacaoConcluidaAction({ ids: [10], dataRetorno: "2026-09-01", excluirParcelaIds: [4] });
    expect(dbMock.parcelaVencimento.findMany.mock.calls[0][0].where).toMatchObject({ id: { notIn: [4] } });
  });
});

describe("titulosDeVenda", () => {
  const venda = (extra: Record<string, unknown>) => ({
    dataVenda: "2026-09-05",
    valorVenda: 600,
    parcelas: 2,
    parcelas_detalhes: [
      { dataVencimento: "2026-10-10T00:00:00.000Z", valorParcela: 300 },
      { dataVencimento: "2026-11-10T00:00:00.000Z", valorParcela: 300, ...extra },
    ],
  });

  it("ignora parcela bloqueada pelo RH", () => {
    expect(titulosDeVenda(venda({ bloqueadaRh: true }))).toHaveLength(1);
  });

  it("ignora parcela desmarcada na fila", () => {
    expect(titulosDeVenda(venda({ excluida: true }))).toHaveLength(1);
  });

  it("todas bloqueadas → nenhum título, sem cair na estimativa de venda legada", () => {
    const v = venda({ bloqueadaRh: true });
    v.parcelas_detalhes[0] = { ...v.parcelas_detalhes[0], bloqueadaRh: true } as (typeof v.parcelas_detalhes)[number];
    expect(titulosDeVenda(v)).toEqual([]);
  });
});

describe("CSV da Prudent e lote gravado têm as mesmas parcelas", () => {
  it("o CSV resolve as parcelas pela mesma função, com o gate e a exclusão", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([parcela(1, 10, "2026-10-10"), parcela(2, 10, "2026-11-10")]);
    dbMock.venda.findMany.mockResolvedValue([]);
    const { GET } = await import("@/app/api/relatorios/antecipacao/route");
    await GET(new Request("http://localhost/api/relatorios/antecipacao?ids=10&excluir=3,4,x") as never);
    const whereCsv = dbMock.parcelaVencimento.findMany.mock.calls[0][0].where;
    // A consulta das vendas do CSV só traz as parcelas resolvidas.
    const consultaVendas = dbMock.venda.findMany.mock.calls[0][0];
    expect(consultaVendas.include.parcelasVencimento.where).toEqual({ id: { in: [1, 2] } });

    vi.clearAllMocks();
    dbMock.anticipacaoBatch.create.mockResolvedValue({ id: 42 });
    dbMock.parcelaVencimento.updateMany.mockResolvedValue({ count: 2 });
    dbMock.venda.findMany.mockResolvedValue([
      { id: 10, dataVenda: new Date("2026-09-05T00:00:00.000Z"), cliente: { empresa: "A", empresaParceiraId: 3 } },
    ]);
    dbMock.parcelaVencimento.findMany.mockResolvedValue([parcela(1, 10, "2026-10-10"), parcela(2, 10, "2026-11-10")]);
    await abrirLote({ vendaIds: [10], periodo: null, excluirParcelaIds: [3, 4] });
    const whereLote = dbMock.parcelaVencimento.findMany.mock.calls[0][0].where;

    expect(whereCsv).toEqual(whereLote);
    expect(whereCsv).toMatchObject({ confirmacaoRh: "confirmada", id: { notIn: [3, 4] } });
  });
});

describe("calcularSelecaoAction com exclusão", () => {
  const vendaDb = {
    dataVenda: new Date("2026-09-05T00:00:00.000Z"),
    valorVenda: 1200,
    quantidade: 1,
    valorFrete: 0,
    desconto: 0,
    parcelas: 4,
    itens: [],
    parcelasVencimento: [1, 2, 3, 4].map((n) => ({
      id: n,
      numeroParcela: n,
      dataVencimento: new Date(Date.UTC(2026, 8 + n, 10)),
      valorParcela: 300,
      antecipada: false,
      paga: false,
      antecipacaoLoteId: null,
      confirmacaoRh: n === 2 ? null : "confirmada",
    })),
  };

  it("soma só as confirmadas e não excluídas", async () => {
    dbMock.venda.findMany.mockResolvedValue([vendaDb]);
    const { calcularSelecaoAction } = await import("@/app/(app)/prudent/actions");
    const r = await calcularSelecaoAction({ ids: [10], excluirParcelaIds: [4] });
    expect(r.ok && r.resultado.parcelas).toBe(2);
    expect(r.ok && r.resultado.valorBruto).toBe(600);
  });

  it("parcela em lote em andamento não conta", async () => {
    dbMock.venda.findMany.mockResolvedValue([
      { ...vendaDb, parcelasVencimento: vendaDb.parcelasVencimento.map((p) => (p.id === 1 ? { ...p, antecipacaoLoteId: 9 } : p)) },
    ]);
    const { calcularSelecaoAction } = await import("@/app/(app)/prudent/actions");
    const r = await calcularSelecaoAction({ ids: [10] });
    expect(r.ok && r.resultado.parcelas).toBe(2);
  });
});

describe("concluirLoteAction com os valores", () => {
  it("valor negativo é recusado antes do banco", async () => {
    const { concluirLoteAction } = await import("@/app/(app)/prudent/actions");
    const r = await concluirLoteAction({ loteId: 42, dataRetorno: "2026-09-20", valorDepositado: -5 });
    expect(r).toEqual({ ok: false, erro: "Valor depositado inválido." });
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });

  it("repassa aprovado, depositado e data do depósito", async () => {
    dbMock.anticipacaoBatch.updateMany.mockResolvedValue({ count: 1 });
    dbMock.parcelaVencimento.findMany.mockResolvedValue([parcela(1, 10, "2026-10-10")]);
    const { concluirLoteAction } = await import("@/app/(app)/prudent/actions");
    const r = await concluirLoteAction({
      loteId: 42,
      dataRetorno: "2026-09-20",
      valorAprovado: 280,
      valorDepositado: 279.9,
      dataDeposito: "2026-09-22",
    });
    expect(r.ok).toBe(true);
    expect(dbMock.anticipacaoBatch.updateMany.mock.calls[0][0].data).toMatchObject({
      valorAprovado: 280,
      valorDepositado: 279.9,
      dataDeposito: new Date("2026-09-22T00:00:00.000Z"),
    });
  });
});
