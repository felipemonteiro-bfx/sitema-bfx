// Data do desconto em venda 1x em folha (2026-10-01). Executa `criarVendaV2` com tudo o que ela
// importa mockado, no padrão de venda-rapida-regra-empresa.test.ts.
// Ver docs/superpowers/specs/2026-10-01-data-desconto-venda-1x.md.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { REGRA_PADRAO } from "@/lib/regra-empresa";

const tx = {
  venda: { create: vi.fn() },
  assinatura: { create: vi.fn() },
  itemVenda: { createMany: vi.fn() },
  parcelaVencimento: { createMany: vi.fn() },
  produto: { findFirst: vi.fn(), update: vi.fn() },
};
const dbMock = {
  cliente: { findUnique: vi.fn(), updateMany: vi.fn() },
  usuario: { findFirst: vi.fn() },
  config: { findFirst: vi.fn() },
  venda: { update: vi.fn(), count: vi.fn() },
  $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
};
const creditMock = { checkCredito: vi.fn() };
const regraDbMock = { regraDoClienteNaData: vi.fn() };
const asaasMock = {
  getAsaasConfig: vi.fn(() => ({ baseUrl: "https://api.asaas.com", apiKey: "k" })),
  getOrCreateCustomer: vi.fn(async () => "cus_1"),
  createBoletoPayment: vi.fn(async () => ({ id: "pay_1", bankSlipUrl: "https://boleto" })),
};

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/credit", () => creditMock);
vi.mock("@/lib/regra-empresa-db", () => regraDbMock);
vi.mock("@/lib/asaas", () => asaasMock);
vi.mock("@/lib/guards", () => ({ requireSessionOrThrow: vi.fn(async () => ({ id: 1, username: "v", role: "admin" })) }));
vi.mock("@/lib/session", () => ({ getSession: vi.fn(async () => ({ id: 1 })) }));
vi.mock("@/lib/consignado-db", () => ({
  calcularConsignado: vi.fn(async () => ({ renda: null, tomado: 0 })),
  recalcularConsignadoSeguro: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({ createAuditLog: vi.fn() }));
vi.mock("@/lib/revalidacao", () => ({ revalidarVenda: vi.fn() }));
vi.mock("@/lib/whatsapp", () => ({ enviarWhatsApp: vi.fn(), getWhatsAppFlags: vi.fn(async () => null) }));
vi.mock("@/lib/fidelidade-service", () => ({ creditarPontosVenda: vi.fn(async () => undefined), resgatarPontos: vi.fn(async () => undefined) }));
vi.mock("@/lib/logger", () => ({ logError: vi.fn() }));
vi.mock("@/lib/venda-observabilidade", () => ({ registrarRejeicaoVenda: vi.fn() }));
vi.mock("@/lib/recibo-url", () => ({ signReciboId: vi.fn(() => "sig") }));

const { criarVendaV2 } = await import("@/app/(app)/venda-rapida/actions");
const { registrarRejeicaoVenda } = await import("@/lib/venda-observabilidade");

function formUmaVez(forma: string, dataDesconto?: string): FormData {
  const fd = new FormData();
  fd.set("data", "2026-09-10");
  fd.set("vendedor", "v");
  fd.set("clienteId", "5");
  fd.set("entrega", "0");
  fd.set("parcelas", "1");
  fd.set("formaPagamento", forma);
  fd.set("produtos", JSON.stringify([{ produtoNome: "X", custoProduto: 100, valorVenda: 300, quantidade: 1, subtotal: 300 }]));
  if (dataDesconto !== undefined) fd.set("dataDescontoUnica", dataDesconto);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.cliente.findUnique.mockResolvedValue({ id: 5, nome: "Fulano", cpf: "12345678909", cnpj: null, email: null, telefone: null, asaasCustomerId: null, empresaParceiraId: 7 });
  dbMock.cliente.updateMany.mockResolvedValue({ count: 0 });
  dbMock.usuario.findFirst.mockResolvedValue({ id: 1 });
  dbMock.config.findFirst.mockResolvedValue({});
  tx.venda.create.mockResolvedValue({ id: 99 });
  tx.produto.findFirst.mockResolvedValue(null);
  creditMock.checkCredito.mockResolvedValue({ ok: true, disp: 0, tomado: 0, teto: 0 });
  regraDbMock.regraDoClienteNaData.mockResolvedValue({ ...REGRA_PADRAO, diaCorte: 5, diaVencimento: 15 });
});

const iso = (x: Date) => x.toISOString().slice(0, 10);
const linhas = () => (tx.parcelaVencimento.createMany.mock.calls[0]?.[0].data ?? []) as { numeroParcela: number; dataVencimento: Date; valorParcela: number }[];
const MSG = "Data do desconto deve ficar entre a data da venda e 12 meses depois.";

describe("criarVendaV2 — data do desconto em 1x em folha", () => {
  it("grava a data informada e o valor = total calculado no servidor", async () => {
    const r = await criarVendaV2(formUmaVez("DESCONTO_FOLHA", "2026-12-20"));
    expect(r.success).toBe(true);
    expect(linhas()).toHaveLength(1);
    expect(iso(linhas()[0].dataVencimento)).toBe("2026-12-20");
    expect(linhas()[0]).toMatchObject({ numeroParcela: 1, valorParcela: 300 });
  });

  it("a taxa da Prudent sai da data informada", async () => {
    await criarVendaV2(formUmaVez("DESCONTO_FOLHA"));
    const taxaRegra = tx.venda.create.mock.calls[0][0].data.taxaFinanceiraValor;
    vi.clearAllMocks();
    tx.venda.create.mockResolvedValue({ id: 99 });
    regraDbMock.regraDoClienteNaData.mockResolvedValue({ ...REGRA_PADRAO, diaCorte: 5, diaVencimento: 15 });
    creditMock.checkCredito.mockResolvedValue({ ok: true, disp: 0, tomado: 0, teto: 0 });
    await criarVendaV2(formUmaVez("DESCONTO_FOLHA", "2027-06-10"));
    expect(tx.venda.create.mock.calls[0][0].data.taxaFinanceiraValor).toBeGreaterThan(taxaRegra);
  });

  it("data anterior à venda: recusa com a mensagem da spec, sem gravar", async () => {
    const r = await criarVendaV2(formUmaVez("DESCONTO_FOLHA", "2026-09-09"));
    expect(r).toMatchObject({ success: false, error: MSG });
    expect(dbMock.$transaction).not.toHaveBeenCalled();
    expect(registrarRejeicaoVenda).toHaveBeenCalledWith(expect.objectContaining({ motivo: MSG }));
  });

  it("mais de 12 meses depois da venda: recusa, sem gravar", async () => {
    const r = await criarVendaV2(formUmaVez("DESCONTO_FOLHA", "2027-09-11"));
    expect(r).toMatchObject({ success: false, error: MSG });
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });

  it("data inválida: recusa, sem gravar", async () => {
    const r = await criarVendaV2(formUmaVez("DESCONTO_FOLHA", "2026-02-30"));
    expect(r).toMatchObject({ success: false, error: MSG });
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });

  it("sem a data: vencimento pela regra da empresa", async () => {
    const r = await criarVendaV2(formUmaVez("DESCONTO_FOLHA"));
    expect(r.success).toBe(true);
    // Venda no dia 10 com corte 5: dois meses à frente, no dia 15.
    expect(linhas().map((p) => iso(p.dataVencimento))).toEqual(["2026-11-15"]);
  });

  it("campo vazio conta como ausente", async () => {
    const r = await criarVendaV2(formUmaVez("DESCONTO_FOLHA", ""));
    expect(r.success).toBe(true);
    expect(linhas().map((p) => iso(p.dataVencimento))).toEqual(["2026-11-15"]);
  });

  it("1x PIX com a data no payload: ignora, nenhuma linha", async () => {
    const r = await criarVendaV2(formUmaVez("PIX", "2026-12-20"));
    expect(r.success).toBe(true);
    expect(tx.parcelaVencimento.createMany).not.toHaveBeenCalled();
  });

  it("1x PIX com data fora do intervalo no payload: ignora, não recusa", async () => {
    const r = await criarVendaV2(formUmaVez("PIX", "2020-01-01"));
    expect(r.success).toBe(true);
  });
});
