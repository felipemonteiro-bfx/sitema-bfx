// Edição de venda × fechamento mensal e boleto Prudent (2026-09-30, Fase 5; spec §3.2).
//
// `updateVenda` apaga e recria as parcelas a cada save. Com a reserva do fechamento:
// - fechamento conferido ou posterior: mudar valor/vencimento/quantidade de parcela reservada é
//   recusado; save sem mudança preserva a reserva;
// - fechamento em preparação: a parcela que mudou perde a reserva e o fechamento fica
//   "desatualizado"; a que não mudou continua reservada;
// - parcela com boleto Prudent: valor e vencimento não mudam (a Prudent já emitiu o boleto);
// - `liquidadaEm` e `boletoPrudentId` sobrevivem à recriação.
import { describe, it, expect, vi, beforeEach } from "vitest";

const dbMock = {
  usuario: { findFirst: vi.fn() },
  venda: { update: vi.fn(), findUnique: vi.fn() },
  itemVenda: { deleteMany: vi.fn(), createMany: vi.fn() },
  parcelaVencimento: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
  fechamento: { updateMany: vi.fn() },
  despesa: { create: vi.fn() },
};
vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/audit", () => ({ createAuditLog: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendVendaNotification: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/guards", () => ({ requireSessionOrThrow: vi.fn(async () => ({ id: 1, username: "andre", role: "admin" })) }));
vi.mock("@/lib/consignado-db", () => ({ recalcularConsignadoSeguro: vi.fn() }));

const { updateVenda } = await import("@/app/(app)/historico/actions");
const { FORMA_PAGAMENTO } = await import("@/lib/forma-pagamento");

type ParcelaForm = { numeroParcela: number; dataVencimento: string; valorParcela: number };
const PARCELAS_FORM: ParcelaForm[] = [
  { numeroParcela: 1, dataVencimento: "2026-10-10", valorParcela: 300 },
  { numeroParcela: 2, dataVencimento: "2026-11-10", valorParcela: 300 },
  { numeroParcela: 3, dataVencimento: "2026-12-10", valorParcela: 300 },
];

function formVenda(parcelas: ParcelaForm[] = PARCELAS_FORM): FormData {
  const fd = new FormData();
  fd.set("id", "10");
  fd.set("data", "2026-09-01");
  fd.set("vendedor", "andre");
  fd.set("frete", "0");
  fd.set("envio", "0");
  fd.set("desconto", "0");
  fd.set("parcelas", String(parcelas.length));
  fd.set("formaPagamento", FORMA_PAGAMENTO.DESCONTO_FOLHA);
  fd.set(
    "itensJson",
    JSON.stringify([{ produtoNome: "Produto X", custoProduto: 600, valorVenda: 900, quantidade: 1, subtotal: 900 }])
  );
  fd.set("parcelasVencimento", JSON.stringify(parcelas));
  return fd;
}

function existente(numeroParcela: number, extra: Record<string, unknown> = {}) {
  return {
    numeroParcela,
    paga: false,
    dataPagamento: null,
    dataVencimento: new Date(`2026-${String(numeroParcela + 9).padStart(2, "0")}-10T00:00:00.000Z`),
    valorParcela: 300,
    antecipada: false,
    origemPagamento: null,
    asaasPaymentId: null,
    baixaPor: null,
    antecipacaoLoteId: null,
    boletoPrudentId: null,
    fechamentoId: null,
    liquidadaEm: null,
    fechamento: null,
    ...extra,
  };
}

const reservada = (status: string, extra: Record<string, unknown> = {}) =>
  existente(1, { fechamentoId: 11, fechamento: { id: 11, status, competencia: "2026-10" }, ...extra });

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.usuario.findFirst.mockResolvedValue({ id: 1 });
  dbMock.venda.update.mockResolvedValue({ clienteId: 3 });
  dbMock.fechamento.updateMany.mockImplementation(async (args: { where?: { id?: { in?: number[] } } }) => ({
    count: args?.where?.id?.in?.length ?? 0,
  }));
});

const recriada = (n: number) =>
  (dbMock.parcelaVencimento.createMany.mock.calls[0][0].data as Record<string, unknown>[]).find((p) => p.numeroParcela === n);

describe("fechamento conferido ou posterior", () => {
  it("mudar o valor da parcela reservada é recusado antes de qualquer escrita", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([reservada("conferido"), existente(2), existente(3)]);
    const parcelas = PARCELAS_FORM.map((p) => (p.numeroParcela === 1 ? { ...p, valorParcela: 350 } : p));

    const r = await updateVenda(formVenda(parcelas));

    expect(r).toEqual({
      success: false,
      error: "Parcela V10-1/3 está no fechamento de outubro de 2026 (Conferido). Reabra o fechamento e retire-a antes.",
    });
    expect(dbMock.venda.update).not.toHaveBeenCalled();
    expect(dbMock.parcelaVencimento.deleteMany).not.toHaveBeenCalled();
  });

  it("mudar o vencimento ou a quantidade de parcelas também é recusado (enviado)", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([reservada("enviado"), existente(2), existente(3)]);
    const venc = PARCELAS_FORM.map((p) => (p.numeroParcela === 1 ? { ...p, dataVencimento: "2026-10-20" } : p));
    expect((await updateVenda(formVenda(venc))).error).toMatch(/V10-1\/3 está no fechamento de outubro de 2026 \(Enviado ao RH\)/);

    const quatro = [...PARCELAS_FORM, { numeroParcela: 4, dataVencimento: "2027-01-10", valorParcela: 300 }];
    expect((await updateVenda(formVenda(quatro))).error).toMatch(/está no fechamento/);
    expect(dbMock.venda.update).not.toHaveBeenCalled();
    expect(dbMock.parcelaVencimento.deleteMany).not.toHaveBeenCalled();
  });

  it("save sem mudar parcelas preserva a reserva e a liquidação", async () => {
    const liquidadaEm = new Date("2026-10-15T00:00:00Z");
    dbMock.parcelaVencimento.findMany.mockResolvedValue([reservada("conferido", { liquidadaEm }), existente(2), existente(3)]);

    const r = await updateVenda(formVenda());

    expect(r).toEqual({ success: true });
    expect(recriada(1)).toMatchObject({ fechamentoId: 11, liquidadaEm });
    expect(recriada(2)).toMatchObject({ fechamentoId: null, liquidadaEm: null });
    expect(dbMock.fechamento.updateMany).not.toHaveBeenCalled();
  });

  it("venda 1x em folha reservada: mudar o total muda a parcela → recusado", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([
      existente(1, { valorParcela: 900, fechamentoId: 11, fechamento: { id: 11, status: "conferido", competencia: "2026-10" } }),
    ]);
    dbMock.venda.findUnique.mockResolvedValue({
      clienteId: 3, dataVenda: new Date("2026-09-01T00:00:00Z"), formaPagamento: FORMA_PAGAMENTO.DESCONTO_FOLHA,
      descontoEmFolha: true, boleto: false, parcelas: 1, valorFrete: 0, desconto: 0, valorVenda: 900, quantidade: 1,
      custoProduto: 600, produtoNome: "Produto X", itens: [{ subtotal: 900 }],
    });
    const fd = formVenda();
    fd.delete("parcelasVencimento");
    fd.set("parcelas", "1");
    fd.set("itensJson", JSON.stringify([{ produtoNome: "Produto X", custoProduto: 600, valorVenda: 1000, quantidade: 1, subtotal: 1000 }]));

    const r = await updateVenda(fd);

    expect(r.error).toMatch(/V10-1\/1 está no fechamento/);
    expect(dbMock.parcelaVencimento.deleteMany).not.toHaveBeenCalled();
  });
});

describe("fechamento em preparação", () => {
  it("a parcela que mudou perde a reserva e o fechamento fica desatualizado (antes de gravar a venda)", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([reservada("em_preparacao"), existente(2), existente(3)]);
    const parcelas = PARCELAS_FORM.map((p) => (p.numeroParcela === 1 ? { ...p, valorParcela: 350 } : p));

    const r = await updateVenda(formVenda(parcelas));

    expect(r).toEqual({ success: true });
    expect(dbMock.fechamento.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [11] }, status: "em_preparacao" },
      data: { desatualizado: true },
    });
    expect(dbMock.fechamento.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      dbMock.venda.update.mock.invocationCallOrder[0]
    );
    expect(recriada(1)).toMatchObject({ fechamentoId: null, valorParcela: 350 });
  });

  it("save sem mudança mantém a reserva e não marca nada", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([reservada("em_preparacao"), existente(2), existente(3)]);
    expect(await updateVenda(formVenda())).toEqual({ success: true });
    expect(recriada(1)).toMatchObject({ fechamentoId: 11 });
    expect(dbMock.fechamento.updateMany).not.toHaveBeenCalled();
  });

  it("o fechamento foi conferido no meio (count 0) → recusa sem gravar", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([reservada("em_preparacao"), existente(2), existente(3)]);
    dbMock.fechamento.updateMany.mockResolvedValue({ count: 0 });
    const parcelas = PARCELAS_FORM.map((p) => (p.numeroParcela === 1 ? { ...p, valorParcela: 350 } : p));

    const r = await updateVenda(formVenda(parcelas));

    expect(r).toEqual({ success: false, error: "O fechamento mudou enquanto você editava. Recarregue e tente de novo." });
    expect(dbMock.venda.update).not.toHaveBeenCalled();
    expect(dbMock.parcelaVencimento.deleteMany).not.toHaveBeenCalled();
  });
});

describe("parcela com boleto Prudent", () => {
  const comBoleto = () =>
    existente(1, { paga: true, antecipada: true, origemPagamento: "prudent", antecipacaoLoteId: 5, boletoPrudentId: 30 });

  it("mudar valor ou vencimento é recusado", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([comBoleto(), existente(2), existente(3)]);
    const valor = PARCELAS_FORM.map((p) => (p.numeroParcela === 1 ? { ...p, valorParcela: 310 } : p));
    expect(await updateVenda(formVenda(valor))).toEqual({
      success: false,
      error: "A Prudent já emitiu boleto da parcela 1: valor e vencimento não podem mudar.",
    });
    const venc = PARCELAS_FORM.map((p) => (p.numeroParcela === 1 ? { ...p, dataVencimento: "2026-10-11" } : p));
    expect((await updateVenda(formVenda(venc))).success).toBe(false);
    expect(dbMock.venda.update).not.toHaveBeenCalled();
    expect(dbMock.parcelaVencimento.deleteMany).not.toHaveBeenCalled();
  });

  it("save sem mudança preserva o boleto; mudar outra parcela é permitido", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([comBoleto(), existente(2), existente(3)]);
    const parcelas = PARCELAS_FORM.map((p) => (p.numeroParcela === 3 ? { ...p, valorParcela: 320 } : p));
    expect(await updateVenda(formVenda(parcelas))).toEqual({ success: true });
    expect(recriada(1)).toMatchObject({ boletoPrudentId: 30, antecipada: true });
  });
});
