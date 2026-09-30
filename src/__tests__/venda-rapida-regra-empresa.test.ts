// Venda rápida, limite e 1º vencimento do boleto pela regra da empresa do cliente
// (spec 2026-09-30 §3.1 e §7). Executa `criarVendaV2` com tudo o que ela importa mockado.
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

function formVenda(forma: string): FormData {
  const fd = new FormData();
  fd.set("data", "2026-09-10");
  fd.set("vendedor", "v");
  fd.set("clienteId", "5");
  fd.set("parcelas", "3");
  fd.set("formaPagamento", forma);
  fd.set("produtos", JSON.stringify([{ produtoNome: "X", custoProduto: 100, valorVenda: 300, quantidade: 1, subtotal: 300 }]));
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

describe("criarVendaV2 pela regra da empresa", () => {
  it("parcelas sem datas no form vencem no dia e com o corte da regra do cliente", async () => {
    const r = await criarVendaV2(formVenda("DESCONTO_FOLHA"));
    expect(r.success).toBe(true);
    expect(regraDbMock.regraDoClienteNaData).toHaveBeenCalledWith(5, new Date("2026-09-10"));
    const linhas = tx.parcelaVencimento.createMany.mock.calls[0][0].data as { dataVencimento: Date }[];
    // Venda no dia 10 com corte 5: dois meses à frente, no dia 15.
    expect(linhas.map((p) => iso(p.dataVencimento))).toEqual(["2026-11-15", "2026-12-15", "2027-01-15"]);
  });

  it("checkCredito recebe o dia de corte da regra", async () => {
    await criarVendaV2(formVenda("DESCONTO_FOLHA"));
    expect(creditMock.checkCredito).toHaveBeenCalledWith(5, 100, 5);
  });

  it("1º vencimento do boleto no Asaas pela regra", async () => {
    await criarVendaV2(formVenda("BOLETO"));
    expect(asaasMock.createBoletoPayment).toHaveBeenCalledWith(expect.objectContaining({ dueDate: "2026-11-15" }), expect.anything());
  });
});

describe("criarVendaV2 com número de parcela repetido (2026-09-30)", () => {
  // Com a unique (venda_id, numero_parcela) o createMany falharia dentro da transação, depois de
  // a venda e o boleto já terem sido montados. Recusa antes, com a mesma mensagem da edição.
  it("recusa antes da transação e diz qual parcela repete", async () => {
    const fd = formVenda("DESCONTO_FOLHA");
    fd.set(
      "parcelasVencimento",
      JSON.stringify([
        { numeroParcela: 1, dataVencimento: "2026-10-10", valorParcela: 100 },
        { numeroParcela: 1, dataVencimento: "2026-11-10", valorParcela: 100 },
        { numeroParcela: 3, dataVencimento: "2026-12-10", valorParcela: 100 },
      ]),
    );
    const r = await criarVendaV2(fd);
    expect(r).toMatchObject({ success: false, error: "Parcela 1 aparece mais de uma vez." });
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });
});
