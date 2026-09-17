// Editar uma venda nao pode desfazer a antecipacao das parcelas (2026-09-11).
//
// `updateVenda` apaga e recria as linhas de parcelas_vencimento a cada save.
// Copiava `paga` e `dataPagamento` da linha antiga, mas nao `antecipada`: uma
// parcela ja antecipada na Prudent voltava a `false`, e a fila e o resumo por
// comprador passavam a oferece-la de novo para antecipar. Com a conciliacao da
// planilha (200 parcelas marcadas), qualquer edicao de venda atingiria dado real.
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mesmo padrao de mocks de antecipacao-custo-edicao.test.ts.
const dbMock = {
  usuario: { findFirst: vi.fn() },
  // findUnique sem valor = venda anterior desconhecida: valorParcela nao e tocado (fora do escopo deste teste).
  venda: { update: vi.fn(), findUnique: vi.fn() },
  itemVenda: { deleteMany: vi.fn(), createMany: vi.fn() },
  parcelaVencimento: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
  despesa: { create: vi.fn() },
};
const auditMock = { createAuditLog: vi.fn() };
const emailMock = { sendVendaNotification: vi.fn() };
const cacheMock = { revalidatePath: vi.fn() };

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/audit", () => auditMock);
vi.mock("@/lib/email", () => emailMock);
vi.mock("next/cache", () => cacheMock);
// updateVenda exige sessao desde 2026-09-16; guarda e recalculo de consignado nao sao o que este teste mede.
vi.mock("@/lib/guards", () => ({ requireSessionOrThrow: vi.fn(async () => ({ id: 1, username: "vendedor-teste", role: "vendedor" })) }));
vi.mock("@/lib/consignado-db", () => ({ recalcularConsignadoSeguro: vi.fn() }));

const { updateVenda } = await import("@/app/(app)/historico/actions");
const { FORMA_PAGAMENTO } = await import("@/lib/forma-pagamento");

function formVenda(): FormData {
  const fd = new FormData();
  fd.set("id", "10");
  fd.set("data", "2026-01-01");
  fd.set("vendedor", "vendedor-teste");
  fd.set("frete", "0");
  fd.set("envio", "0");
  fd.set("desconto", "0");
  fd.set("parcelas", "3");
  fd.set("formaPagamento", FORMA_PAGAMENTO.DESCONTO_FOLHA);
  fd.set(
    "itensJson",
    JSON.stringify([{ produtoNome: "Produto X", custoProduto: 600, valorVenda: 900, quantidade: 1, subtotal: 900 }])
  );
  fd.set(
    "parcelasVencimento",
    JSON.stringify([
      { numeroParcela: 1, dataVencimento: "2026-02-10", valorParcela: 300 },
      { numeroParcela: 2, dataVencimento: "2026-03-10", valorParcela: 300 },
      { numeroParcela: 3, dataVencimento: "2026-04-10", valorParcela: 300 },
    ])
  );
  return fd;
}

function linhaExistente(numeroParcela: number, antecipada: boolean) {
  return {
    numeroParcela,
    paga: false,
    dataPagamento: null,
    dataVencimento: new Date(`2026-0${numeroParcela + 1}-10T00:00:00.000Z`),
    valorParcela: 300,
    antecipada,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.usuario.findFirst.mockResolvedValue({ id: 1 });
  dbMock.venda.update.mockResolvedValue({ id: 10 });
});

describe("updateVenda — preserva a baixa das parcelas (2026-09-16)", () => {
  it("origem, cobranca do Asaas e usuario da baixa sobrevivem a recriacao das linhas", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([
      { ...linhaExistente(1, false), paga: true, dataPagamento: new Date("2026-02-09T00:00:00Z"), origemPagamento: "asaas", asaasPaymentId: "pay_1", baixaPor: null },
      { ...linhaExistente(2, false), paga: true, dataPagamento: new Date("2026-03-09T00:00:00Z"), origemPagamento: "manual", asaasPaymentId: null, baixaPor: "andre" },
      linhaExistente(3, false),
    ]);

    await updateVenda(formVenda());

    const recriadas = dbMock.parcelaVencimento.createMany.mock.calls[0][0].data as Record<string, unknown>[];
    const porNumero = new Map(recriadas.map((p) => [p.numeroParcela, p]));
    expect(porNumero.get(1)).toMatchObject({ paga: true, origemPagamento: "asaas", asaasPaymentId: "pay_1", baixaPor: null });
    expect(porNumero.get(2)).toMatchObject({ paga: true, origemPagamento: "manual", asaasPaymentId: null, baixaPor: "andre" });
    expect(porNumero.get(3)).toMatchObject({ paga: false, origemPagamento: null, asaasPaymentId: null, baixaPor: null });
  });

  it("numero de parcela repetido no payload nao duplica o id da cobranca (unico no banco)", async () => {
    // Sem isto o createMany lancava P2002 depois do deleteMany, o catch engolia e a venda
    // ficava sem nenhuma linha de parcela — pagas inclusive.
    dbMock.parcelaVencimento.findMany.mockResolvedValue([
      { ...linhaExistente(1, false), paga: true, origemPagamento: "asaas", asaasPaymentId: "pay_1", baixaPor: null },
      linhaExistente(2, false),
      linhaExistente(3, false),
    ]);
    const fd = formVenda();
    fd.set(
      "parcelasVencimento",
      JSON.stringify([
        { numeroParcela: 1, dataVencimento: "2026-02-10", valorParcela: 300 },
        { numeroParcela: 1, dataVencimento: "2026-03-10", valorParcela: 300 },
        { numeroParcela: 3, dataVencimento: "2026-04-10", valorParcela: 300 },
      ]),
    );

    await updateVenda(fd);

    const recriadas = dbMock.parcelaVencimento.createMany.mock.calls[0][0].data as { asaasPaymentId: string | null }[];
    expect(recriadas.filter((p) => p.asaasPaymentId === "pay_1")).toHaveLength(1);
  });
});

describe("updateVenda — preserva o flag antecipada das parcelas", () => {
  it("a parcela antecipada continua antecipada depois de salvar a edição", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([
      linhaExistente(1, true),
      linhaExistente(2, true),
      linhaExistente(3, false),
    ]);

    await updateVenda(formVenda());

    expect(dbMock.parcelaVencimento.createMany).toHaveBeenCalledTimes(1);
    const recriadas = dbMock.parcelaVencimento.createMany.mock.calls[0][0].data as {
      numeroParcela: number;
      antecipada?: boolean;
    }[];
    const porNumero = new Map(recriadas.map((p) => [p.numeroParcela, p.antecipada]));
    expect(porNumero.get(1)).toBe(true);
    expect(porNumero.get(2)).toBe(true);
    expect(porNumero.get(3)).toBe(false);
  });

  it("reduzir o número de parcelas não apaga parcela antecipada — recusa o save", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([
      linhaExistente(1, true),
      linhaExistente(2, true),
      linhaExistente(3, true),
    ]);
    const fd = formVenda();
    fd.set("parcelas", "2");
    fd.set(
      "parcelasVencimento",
      JSON.stringify([
        { numeroParcela: 1, dataVencimento: "2026-02-10", valorParcela: 450 },
        { numeroParcela: 2, dataVencimento: "2026-03-10", valorParcela: 450 },
      ])
    );

    const r = (await updateVenda(fd)) as { success: boolean; error?: string };

    expect(r.success).toBe(false);
    expect(r.error).toContain("antecipada");
    expect(dbMock.parcelaVencimento.deleteMany).not.toHaveBeenCalled();
  });

  it("virar pagamento único não apaga parcelas antecipadas — recusa o save", async () => {
    // Caso real: venda 52, cabeçalho em 1 parcela com 2 linhas, uma marcada pela conciliação.
    dbMock.parcelaVencimento.findMany.mockResolvedValue([linhaExistente(1, true), linhaExistente(2, false)]);
    const fd = formVenda();
    fd.set("parcelas", "1");
    fd.delete("parcelasVencimento");

    const r = (await updateVenda(fd)) as { success: boolean; error?: string };

    expect(r.success).toBe(false);
    expect(r.error).toContain("antecipada");
    expect(dbMock.parcelaVencimento.deleteMany).not.toHaveBeenCalled();
  });

  it("com antecipação registrada nas parcelas, recalcula o flag da venda: algumas → 3", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([linhaExistente(1, true), linhaExistente(2, true)]);

    await updateVenda(formVenda()); // 3 parcelas: a 3 é nova, então 2 de 3 antecipadas

    expect(dbMock.venda.update.mock.calls[0][0].data.antecipada).toBe(3);
  });

  it("com antecipação registrada nas parcelas, recalcula o flag da venda: todas → 1", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([
      linhaExistente(1, true),
      linhaExistente(2, true),
      linhaExistente(3, true),
    ]);

    await updateVenda(formVenda());

    expect(dbMock.venda.update.mock.calls[0][0].data.antecipada).toBe(1);
  });

  it("venda sem antecipação registrada nas parcelas não tem o flag mexido — preserva as vendas legadas", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([linhaExistente(1, false), linhaExistente(2, false)]);

    await updateVenda(formVenda());

    expect("antecipada" in dbMock.venda.update.mock.calls[0][0].data).toBe(false);
  });

  it("parcela nova (número que não existia) nasce não antecipada", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([linhaExistente(1, true), linhaExistente(2, true)]);

    await updateVenda(formVenda());

    const recriadas = dbMock.parcelaVencimento.createMany.mock.calls[0][0].data as {
      numeroParcela: number;
      antecipada?: boolean;
    }[];
    expect(recriadas.find((p) => p.numeroParcela === 3)?.antecipada).toBe(false);
  });
});
