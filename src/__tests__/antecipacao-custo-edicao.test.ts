import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks — mesmo padrao de fornecedores-post-route.test.ts: objeto local de
// mock, nunca importar `prisma`/`audit`/`email` reais no teste.
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

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.usuario.findFirst.mockResolvedValue({ id: 1 });
  dbMock.venda.update.mockResolvedValue({ id: 10 });
  dbMock.parcelaVencimento.findMany.mockResolvedValue([]);
});

/**
 * Mesmo caso dourado da Task 1: venda de R$ 4.000 em 4 parcelas de R$ 1.000
 * vencendo 31/61/91/121 dias apos a data da venda (2026-01-01), custo dos
 * itens R$ 3.000, sem nota. `formaPagamento` e sobrescrito por caso.
 */
function formVendaDourada(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("id", "10");
  fd.set("data", "2026-01-01");
  fd.set("vendedor", "vendedor-teste");
  fd.set("frete", "0");
  fd.set("envio", "0");
  fd.set("desconto", "0");
  fd.set("parcelas", "4");
  fd.set(
    "itensJson",
    JSON.stringify([
      { produtoNome: "Produto X", custoProduto: 3000, valorVenda: 4000, quantidade: 1, subtotal: 4000 },
    ])
  );
  fd.set(
    "parcelasVencimento",
    JSON.stringify([
      { numeroParcela: 1, dataVencimento: "2026-01-31", valorParcela: 1000 },
      { numeroParcela: 2, dataVencimento: "2026-03-02", valorParcela: 1000 },
      { numeroParcela: 3, dataVencimento: "2026-04-01", valorParcela: 1000 },
      { numeroParcela: 4, dataVencimento: "2026-05-01", valorParcela: 1000 },
    ])
  );
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
}

describe("updateVenda — recalculo do custo de antecipacao Prudent na edicao", () => {
  it("Teste 1: mantendo DESCONTO_FOLHA, o update grava taxaFinanceiraValor 416.78 e lucroLiquido 583.22", async () => {
    await updateVenda(formVendaDourada({ formaPagamento: FORMA_PAGAMENTO.DESCONTO_FOLHA }));

    expect(dbMock.venda.update).toHaveBeenCalledTimes(1);
    const data = dbMock.venda.update.mock.calls[0][0].data;
    expect(data.taxaFinanceiraValor).toBe(416.78);
    expect(data.lucroLiquido).toBe(583.22);
  });

  it("Teste 2 (a stale que o review do Uber pegou): editando para PIX grava taxaFinanceiraValor null — nunca deixa o 416.78 velho — e lucroLiquido 1000", async () => {
    await updateVenda(formVendaDourada({ formaPagamento: FORMA_PAGAMENTO.PIX }));

    const data = dbMock.venda.update.mock.calls[0][0].data;
    expect(data.taxaFinanceiraValor).toBeNull();
    expect(data.lucroLiquido).toBe(1000);
  });

  it("Teste 3 (caminho inverso): venda em PIX editada para DESCONTO_FOLHA passa a gravar 416.78", async () => {
    await updateVenda(formVendaDourada({ formaPagamento: FORMA_PAGAMENTO.DESCONTO_FOLHA }));

    const data = dbMock.venda.update.mock.calls[0][0].data;
    expect(data.taxaFinanceiraValor).toBe(416.78);
  });

  it("Teste 4 (round-trip idempotente): chamar updateVenda duas vezes com o mesmo FormData produz o mesmo resultado nas duas chamadas", async () => {
    const fd1 = formVendaDourada({ formaPagamento: FORMA_PAGAMENTO.DESCONTO_FOLHA });
    await updateVenda(fd1);
    const primeira = dbMock.venda.update.mock.calls[0][0].data;

    vi.clearAllMocks();
    dbMock.usuario.findFirst.mockResolvedValue({ id: 1 });
    dbMock.venda.update.mockResolvedValue({ id: 10 });
    dbMock.parcelaVencimento.findMany.mockResolvedValue([]);

    const fd2 = formVendaDourada({ formaPagamento: FORMA_PAGAMENTO.DESCONTO_FOLHA });
    await updateVenda(fd2);
    const segunda = dbMock.venda.update.mock.calls[0][0].data;

    expect(segunda.taxaFinanceiraValor).toBe(primeira.taxaFinanceiraValor);
    expect(segunda.lucroLiquido).toBe(primeira.lucroLiquido);
  });

  it("Teste 5 (fonte das parcelas quando o form nao manda): sem parcelasVencimento, a action consulta prisma.parcelaVencimento.findMany e usa essas datas -> 416.78, nao o fallback de 30/60/90", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([
      { dataVencimento: new Date("2026-01-31T00:00:00.000Z"), valorParcela: 1000 },
      { dataVencimento: new Date("2026-03-02T00:00:00.000Z"), valorParcela: 1000 },
      { dataVencimento: new Date("2026-04-01T00:00:00.000Z"), valorParcela: 1000 },
      { dataVencimento: new Date("2026-05-01T00:00:00.000Z"), valorParcela: 1000 },
    ]);

    const fd = formVendaDourada({ formaPagamento: FORMA_PAGAMENTO.DESCONTO_FOLHA });
    fd.delete("parcelasVencimento");
    await updateVenda(fd);

    const data = dbMock.venda.update.mock.calls[0][0].data;
    expect(data.taxaFinanceiraValor).toBe(416.78);
  });

  it("Teste 6: prisma.despesa.create nunca e chamado em nenhum dos casos acima", async () => {
    await updateVenda(formVendaDourada({ formaPagamento: FORMA_PAGAMENTO.DESCONTO_FOLHA }));
    await updateVenda(formVendaDourada({ formaPagamento: FORMA_PAGAMENTO.PIX }));

    expect(dbMock.despesa.create).not.toHaveBeenCalled();
  });

  it("Teste 7: revalidatePath foi chamado para /financeiro (o DRE atualiza sem reload)", async () => {
    await updateVenda(formVendaDourada({ formaPagamento: FORMA_PAGAMENTO.DESCONTO_FOLHA }));

    expect(cacheMock.revalidatePath).toHaveBeenCalledWith("/financeiro");
  });

  it("Teste 8 (nao regressao): venda em PIX sem nada a ver com Prudent continua com o mesmo lucroLiquido que a action ja produzia antes — numero dourado literal", async () => {
    const fd = new FormData();
    fd.set("id", "20");
    fd.set("data", "2026-01-01");
    fd.set("vendedor", "vendedor-teste");
    fd.set("frete", "0");
    fd.set("envio", "0");
    fd.set("desconto", "0");
    fd.set("parcelas", "1");
    fd.set("formaPagamento", FORMA_PAGAMENTO.PIX);
    fd.set(
      "itensJson",
      JSON.stringify([
        { produtoNome: "Produto Y", custoProduto: 200, valorVenda: 500, quantidade: 1, subtotal: 500 },
      ])
    );

    await updateVenda(fd);

    const data = dbMock.venda.update.mock.calls[0][0].data;
    // lucro = total(500) - (totalCusto(200) + envio(0) + notaDesc(0)) = 300 — o
    // mesmo numero que a action ja produzia antes desta mudanca, porque a venda
    // nunca vai para a Prudent.
    expect(data.lucroLiquido).toBe(300);
    expect(data.taxaFinanceiraValor).toBeNull();
  });
});
