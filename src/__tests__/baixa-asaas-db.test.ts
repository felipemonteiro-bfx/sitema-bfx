// Aplicacao da baixa do Asaas no banco, webhook e sincronizacao (2026-09-16).
// Ver docs/superpowers/specs/2026-09-16-baixa-de-parcelas.md.
import { describe, it, expect, vi, beforeEach } from "vitest";

const dbMock = {
  parcelaVencimento: { findMany: vi.fn(), updateMany: vi.fn() },
  venda: { findMany: vi.fn() },
  config: { findFirst: vi.fn(), updateMany: vi.fn() },
};
const asaasMock = {
  getAsaasConfig: vi.fn((): { baseUrl: string; apiKey: string } | null => ({ baseUrl: "https://api.asaas.com", apiKey: "k" })),
  getPayment: vi.fn(),
  listPaymentsDaVenda: vi.fn(),
};
const auditMock = { createAuditLog: vi.fn() };

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/asaas", () => asaasMock);
vi.mock("@/lib/audit", () => auditMock);

const { aplicarPagamentoAsaas, sincronizarBaixasAsaas } = await import("@/lib/baixa-parcelas-db");
const { POST } = await import("@/app/api/webhooks/asaas/route");

const PARCELA_ABERTA = {
  id: 100,
  vendaId: 7,
  numeroParcela: 2,
  paga: false,
  origemPagamento: null,
  asaasPaymentId: null,
  venda: { status: "ativa" },
};
const PAGAMENTO = {
  id: "pay_abc",
  status: "RECEIVED",
  externalReference: "7",
  installment: "ins_1",
  installmentNumber: 2,
  paymentDate: "2026-09-10",
};

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.parcelaVencimento.findMany.mockResolvedValue([PARCELA_ABERTA]);
  dbMock.parcelaVencimento.updateMany.mockResolvedValue({ count: 1 });
  dbMock.config.findFirst.mockResolvedValue({ asaasApiKey: "k", asaasEnv: "production", asaasWebhookToken: "token-certo-123456" });
});

describe("aplicarPagamentoAsaas", () => {
  it("baixa condicionada a parcela ainda aberta, com data, origem e id da cobranca, e registra audit", async () => {
    const r = await aplicarPagamentoAsaas(PAGAMENTO);

    expect(r.acao).toBe("baixar");
    expect(dbMock.parcelaVencimento.updateMany).toHaveBeenCalledWith({
      where: { id: 100, paga: false },
      data: {
        paga: true,
        dataPagamento: new Date("2026-09-10T00:00:00.000Z"),
        origemPagamento: "asaas",
        asaasPaymentId: "pay_abc",
        baixaPor: null,
      },
    });
    expect(auditMock.createAuditLog).toHaveBeenCalledWith(
      "parcela:baixa",
      expect.objectContaining({ parcelaId: 100, vendaId: 7, origem: "asaas", asaasPaymentId: "pay_abc" }),
    );
  });

  it("se outro processo gravou antes (count 0), nao registra audit de novo", async () => {
    dbMock.parcelaVencimento.updateMany.mockResolvedValue({ count: 0 });

    await aplicarPagamentoAsaas(PAGAMENTO);

    expect(auditMock.createAuditLog).not.toHaveBeenCalled();
  });

  it("estorno desfaz so a baixa desta cobranca", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([
      { ...PARCELA_ABERTA, paga: true, origemPagamento: "asaas", asaasPaymentId: "pay_abc" },
    ]);

    const r = await aplicarPagamentoAsaas({ ...PAGAMENTO, status: "REFUNDED" });

    expect(r.acao).toBe("desfazer");
    expect(dbMock.parcelaVencimento.updateMany).toHaveBeenCalledWith({
      where: { id: 100, paga: true, origemPagamento: "asaas", asaasPaymentId: "pay_abc" },
      data: { paga: false, dataPagamento: null, origemPagamento: null, asaasPaymentId: null, baixaPor: null },
    });
  });

  it("sem venda na referencia nao consulta nem grava", async () => {
    const r = await aplicarPagamentoAsaas({ ...PAGAMENTO, externalReference: null });

    expect(r).toEqual({ acao: "ignorar", motivo: "referencia_invalida" });
    expect(dbMock.parcelaVencimento.findMany).not.toHaveBeenCalled();
    expect(dbMock.parcelaVencimento.updateMany).not.toHaveBeenCalled();
  });
});

describe("POST /api/webhooks/asaas", () => {
  function requisicao(token: string | null, corpo: unknown) {
    const headers = new Headers({ "content-type": "application/json" });
    if (token != null) headers.set("asaas-access-token", token);
    return new Request("http://localhost/api/webhooks/asaas", { method: "POST", headers, body: JSON.stringify(corpo) });
  }
  const EVENTO = { event: "PAYMENT_RECEIVED", payment: { id: "pay_abc" } };

  it("sem token configurado no sistema recusa (fechado)", async () => {
    dbMock.config.findFirst.mockResolvedValue({ asaasWebhookToken: null });
    const r = await POST(requisicao("qualquer", EVENTO));
    expect(r.status).toBe(401);
    expect(asaasMock.getPayment).not.toHaveBeenCalled();
  });

  it("token errado ou ausente recusa", async () => {
    expect((await POST(requisicao("token-errado-000000", EVENTO))).status).toBe(401);
    expect((await POST(requisicao(null, EVENTO))).status).toBe(401);
    expect(asaasMock.getPayment).not.toHaveBeenCalled();
    expect(dbMock.config.updateMany).not.toHaveBeenCalled();
  });

  it("chamada autenticada registra o ultimo aviso, mesmo sem cobranca no corpo", async () => {
    await POST(requisicao("token-certo-123456", { event: "PAYMENT_CREATED" }));
    // Condicionado ao token validado: aviso com o token antigo, gravado depois de "Gerar novo
    // token", nao pode marcar o novo como "Recebendo avisos".
    expect(dbMock.config.updateMany).toHaveBeenCalledWith({
      where: { asaasWebhookToken: "token-certo-123456" },
      data: { asaasWebhookUltimoAvisoEm: expect.any(Date) },
    });
  });

  it("token certo: busca a cobranca atual no Asaas e aplica o status dela, nao o do evento", async () => {
    asaasMock.getPayment.mockResolvedValue({ ...PAGAMENTO, status: "REFUNDED" });
    dbMock.parcelaVencimento.findMany.mockResolvedValue([
      { ...PARCELA_ABERTA, paga: true, origemPagamento: "asaas", asaasPaymentId: "pay_abc" },
    ]);

    const r = await POST(requisicao("token-certo-123456", EVENTO));

    expect(r.status).toBe(200);
    expect(asaasMock.getPayment).toHaveBeenCalledWith(expect.anything(), "pay_abc");
    expect(await r.json()).toMatchObject({ ok: true, acao: "desfazer" });
  });

  it("falha na API do Asaas responde 200 com ok false (a sincronizacao diaria corrige)", async () => {
    asaasMock.getPayment.mockRejectedValue(new Error("timeout"));
    const r = await POST(requisicao("token-certo-123456", EVENTO));
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: false });
    expect(dbMock.parcelaVencimento.updateMany).not.toHaveBeenCalled();
  });

  it("evento sem cobranca e ignorado com 200", async () => {
    const r = await POST(requisicao("token-certo-123456", { event: "PAYMENT_CREATED" }));
    expect(r.status).toBe(200);
    expect(asaasMock.getPayment).not.toHaveBeenCalled();
  });
});

describe("sincronizarBaixasAsaas", () => {
  it("lista as cobrancas de cada venda ativa com boleto e aplica cada uma", async () => {
    dbMock.venda.findMany.mockResolvedValue([{ id: 7 }, { id: 8 }]);
    asaasMock.listPaymentsDaVenda.mockImplementation(async (_c: unknown, vendaId: number) =>
      vendaId === 7 ? [PAGAMENTO] : [],
    );

    const resumo = await sincronizarBaixasAsaas();

    expect(asaasMock.listPaymentsDaVenda).toHaveBeenCalledTimes(2);
    expect(resumo).toMatchObject({ vendas: 2, cobrancas: 1, baixadas: 1, desfeitas: 0, erros: 0 });
  });

  it("erro numa cobranca (ex.: P2002) nao impede as outras cobrancas da mesma venda", async () => {
    dbMock.venda.findMany.mockResolvedValue([{ id: 7 }]);
    asaasMock.listPaymentsDaVenda.mockResolvedValue([
      { ...PAGAMENTO, id: "pay_1", installmentNumber: 1 },
      { ...PAGAMENTO, id: "pay_2", installmentNumber: 2 },
    ]);
    dbMock.parcelaVencimento.findMany.mockResolvedValue([
      { ...PARCELA_ABERTA, id: 99, numeroParcela: 1 },
      PARCELA_ABERTA,
    ]);
    dbMock.parcelaVencimento.updateMany
      .mockRejectedValueOnce(Object.assign(new Error("Unique constraint"), { code: "P2002" }))
      .mockResolvedValueOnce({ count: 1 });

    const resumo = await sincronizarBaixasAsaas();

    expect(resumo).toMatchObject({ cobrancas: 2, baixadas: 1, erros: 1 });
  });

  it("sem Asaas configurado nao faz nada", async () => {
    asaasMock.getAsaasConfig.mockReturnValueOnce(null);
    const resumo = await sincronizarBaixasAsaas();
    expect(resumo).toMatchObject({ vendas: 0, desativado: true });
    expect(dbMock.venda.findMany).not.toHaveBeenCalled();
  });

  it("erro numa venda nao para as outras", async () => {
    dbMock.venda.findMany.mockResolvedValue([{ id: 7 }, { id: 8 }]);
    asaasMock.listPaymentsDaVenda.mockImplementation(async (_c: unknown, vendaId: number) => {
      if (vendaId === 7) throw new Error("429");
      return [{ ...PAGAMENTO, externalReference: "8" }];
    });
    dbMock.parcelaVencimento.findMany.mockResolvedValue([{ ...PARCELA_ABERTA, vendaId: 8 }]);

    const resumo = await sincronizarBaixasAsaas();

    expect(resumo).toMatchObject({ erros: 1, baixadas: 1 });
  });
});
