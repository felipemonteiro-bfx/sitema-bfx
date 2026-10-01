// Cobrança Pix do fechamento no envio (Fase 6, spec 2026-09-30 §5.2): encerrar as cobranças de
// versões anteriores (paga → recebimento; senão cancela no Asaas, com o status no where) e
// garantir a cobrança da versão enviada pelo saldo. Asaas e Prisma mockados.
import { describe, it, expect, vi, beforeEach } from "vitest";

const dbMock = {
  cobrancaFechamento: { findMany: vi.fn(), updateMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  recebimentoFechamento: { findMany: vi.fn() },
  empresaParceira: { update: vi.fn() },
};
vi.mock("@/lib/db", () => ({ prisma: dbMock }));
const asaasMock = {
  getPayment: vi.fn(),
  cancelPayment: vi.fn(),
  createPixPayment: vi.fn(),
  getPixQrCode: vi.fn(),
};
vi.mock("@/lib/asaas", () => asaasMock);
const recMock = { processarPagamentoFechamento: vi.fn() };
vi.mock("@/lib/recebimento-fechamento-db", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/recebimento-fechamento-db")>();
  return { ...real, ...recMock };
});

const { encerrarCobrancasAnteriores, garantirCobrancaPix, sincronizarCobrancasAtivas } = await import("@/lib/cobranca-fechamento-db");

const CONFIG = { baseUrl: "https://asaas.test", apiKey: "k" };
const QR_PNG_B64 = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString("base64");

const ativa = (extra: Record<string, unknown> = {}) => ({
  id: 4,
  versaoId: 900,
  asaasPaymentId: "pay_v1",
  valor: 600,
  vencimento: new Date("2026-10-15T00:00:00Z"),
  externalReference: "FEC-7-2026-10-v1",
  pixCopiaECola: "000201PIXV1",
  qrCodePng: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.cobrancaFechamento.findMany.mockResolvedValue([]);
  dbMock.cobrancaFechamento.updateMany.mockResolvedValue({ count: 1 });
  dbMock.cobrancaFechamento.create.mockResolvedValue({ id: 8 });
  dbMock.cobrancaFechamento.update.mockResolvedValue({});
  dbMock.recebimentoFechamento.findMany.mockResolvedValue([]);
  asaasMock.getPayment.mockResolvedValue({ id: "pay_v1", status: "PENDING" });
  asaasMock.cancelPayment.mockResolvedValue(undefined);
  asaasMock.createPixPayment.mockResolvedValue({ id: "pay_v2", status: "PENDING" });
  asaasMock.getPixQrCode.mockResolvedValue({ payload: "000201PIXV2", encodedImage: QR_PNG_B64 });
  recMock.processarPagamentoFechamento.mockResolvedValue({ acao: "registrado" });
});

describe("encerrarCobrancasAnteriores", () => {
  it("cobrança de versão anterior não paga → cancela no Asaas e marca cancelada com o status no where", async () => {
    dbMock.cobrancaFechamento.findMany.mockResolvedValue([ativa()]);
    await encerrarCobrancasAnteriores({ fechamentoId: 11, versaoId: 901, config: CONFIG });
    expect(asaasMock.getPayment).toHaveBeenCalledWith(CONFIG, "pay_v1");
    expect(asaasMock.cancelPayment).toHaveBeenCalledWith(CONFIG, "pay_v1");
    expect(dbMock.cobrancaFechamento.updateMany).toHaveBeenCalledWith({
      where: { id: 4, status: "ativa" },
      data: { status: "cancelada", canceladaEm: expect.any(Date) },
    });
    expect(asaasMock.getPayment.mock.invocationCallOrder[0]).toBeLessThan(asaasMock.cancelPayment.mock.invocationCallOrder[0]);
  });

  it("acabou de ser paga → não cancela: registra o recebimento", async () => {
    const pago = { id: "pay_v1", status: "RECEIVED", value: 600 };
    dbMock.cobrancaFechamento.findMany.mockResolvedValue([ativa()]);
    asaasMock.getPayment.mockResolvedValue(pago);
    await encerrarCobrancasAnteriores({ fechamentoId: 11, versaoId: 901, config: CONFIG });
    expect(asaasMock.cancelPayment).not.toHaveBeenCalled();
    expect(recMock.processarPagamentoFechamento).toHaveBeenCalledWith(pago, null);
    expect(dbMock.cobrancaFechamento.updateMany).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "cancelada" }) }));
    // mesmo se o processamento ignorar (ex.: sem valor), a cobrança paga não fica ativa travando o próximo envio
    expect(dbMock.cobrancaFechamento.updateMany).toHaveBeenCalledWith({ where: { id: 4, status: "ativa" }, data: { status: "paga" } });
  });

  it("já removida no Asaas (tentativa anterior) → só marca cancelada, sem DELETE", async () => {
    dbMock.cobrancaFechamento.findMany.mockResolvedValue([ativa()]);
    asaasMock.getPayment.mockResolvedValue({ id: "pay_v1", status: "PENDING", deleted: true });
    await encerrarCobrancasAnteriores({ fechamentoId: 11, versaoId: 901, config: CONFIG });
    expect(asaasMock.cancelPayment).not.toHaveBeenCalled();
    expect(dbMock.cobrancaFechamento.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 4, status: "ativa" } }));
  });

  it("DELETE recusado pelo Asaas (pagaram no meio) → erro, nada marcado", async () => {
    dbMock.cobrancaFechamento.findMany.mockResolvedValue([ativa()]);
    asaasMock.cancelPayment.mockRejectedValue(new Error("[invalid_action] Cobrança recebida não pode ser removida"));
    await expect(encerrarCobrancasAnteriores({ fechamentoId: 11, versaoId: 901, config: CONFIG })).rejects.toThrow();
    expect(dbMock.cobrancaFechamento.updateMany).not.toHaveBeenCalled();
  });

  it("só olha as ativas de outras versões", async () => {
    await encerrarCobrancasAnteriores({ fechamentoId: 11, versaoId: 901, config: CONFIG });
    expect(dbMock.cobrancaFechamento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { fechamentoId: 11, status: "ativa", versaoId: { not: 901 } } })
    );
  });
});

describe("garantirCobrancaPix", () => {
  const base = {
    fechamentoId: 11,
    versaoId: 901,
    versao: 2,
    empresaId: 7,
    competencia: "2026-10",
    empresaNome: "Amazon Five",
    customerId: "cus_9",
    totalFinal: 450,
    diaPix: 15,
    config: CONFIG,
    hoje: "2026-10-01",
  };

  it("cria a cobrança pelo saldo, com a referência da versão, grava e busca o QR", async () => {
    const r = await garantirCobrancaPix(base);
    expect(asaasMock.createPixPayment).toHaveBeenCalledWith(
      { customerId: "cus_9", value: 450, dueDate: "2026-10-15", description: expect.stringContaining("outubro de 2026"), externalReference: "FEC-7-2026-10-v2" },
      CONFIG
    );
    expect(dbMock.cobrancaFechamento.create).toHaveBeenCalledWith({
      data: {
        fechamentoId: 11,
        versaoId: 901,
        asaasPaymentId: "pay_v2",
        externalReference: "FEC-7-2026-10-v2",
        valor: 450,
        vencimento: new Date("2026-10-15T00:00:00Z"),
        status: "ativa",
      },
      select: { id: true },
    });
    // grava antes de buscar o QR: se o QR falhar, a cobrança criada não fica órfã
    expect(dbMock.cobrancaFechamento.create.mock.invocationCallOrder[0]).toBeLessThan(asaasMock.getPixQrCode.mock.invocationCallOrder[0]);
    expect(dbMock.cobrancaFechamento.update).toHaveBeenCalledWith({
      where: { id: 8 },
      data: { pixCopiaECola: "000201PIXV2", qrCodePng: expect.any(Uint8Array) },
    });
    expect(r.pix).toMatchObject({ copiaECola: "000201PIXV2", valor: 450, identificacao: "FEC-7-2026-10-v2" });
    expect(Buffer.from(r.pix!.qrPng).toString("base64")).toBe(QR_PNG_B64);
  });

  it("desconta o que já foi recebido (só confirmado)", async () => {
    dbMock.recebimentoFechamento.findMany.mockResolvedValue([{ valor: 150, status: "confirmado" }]);
    const r = await garantirCobrancaPix(base);
    expect(dbMock.recebimentoFechamento.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { fechamentoId: 11, status: "confirmado" } }));
    expect(asaasMock.createPixPayment.mock.calls[0][0].value).toBe(300);
    expect(r).toMatchObject({ recebido: 150, saldo: 300 });
  });

  it("saldo ≤ 0 → não cria cobrança", async () => {
    dbMock.recebimentoFechamento.findMany.mockResolvedValue([{ valor: 450, status: "confirmado" }]);
    const r = await garantirCobrancaPix(base);
    expect(r.pix).toBeNull();
    expect(asaasMock.createPixPayment).not.toHaveBeenCalled();
  });

  it("dia do Pix já passou → vence hoje", async () => {
    await garantirCobrancaPix({ ...base, hoje: "2026-10-20" });
    expect(asaasMock.createPixPayment.mock.calls[0][0].dueDate).toBe("2026-10-20");
  });

  it("reenvio da mesma versão (e-mail falhou antes) → reaproveita a cobrança ativa, sem criar outra", async () => {
    dbMock.cobrancaFechamento.findMany.mockResolvedValue([
      ativa({ id: 8, versaoId: 901, asaasPaymentId: "pay_v2", valor: 450, externalReference: "FEC-7-2026-10-v2", pixCopiaECola: "000201PIXV2" }),
    ]);
    const r = await garantirCobrancaPix(base);
    expect(asaasMock.createPixPayment).not.toHaveBeenCalled();
    expect(asaasMock.getPixQrCode).not.toHaveBeenCalled();
    expect(r.pix).toMatchObject({ copiaECola: "000201PIXV2", valor: 450 });
  });

  it("reaproveitada sem QR gravado (QR falhou antes) → busca o QR de novo", async () => {
    dbMock.cobrancaFechamento.findMany.mockResolvedValue([
      ativa({ id: 8, versaoId: 901, asaasPaymentId: "pay_v2", valor: 450, pixCopiaECola: null, qrCodePng: null }),
    ]);
    await garantirCobrancaPix(base);
    expect(asaasMock.createPixPayment).not.toHaveBeenCalled();
    expect(asaasMock.getPixQrCode).toHaveBeenCalledWith(CONFIG, "pay_v2");
  });

  it("ativa da mesma versão com valor diferente do saldo → encerra e cria pelo saldo novo", async () => {
    dbMock.cobrancaFechamento.findMany.mockResolvedValue([ativa({ id: 8, versaoId: 901, asaasPaymentId: "pay_v2", valor: 450 })]);
    dbMock.recebimentoFechamento.findMany.mockResolvedValue([{ valor: 50, status: "confirmado" }]);
    await garantirCobrancaPix(base);
    expect(asaasMock.cancelPayment).toHaveBeenCalledWith(CONFIG, "pay_v2");
    expect(asaasMock.createPixPayment.mock.calls[0][0].value).toBe(400);
  });

  it("gravar falha (outra ativa no fechamento) → cancela a cobrança recém-criada e recusa", async () => {
    dbMock.cobrancaFechamento.create.mockRejectedValue(Object.assign(new Error("unique"), { code: "P2002" }));
    await expect(garantirCobrancaPix(base)).rejects.toThrow(/Recarregue/);
    expect(asaasMock.cancelPayment).toHaveBeenCalledWith(CONFIG, "pay_v2");
  });
});

describe("sincronizarCobrancasAtivas (webhook perdido)", () => {
  it("consulta cada cobrança ativa no Asaas e processa as pagas ou estornadas; erro numa não para as outras", async () => {
    dbMock.cobrancaFechamento.findMany.mockResolvedValue([ativa({ id: 4, asaasPaymentId: "pay_a" }), ativa({ id: 5, asaasPaymentId: "pay_b" }), ativa({ id: 6, asaasPaymentId: "pay_c" })]);
    asaasMock.getPayment.mockImplementation(async (_c: unknown, id: string) => {
      if (id === "pay_a") return { id, status: "RECEIVED", value: 600 };
      if (id === "pay_b") throw new Error("timeout");
      return { id, status: "PENDING" };
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await sincronizarCobrancasAtivas(CONFIG);
    log.mockRestore();
    expect(dbMock.cobrancaFechamento.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: "ativa" } }));
    expect(recMock.processarPagamentoFechamento).toHaveBeenCalledTimes(1);
    expect(recMock.processarPagamentoFechamento).toHaveBeenCalledWith({ id: "pay_a", status: "RECEIVED", value: 600 }, null);
    expect(asaasMock.cancelPayment).not.toHaveBeenCalled();
    expect(r).toEqual({ cobrancas: 3, processadas: 1, erros: 1 });
  });
});
