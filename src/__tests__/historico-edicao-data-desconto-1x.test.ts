// Data do desconto na edição de venda 1x em folha (2026-10-01), no padrão de
// historico-edicao-parcela-unica.test.ts. Ver docs/superpowers/specs/2026-10-01-data-desconto-venda-1x.md.
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mesmo padrão de mocks de historico-edicao-preserva-antecipada.test.ts.
const dbMock = {
  // Fase 5: a edição/exclusão grava numa transação, com as parcelas travadas (FOR UPDATE).
  $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(dbMock)),
  $queryRaw: vi.fn(async () => []),
  usuario: { findFirst: vi.fn() },
  venda: { update: vi.fn(), findUnique: vi.fn() },
  itemVenda: { deleteMany: vi.fn(), createMany: vi.fn() },
  parcelaVencimento: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
  despesa: { create: vi.fn() },
  // Lidos por `regraDoClienteNaData` (regra da empresa do cliente, 2026-09-30).
  cliente: { findUnique: vi.fn() },
  regraEmpresa: { findMany: vi.fn() },
};
vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/audit", () => ({ createAuditLog: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendVendaNotification: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/guards", () => ({ requireSessionOrThrow: vi.fn(async () => ({ id: 1, username: "vendedor-teste", role: "vendedor" })) }));
vi.mock("@/lib/consignado-db", () => ({ recalcularConsignadoSeguro: vi.fn() }));

const { updateVenda } = await import("@/app/(app)/historico/actions");
const { FORMA_PAGAMENTO } = await import("@/lib/forma-pagamento");
const { custoAntecipacaoVenda } = await import("@/lib/antecipacao-custo");

const MSG = "Data do desconto deve ficar entre a data da venda e 12 meses depois.";

function form(dataDesconto?: string, forma: string = FORMA_PAGAMENTO.DESCONTO_FOLHA): FormData {
  const fd = new FormData();
  fd.set("id", "10");
  fd.set("data", "2026-09-22");
  fd.set("vendedor", "vendedor-teste");
  fd.set("frete", "0");
  fd.set("envio", "0");
  fd.set("desconto", "0");
  fd.set("parcelas", "1");
  fd.set("formaPagamento", forma);
  fd.set("itensJson", JSON.stringify([{ produtoNome: "Produto X", custoProduto: 100, valorVenda: 150, quantidade: 1, subtotal: 150 }]));
  if (dataDesconto !== undefined) fd.set("dataDescontoUnica", dataDesconto);
  return fd;
}

const linha = (extra: Record<string, unknown> = {}) => ({
  numeroParcela: 1,
  paga: false,
  dataPagamento: null,
  dataVencimento: new Date("2026-10-15T00:00:00.000Z"),
  valorParcela: 150,
  antecipada: false,
  origemPagamento: null,
  asaasPaymentId: null,
  baixaPor: null,
  ...extra,
});

const vendaGravada = {
  clienteId: 42,
  dataVenda: new Date("2026-09-22T00:00:00.000Z"),
  formaPagamento: FORMA_PAGAMENTO.DESCONTO_FOLHA,
  descontoEmFolha: true,
  boleto: false,
  parcelas: 1,
  valorFrete: 0,
  desconto: 0,
  valorVenda: 150,
  quantidade: 1,
  custoProduto: 100,
  produtoNome: "Produto X",
  itens: [{ subtotal: 150 }],
};

type Criada = Record<string, unknown>;
const criadas = () => (dbMock.parcelaVencimento.createMany.mock.calls[0]?.[0].data ?? []) as Criada[];
const dia = (s: string) => new Date(`${s}T00:00:00.000Z`);

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.usuario.findFirst.mockResolvedValue({ id: 1 });
  dbMock.venda.update.mockResolvedValue({ clienteId: null });
  dbMock.venda.findUnique.mockResolvedValue(vendaGravada);
  dbMock.cliente.findUnique.mockResolvedValue({ empresaParceiraId: null });
  dbMock.regraEmpresa.findMany.mockResolvedValue([]);
  dbMock.parcelaVencimento.findMany.mockResolvedValue([linha()]);
});

describe("updateVenda — data do desconto em 1x em folha", () => {
  it("muda a data da parcela única; valor continua sendo o total", async () => {
    const r = await updateVenda(form("2026-12-15"));
    expect(r).toMatchObject({ success: true });
    expect(criadas()).toEqual([expect.objectContaining({ numeroParcela: 1, dataVencimento: dia("2026-12-15"), valorParcela: 150 })]);
  });

  it("a taxa da Prudent sai da data nova", async () => {
    await updateVenda(form("2027-03-15"));
    expect(dbMock.venda.update.mock.calls[0][0].data.taxaFinanceiraValor).toBe(
      custoAntecipacaoVenda({
        formaPagamento: FORMA_PAGAMENTO.DESCONTO_FOLHA,
        dataVenda: new Date("2026-09-22"),
        valorVenda: 150,
        parcelas: 1,
        parcelas_detalhes: [{ dataVencimento: dia("2027-03-15"), valorParcela: 150 }],
      }),
    );
  });

  it("salvar sem mudar mantém a data gravada", async () => {
    const r = await updateVenda(form("2026-10-15"));
    expect(r).toMatchObject({ success: true });
    expect(criadas()[0]).toMatchObject({ dataVencimento: dia("2026-10-15") });
  });

  it("salvar sem mudar mantém até data gravada fora do intervalo (venda antiga)", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([linha({ dataVencimento: dia("2026-09-10") })]);
    const r = await updateVenda(form("2026-09-10"));
    expect(r).toMatchObject({ success: true });
    expect(criadas()[0]).toMatchObject({ dataVencimento: dia("2026-09-10") });
  });

  it("data nova antes da venda ou depois de 12 meses: recusa, sem apagar", async () => {
    for (const d of ["2026-09-21", "2027-09-23", "2026-02-30"]) {
      vi.clearAllMocks();
      dbMock.venda.findUnique.mockResolvedValue(vendaGravada);
      dbMock.parcelaVencimento.findMany.mockResolvedValue([linha()]);
      const r = await updateVenda(form(d));
      expect(r).toEqual({ success: false, error: MSG });
      expect(dbMock.parcelaVencimento.deleteMany).not.toHaveBeenCalled();
      expect(dbMock.venda.update).not.toHaveBeenCalled();
    }
  });

  it("mudou a data da venda e manteve a data do desconto gravada: valida contra a data nova", async () => {
    const fd = form("2026-10-15");
    fd.set("data", "2026-10-20");
    const r = await updateVenda(fd);
    expect(r).toEqual({ success: false, error: MSG });
    expect(dbMock.parcelaVencimento.deleteMany).not.toHaveBeenCalled();
  });

  it("parcela com boleto da Prudent: mudar a data é recusado", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([
      linha({ boletoPrudentId: 3, antecipada: true, paga: true, origemPagamento: "prudent", fechamentoId: null, fechamento: null }),
    ]);
    const r = (await updateVenda(form("2026-12-15"))) as { success: boolean; error?: string };
    expect(r.success).toBe(false);
    expect(r.error).toContain("boleto");
    expect(dbMock.parcelaVencimento.deleteMany).not.toHaveBeenCalled();
  });

  it("parcela com boleto da Prudent: salvar sem mudar a data passa", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([
      linha({ boletoPrudentId: 3, antecipada: true, paga: true, origemPagamento: "prudent", fechamentoId: null, fechamento: null }),
    ]);
    const r = await updateVenda(form("2026-10-15"));
    expect(r).toMatchObject({ success: true });
  });

  it("parcela em fechamento conferido: mudar a data é recusado", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([
      linha({ fechamentoId: 9, fechamento: { id: 9, status: "conferido", competencia: "2026-10" } }),
    ]);
    const r = (await updateVenda(form("2026-12-15"))) as { success: boolean; error?: string };
    expect(r.success).toBe(false);
    expect(r.error).toContain("fechamento");
    expect(dbMock.parcelaVencimento.deleteMany).not.toHaveBeenCalled();
  });

  it("sem o campo: comportamento de antes (mantém a data gravada)", async () => {
    await updateVenda(form());
    expect(criadas()[0]).toMatchObject({ dataVencimento: dia("2026-10-15") });
  });

  it("1x PIX com a data no payload: ignora (nenhuma linha)", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([]);
    const r = await updateVenda(form("2026-12-15", FORMA_PAGAMENTO.PIX));
    expect(r).toMatchObject({ success: true });
    expect(dbMock.parcelaVencimento.createMany).not.toHaveBeenCalled();
  });

  it("1x PIX com data fora do intervalo no payload: ignora, não recusa", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([]);
    const r = await updateVenda(form("2020-01-01", FORMA_PAGAMENTO.PIX));
    expect(r).toMatchObject({ success: true });
  });
});

describe("updateVenda — data do desconto numa parcela travada", () => {
  it("paga (sem boleto): mudar a data é recusado, sem apagar", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([linha({ paga: true, origemPagamento: "manual" })]);
    const r = await updateVenda(form("2026-12-15"));
    expect(r).toEqual({ success: false, error: "A parcela 1 já está paga ou antecipada: a data do desconto não pode mudar." });
    expect(dbMock.parcelaVencimento.deleteMany).not.toHaveBeenCalled();
  });

  it("num lote da Prudent: mudar a data é recusado", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([linha({ antecipacaoLoteId: 7 })]);
    const r = (await updateVenda(form("2026-12-15"))) as { success: boolean; error?: string };
    expect(r.success).toBe(false);
    expect(r.error).toContain("lote");
  });

  it("antecipada, salvando sem mudar a data: passa e mantém a linha", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([linha({ antecipada: true, paga: true, origemPagamento: "prudent" })]);
    const r = await updateVenda(form("2026-10-15"));
    expect(r).toMatchObject({ success: true });
    expect(criadas()[0]).toMatchObject({ dataVencimento: dia("2026-10-15"), antecipada: true });
  });
});

describe("updateVenda — achados da revisão (2026-10-01)", () => {
  it("parcela num lote: mudar só a data da venda não reescreve o vencimento gravado", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([linha({ antecipacaoLoteId: 7 })]);
    const fd = form();
    fd.set("data", "2026-09-25");
    const r = await updateVenda(fd);
    expect(r).toMatchObject({ success: true });
    expect(criadas()[0]).toMatchObject({ dataVencimento: dia("2026-10-15"), antecipacaoLoteId: 7 });
  });

  it("parcela antecipada com a data gravada no campo e a data da venda mudada: passa e mantém a data", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([linha({ antecipada: true, paga: true, origemPagamento: "prudent" })]);
    const fd = form("2026-10-15");
    fd.set("data", "2026-10-20");
    const r = await updateVenda(fd);
    expect(r).toMatchObject({ success: true });
    expect(criadas()[0]).toMatchObject({ dataVencimento: dia("2026-10-15") });
  });

  it("forma mudou para folha: data igual à gravada não pula a validação", async () => {
    dbMock.venda.findUnique.mockResolvedValue({ ...vendaGravada, formaPagamento: FORMA_PAGAMENTO.BOLETO, descontoEmFolha: false, boleto: true });
    dbMock.parcelaVencimento.findMany.mockResolvedValue([linha({ dataVencimento: dia("2026-09-01") })]);
    const r = await updateVenda(form("2026-09-01"));
    expect(r).toEqual({ success: false, error: MSG });
  });
});
