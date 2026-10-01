// Recebimentos do fechamento (Fase 6, spec 2026-09-30 §5.2 e §5.3): webhook do Asaas idempotente,
// pagamento de cobrança antiga, parcial sem liquidar, total liquidando (paga só as não antecipadas),
// estorno desfazendo, manual em dois passos. Prisma mockado; nenhuma chamada ao Asaas.
import { describe, it, expect, vi, beforeEach } from "vitest";

const dbMock = {
  fechamento: { findUnique: vi.fn(), updateMany: vi.fn() },
  cobrancaFechamento: { findUnique: vi.fn(), updateMany: vi.fn() },
  recebimentoFechamento: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
  fechamentoVersao: { count: vi.fn() },
  parcelaVencimento: { updateMany: vi.fn() },
  usuario: { findMany: vi.fn() },
  notificacao: { createMany: vi.fn() },
  arquivoFinanceiro: { create: vi.fn() },
  $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(dbMock)),
};
vi.mock("@/lib/db", () => ({ prisma: dbMock }));

const {
  processarPagamentoFechamento,
  ehCobrancaDeFechamento,
  registrarRecebimentoManual,
  confirmarRecebimento,
  estornarRecebimento,
  recalcularFechamento,
  alertasDoRecalculo,
} = await import("@/lib/recebimento-fechamento-db");

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

type Rec = { id?: number; valor: number; status: string; dataRecebimento: Date };

/** Estado "do banco" que os mocks leem. */
let fechamento: { id: number; status: string; versaoAtual: number; competencia: string; totalFinal: number; enviada?: boolean };
let recebimentos: Rec[];

function fechamentoLido() {
  return {
    id: fechamento.id,
    status: fechamento.status,
    versaoAtual: fechamento.versaoAtual,
    competencia: fechamento.competencia,
    empresaParceira: { nome: "Amazon Five" },
    versoes: [
      { numero: fechamento.versaoAtual, totalFinal: fechamento.totalFinal, enviadaEm: fechamento.enviada === false ? null : new Date() },
    ],
  };
}

const PAGAMENTO = {
  id: "pay_v1",
  status: "RECEIVED",
  value: 600,
  externalReference: "FEC-7-2026-10-v1",
  paymentDate: "2026-10-14",
};

beforeEach(() => {
  vi.clearAllMocks();
  fechamento = { id: 11, status: "enviado", versaoAtual: 1, competencia: "2026-10", totalFinal: 600 };
  recebimentos = [];
  dbMock.fechamento.findUnique.mockImplementation(async () => fechamentoLido());
  dbMock.fechamento.updateMany.mockImplementation(async (args: { where: { status?: string }; data: { status?: string } }) => {
    if (args.where.status && args.where.status !== fechamento.status) return { count: 0 };
    if (args.data.status) fechamento.status = args.data.status;
    return { count: 1 };
  });
  dbMock.cobrancaFechamento.findUnique.mockResolvedValue({ id: 5, fechamentoId: 11, status: "ativa" });
  dbMock.cobrancaFechamento.updateMany.mockResolvedValue({ count: 1 });
  dbMock.recebimentoFechamento.findUnique.mockResolvedValue(null);
  dbMock.recebimentoFechamento.findMany.mockImplementation(async (args: { where: { status?: string } }) =>
    recebimentos.filter((r) => !args.where.status || r.status === args.where.status)
  );
  dbMock.recebimentoFechamento.create.mockImplementation(async (args: { data: Rec }) => {
    recebimentos.push({ ...args.data, id: 100 + recebimentos.length });
    return { id: 99 };
  });
  dbMock.recebimentoFechamento.updateMany.mockResolvedValue({ count: 1 });
  dbMock.fechamentoVersao.count.mockResolvedValue(1);
  dbMock.parcelaVencimento.updateMany.mockResolvedValue({ count: 2 });
  dbMock.usuario.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
  dbMock.notificacao.createMany.mockResolvedValue({ count: 2 });
  dbMock.arquivoFinanceiro.create.mockResolvedValue({ id: 70, sha256: "x" });
});

describe("ehCobrancaDeFechamento", () => {
  it("referência FEC- basta, sem consultar o banco", async () => {
    expect(await ehCobrancaDeFechamento({ id: "pay_1", externalReference: "FEC-7-2026-10-v1" })).toBe(true);
    expect(dbMock.cobrancaFechamento.findUnique).not.toHaveBeenCalled();
  });
  it("sem FEC-: é de fechamento se a cobrança está gravada", async () => {
    expect(await ehCobrancaDeFechamento({ id: "pay_1", externalReference: null })).toBe(true);
    dbMock.cobrancaFechamento.findUnique.mockResolvedValue(null);
    expect(await ehCobrancaDeFechamento({ id: "pay_2", externalReference: "240" })).toBe(false);
  });
});

describe("processarPagamentoFechamento — pago", () => {
  it("registra um recebimento confirmado, marca a cobrança paga e liquida (valor total)", async () => {
    const r = await processarPagamentoFechamento(PAGAMENTO, "PAYMENT_RECEIVED");
    expect(r.acao).toBe("registrado");
    expect(dbMock.recebimentoFechamento.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fechamentoId: 11,
        cobrancaId: 5,
        origem: "asaas",
        valor: 600,
        dataRecebimento: d("2026-10-14"),
        asaasPaymentId: "pay_v1",
        status: "confirmado",
      }),
    });
    expect(dbMock.cobrancaFechamento.updateMany).toHaveBeenCalledWith({
      where: { id: 5, status: { not: "paga" } },
      data: { status: "paga" },
    });
    expect(fechamento.status).toBe("pago");
    // liquida todas as reservadas; paga só as não antecipadas, com a origem do fechamento
    expect(dbMock.parcelaVencimento.updateMany).toHaveBeenCalledWith({
      where: { fechamentoId: 11, liquidadaEm: null },
      data: { liquidadaEm: d("2026-10-14") },
    });
    expect(dbMock.parcelaVencimento.updateMany).toHaveBeenCalledWith({
      where: { fechamentoId: 11, antecipada: false, paga: false },
      data: { paga: true, dataPagamento: d("2026-10-14"), origemPagamento: "pix_fechamento" },
    });
  });

  it("trava o fechamento antes de ler os recebimentos (dois eventos em paralelo)", async () => {
    await processarPagamentoFechamento(PAGAMENTO, null);
    const trava = dbMock.fechamento.updateMany.mock.invocationCallOrder[0];
    expect(trava).toBeLessThan(dbMock.recebimentoFechamento.findUnique.mock.invocationCallOrder[0]);
    expect(trava).toBeLessThan(dbMock.recebimentoFechamento.findMany.mock.invocationCallOrder[0]);
  });

  it("o mesmo evento duas vezes → um recebimento só", async () => {
    dbMock.recebimentoFechamento.findUnique.mockResolvedValue({ id: 99, status: "confirmado", fechamentoId: 11 });
    const r = await processarPagamentoFechamento(PAGAMENTO, "PAYMENT_RECEIVED");
    expect(r.acao).toBe("ja_registrado");
    expect(dbMock.recebimentoFechamento.create).not.toHaveBeenCalled();
    expect(dbMock.parcelaVencimento.updateMany).not.toHaveBeenCalled();
  });

  it("P2002 no asaasPaymentId (corrida entre pods) → já registrado, sem erro", async () => {
    dbMock.recebimentoFechamento.create.mockRejectedValue(Object.assign(new Error("unique"), { code: "P2002" }));
    const r = await processarPagamentoFechamento(PAGAMENTO, null);
    expect(r.acao).toBe("ja_registrado");
  });

  it("parcial → pago_parcial, sem liquidar nenhuma parcela, com alerta", async () => {
    const r = await processarPagamentoFechamento({ ...PAGAMENTO, value: 200 }, null);
    expect(r.acao).toBe("registrado");
    expect(fechamento.status).toBe("pago_parcial");
    expect(dbMock.parcelaVencimento.updateMany).not.toHaveBeenCalled();
    const msgs = dbMock.notificacao.createMany.mock.calls.flatMap((c) => c[0].data.map((n: { mensagem: string }) => n.mensagem));
    expect(msgs.some((m: string) => m.startsWith("[Alerta] Pix parcial") && /R\$\s400,00/.test(m))).toBe(true);
  });

  it("pagamento da cobrança da versão 1 depois do envio da versão 2 → entra, recalcula e sinaliza o excedente", async () => {
    fechamento = { id: 11, status: "enviado", versaoAtual: 2, competencia: "2026-10", totalFinal: 500 };
    dbMock.cobrancaFechamento.findUnique.mockResolvedValue({ id: 4, fechamentoId: 11, status: "cancelada" });
    const r = await processarPagamentoFechamento(PAGAMENTO, null);
    expect(r.acao).toBe("registrado");
    expect(fechamento.status).toBe("pago");
    expect(dbMock.cobrancaFechamento.updateMany).toHaveBeenCalledWith({ where: { id: 4, status: { not: "paga" } }, data: { status: "paga" } });
    const msgs = dbMock.notificacao.createMany.mock.calls.flatMap((c) => c[0].data.map((n: { mensagem: string }) => n.mensagem));
    expect(msgs.some((m: string) => m.startsWith("[Alerta] Crédito a resolver") && /R\$\s100,00/.test(m))).toBe(true);
  });

  it("cobrança não gravada mas com referência FEC- → acha o fechamento pela empresa e competência", async () => {
    dbMock.cobrancaFechamento.findUnique.mockResolvedValue(null);
    const r = await processarPagamentoFechamento(PAGAMENTO, null);
    expect(r.acao).toBe("registrado");
    expect(dbMock.fechamento.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { empresaParceiraId_competencia: { empresaParceiraId: 7, competencia: "2026-10" } } })
    );
    expect(dbMock.recebimentoFechamento.create.mock.calls[0][0].data.cobrancaId).toBeNull();
  });

  it("referência de fechamento inexistente → ignorado, nada gravado", async () => {
    dbMock.cobrancaFechamento.findUnique.mockResolvedValue(null);
    dbMock.fechamento.findUnique.mockResolvedValue(null);
    const r = await processarPagamentoFechamento(PAGAMENTO, null);
    expect(r.acao).toBe("ignorado");
    expect(dbMock.recebimentoFechamento.create).not.toHaveBeenCalled();
  });

  it("sem valor numérico → ignorado, nada gravado", async () => {
    const r = await processarPagamentoFechamento({ ...PAGAMENTO, value: undefined }, null);
    expect(r.acao).toBe("ignorado");
    expect(dbMock.recebimentoFechamento.create).not.toHaveBeenCalled();
  });

  it("fechamento reaberto (em preparação): o dinheiro entra, o status não muda e nada é liquidado", async () => {
    fechamento.status = "em_preparacao";
    const r = await processarPagamentoFechamento(PAGAMENTO, null);
    expect(r.acao).toBe("registrado");
    expect(fechamento.status).toBe("em_preparacao");
    expect(dbMock.parcelaVencimento.updateMany).not.toHaveBeenCalled();
  });

  it("cobrança pendente ou vencida → ignorado", async () => {
    for (const status of ["PENDING", "OVERDUE"]) {
      expect((await processarPagamentoFechamento({ ...PAGAMENTO, status }, null)).acao).toBe("ignorado");
    }
    expect(dbMock.recebimentoFechamento.create).not.toHaveBeenCalled();
  });
});

describe("processarPagamentoFechamento — estorno", () => {
  it("estorno depois de liquidado desfaz a liquidação e o paga do Pix, e alerta", async () => {
    fechamento.status = "pago";
    recebimentos = [{ id: 99, valor: 600, status: "confirmado", dataRecebimento: d("2026-10-14") }];
    dbMock.recebimentoFechamento.findUnique.mockResolvedValue({ id: 99, status: "confirmado", fechamentoId: 11 });
    dbMock.recebimentoFechamento.updateMany.mockImplementation(async () => {
      recebimentos[0].status = "estornado";
      return { count: 1 };
    });

    const r = await processarPagamentoFechamento({ ...PAGAMENTO, status: "REFUNDED" }, "PAYMENT_REFUNDED");

    expect(r.acao).toBe("estornado");
    expect(dbMock.recebimentoFechamento.updateMany).toHaveBeenCalledWith({
      where: { id: 99, status: "confirmado" },
      data: { status: "estornado", estornadoEm: expect.any(Date) },
    });
    expect(fechamento.status).toBe("enviado");
    expect(dbMock.parcelaVencimento.updateMany).toHaveBeenCalledWith({
      where: { fechamentoId: 11, liquidadaEm: { not: null } },
      data: { liquidadaEm: null },
    });
    expect(dbMock.parcelaVencimento.updateMany).toHaveBeenCalledWith({
      where: { fechamentoId: 11, paga: true, origemPagamento: "pix_fechamento" },
      data: { paga: false, dataPagamento: null, origemPagamento: null },
    });
    const msgs = dbMock.notificacao.createMany.mock.calls.flatMap((c) => c[0].data.map((n: { mensagem: string }) => n.mensagem));
    expect(msgs.some((m: string) => m.startsWith("[Alerta] Recebimento estornado"))).toBe(true);
  });

  it("estorno sem recebimento gravado → ignorado", async () => {
    const r = await processarPagamentoFechamento({ ...PAGAMENTO, status: "REFUNDED" }, null);
    expect(r.acao).toBe("ignorado");
    expect(dbMock.recebimentoFechamento.updateMany).not.toHaveBeenCalled();
  });

  it("estorno repetido (já estornado) → ignorado", async () => {
    dbMock.recebimentoFechamento.findUnique.mockResolvedValue({ id: 99, status: "estornado", fechamentoId: 11 });
    const r = await processarPagamentoFechamento({ ...PAGAMENTO, status: "CHARGEBACK_REQUESTED" }, null);
    expect(r.acao).toBe("ignorado");
  });

  it("estornado que volta a pago (chargeback revertido) → reativa o mesmo recebimento", async () => {
    dbMock.recebimentoFechamento.findUnique.mockResolvedValue({ id: 99, status: "estornado", fechamentoId: 11 });
    dbMock.recebimentoFechamento.updateMany.mockImplementation(async () => {
      recebimentos.push({ id: 99, valor: 600, status: "confirmado", dataRecebimento: d("2026-10-14") });
      return { count: 1 };
    });
    const r = await processarPagamentoFechamento(PAGAMENTO, null);
    expect(r.acao).toBe("reativado");
    expect(dbMock.recebimentoFechamento.updateMany).toHaveBeenCalledWith({
      where: { id: 99, status: "estornado" },
      data: { status: "confirmado", estornadoEm: null },
    });
    expect(dbMock.recebimentoFechamento.create).not.toHaveBeenCalled();
    expect(fechamento.status).toBe("pago");
  });
});

describe("recalcularFechamento", () => {
  it("valor final ≤ 0 não liquida nem muda o status (não inventa data)", async () => {
    fechamento.totalFinal = 0;
    const r = await recalcularFechamento(dbMock as never, 11);
    expect(r?.mudou).toBe(false);
    expect(fechamento.status).toBe("enviado");
    expect(dbMock.parcelaVencimento.updateMany).not.toHaveBeenCalled();
  });

  it("versão atual ainda não enviada (envio em andamento) → o dinheiro conta, mas o status não muda", async () => {
    fechamento.enviada = false;
    recebimentos = [{ valor: 600, status: "confirmado", dataRecebimento: d("2026-10-10") }];
    const r = await recalcularFechamento(dbMock as never, 11);
    expect(r?.mudou).toBe(false);
    expect(fechamento.status).toBe("enviado");
    expect(dbMock.parcelaVencimento.updateMany).not.toHaveBeenCalled();
  });

  it("liquida na data do último recebimento confirmado", async () => {
    recebimentos = [
      { valor: 200, status: "confirmado", dataRecebimento: d("2026-10-10") },
      { valor: 400, status: "confirmado", dataRecebimento: d("2026-10-16") },
      { valor: 999, status: "pendente", dataRecebimento: d("2026-10-20") },
    ];
    await recalcularFechamento(dbMock as never, 11);
    expect(fechamento.status).toBe("pago");
    expect(dbMock.parcelaVencimento.updateMany).toHaveBeenCalledWith({
      where: { fechamentoId: 11, liquidadaEm: null },
      data: { liquidadaEm: d("2026-10-16") },
    });
  });

  it("já pago e continua pago → não liquida de novo", async () => {
    fechamento.status = "pago";
    recebimentos = [{ valor: 600, status: "confirmado", dataRecebimento: d("2026-10-10") }];
    const r = await recalcularFechamento(dbMock as never, 11);
    expect(r?.mudou).toBe(false);
    expect(dbMock.parcelaVencimento.updateMany).not.toHaveBeenCalled();
  });
});

describe("alertasDoRecalculo", () => {
  it("sem mudança e sem excedente → nada", () => {
    expect(
      alertasDoRecalculo(
        { fechamentoId: 11, empresa: "X", competencia: "2026-10", antes: "enviado", depois: "enviado", mudou: false, recebido: 0, saldo: 600, excedente: 0, liquidou: false, desfez: false },
        "recebimento"
      )
    ).toEqual([]);
  });
});

describe("recebimento manual (dois passos)", () => {
  it("registrar grava pendente, com comprovante, e não mexe no status", async () => {
    const pdf = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], "comprovante.pdf", { type: "application/pdf" });
    const r = await registrarRecebimentoManual({ fechamentoId: 11, valor: 600, data: d("2026-10-14"), comprovante: pdf, usuario: "andre" });
    expect(r).toEqual({ recebimentoId: 99 });
    expect(dbMock.recebimentoFechamento.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fechamentoId: 11,
        origem: "manual",
        valor: 600,
        dataRecebimento: d("2026-10-14"),
        status: "pendente",
        registradoPor: "andre",
        comprovanteArquivoId: 70,
      }),
      select: { id: true },
    });
    expect(fechamento.status).toBe("enviado");
    expect(dbMock.parcelaVencimento.updateMany).not.toHaveBeenCalled();
  });

  it("pendente não conta: o fechamento continua enviado", async () => {
    recebimentos = [{ valor: 600, status: "pendente", dataRecebimento: d("2026-10-14") }];
    await recalcularFechamento(dbMock as never, 11);
    expect(fechamento.status).toBe("enviado");
  });

  it("registrar em fechamento nunca enviado → erro", async () => {
    dbMock.fechamentoVersao.count.mockResolvedValue(0);
    await expect(
      registrarRecebimentoManual({ fechamentoId: 11, valor: 600, data: d("2026-10-14"), comprovante: null, usuario: null })
    ).rejects.toThrow(/enviado/);
    expect(dbMock.recebimentoFechamento.create).not.toHaveBeenCalled();
  });

  it("comprovante que não é PDF nem imagem → erro antes de gravar", async () => {
    const txt = new File(["oi"], "a.txt", { type: "text/plain" });
    await expect(
      registrarRecebimentoManual({ fechamentoId: 11, valor: 600, data: d("2026-10-14"), comprovante: txt, usuario: null })
    ).rejects.toThrow();
    expect(dbMock.recebimentoFechamento.create).not.toHaveBeenCalled();
  });

  it("confirmar conta: pendente → confirmado (status no where) e liquida", async () => {
    dbMock.recebimentoFechamento.findUnique.mockResolvedValue({ id: 99, fechamentoId: 11, status: "pendente", origem: "manual" });
    dbMock.recebimentoFechamento.updateMany.mockImplementation(async () => {
      recebimentos.push({ valor: 600, status: "confirmado", dataRecebimento: d("2026-10-14") });
      return { count: 1 };
    });
    await confirmarRecebimento({ recebimentoId: 99, usuario: "maria" });
    expect(dbMock.recebimentoFechamento.updateMany).toHaveBeenCalledWith({
      where: { id: 99, status: "pendente" },
      data: { status: "confirmado", confirmadoPor: "maria", confirmadoEm: expect.any(Date) },
    });
    expect(fechamento.status).toBe("pago");
    expect(dbMock.parcelaVencimento.updateMany).toHaveBeenCalled();
  });

  it("confirmar duas vezes → erro na segunda (count 0)", async () => {
    dbMock.recebimentoFechamento.findUnique.mockResolvedValue({ id: 99, fechamentoId: 11, status: "pendente", origem: "manual" });
    dbMock.recebimentoFechamento.updateMany.mockResolvedValue({ count: 0 });
    await expect(confirmarRecebimento({ recebimentoId: 99, usuario: null })).rejects.toThrow(/Recarregue/);
  });

  it("estornar manual confirmado → estornado e recalcula", async () => {
    fechamento.status = "pago";
    dbMock.recebimentoFechamento.findUnique.mockResolvedValue({ id: 99, fechamentoId: 11, status: "confirmado", origem: "manual" });
    await estornarRecebimento({ recebimentoId: 99, usuario: "andre" });
    expect(dbMock.recebimentoFechamento.updateMany).toHaveBeenCalledWith({
      where: { id: 99, status: "confirmado" },
      data: { status: "estornado", estornadoEm: expect.any(Date) },
    });
    expect(fechamento.status).toBe("enviado");
  });

  it("estornar recebimento do Asaas pela tela → recusa (o estorno do Pix vem pelo Asaas)", async () => {
    dbMock.recebimentoFechamento.findUnique.mockResolvedValue({ id: 99, fechamentoId: 11, status: "confirmado", origem: "asaas" });
    await expect(estornarRecebimento({ recebimentoId: 99, usuario: null })).rejects.toThrow(/Asaas/);
    expect(dbMock.recebimentoFechamento.updateMany).not.toHaveBeenCalled();
  });
});
