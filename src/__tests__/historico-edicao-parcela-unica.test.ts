// Edição de venda em folha em 1x mantém a linha da parcela (2026-09-17).
// Ver docs/superpowers/specs/2026-09-17-parcela-venda-folha-1x.md.
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
const { MSG_CUSTO_ENVIO_ENTREGA, MSG_RETIRADA_COM_FRETE } = await import("@/lib/validations/venda");

function formUmaVez(forma: string = FORMA_PAGAMENTO.DESCONTO_FOLHA): FormData {
  const fd = new FormData();
  fd.set("id", "10");
  fd.set("data", "2026-08-15");
  fd.set("vendedor", "vendedor-teste");
  fd.set("frete", "0");
  fd.set("envio", "0");
  fd.set("desconto", "0");
  fd.set("parcelas", "1");
  fd.set("formaPagamento", forma);
  fd.set("itensJson", JSON.stringify([{ produtoNome: "Produto X", custoProduto: 100, valorVenda: 150, quantidade: 1, subtotal: 150 }]));
  return fd;
}

const linha = (numeroParcela: number, extra: Record<string, unknown> = {}) => ({
  numeroParcela,
  paga: false,
  dataPagamento: null,
  dataVencimento: new Date("2026-09-10T00:00:00.000Z"),
  valorParcela: 120,
  antecipada: false,
  origemPagamento: null,
  asaasPaymentId: null,
  baixaPor: null,
  ...extra,
});

type Criada = Record<string, unknown>;
const criadas = () => (dbMock.parcelaVencimento.createMany.mock.calls[0]?.[0].data ?? []) as Criada[];

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.usuario.findFirst.mockResolvedValue({ id: 1 });
  dbMock.venda.update.mockResolvedValue({ clienteId: null });
  dbMock.parcelaVencimento.findMany.mockResolvedValue([]);
});

describe("updateVenda — venda em folha em 1x", () => {
  it("sem linha gravada: cria a parcela 1 com o total e o vencimento da regra", async () => {
    const r = await updateVenda(formUmaVez());
    expect(r).toMatchObject({ success: true });
    expect(criadas()).toEqual([
      expect.objectContaining({ vendaId: 10, numeroParcela: 1, dataVencimento: new Date("2026-09-10T00:00:00.000Z"), valorParcela: 150, paga: false, antecipada: false }),
    ]);
  });

  it("de 3x para 1x sem parcela paga: troca as três linhas por uma", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([linha(1), linha(2), linha(3)]);
    const r = await updateVenda(formUmaVez());
    expect(r).toMatchObject({ success: true });
    expect(dbMock.parcelaVencimento.deleteMany).toHaveBeenCalledWith({ where: { vendaId: 10 } });
    expect(criadas()).toHaveLength(1);
    expect(criadas()[0]).toMatchObject({ numeroParcela: 1, valorParcela: 150 });
  });

  it("parcela 1 antecipada na Prudent: a baixa sobrevive e o flag da venda continua 1", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([linha(1, { antecipada: true, paga: true, origemPagamento: "prudent" })]);
    const r = await updateVenda(formUmaVez());
    expect(r).toMatchObject({ success: true });
    expect(criadas()[0]).toMatchObject({ numeroParcela: 1, antecipada: true, paga: true, origemPagamento: "prudent" });
    expect(dbMock.venda.update.mock.calls[0][0].data.antecipada).toBe(1);
  });

  it("parcela 1 já antecipada: valor e vencimento gravados não são reescritos pela edição", async () => {
    // A linha antecipada é o registro do que a Prudent pagou: mudar frete ou data da venda não
    // pode reescrevê-la em silêncio (achado da revisão de 17/09).
    dbMock.parcelaVencimento.findMany.mockResolvedValue([
      linha(1, { antecipada: true, paga: true, origemPagamento: "prudent", valorParcela: 120, dataVencimento: new Date("2026-09-10T00:00:00.000Z") }),
    ]);
    const fd = formUmaVez();
    fd.set("frete", "30");
    fd.set("envio", "18"); // frete cobrado exige o custo real do envio
    fd.set("data", "2026-09-05");

    const r = await updateVenda(fd);

    expect(r).toMatchObject({ success: true });
    expect(criadas()[0]).toMatchObject({
      numeroParcela: 1,
      valorParcela: 120,
      dataVencimento: new Date("2026-09-10T00:00:00.000Z"),
      antecipada: true,
      paga: true,
    });
    // A taxa da Prudent sai da linha que foi gravada, não da que teria sido gerada.
    expect(dbMock.venda.update.mock.calls[0][0].data.taxaFinanceiraValor).toBe(
      custoAntecipacaoVenda({
        formaPagamento: FORMA_PAGAMENTO.DESCONTO_FOLHA,
        dataVenda: new Date("2026-09-05"),
        valorVenda: 180,
        parcelas: 1,
        parcelas_detalhes: [{ dataVencimento: new Date("2026-09-10T00:00:00.000Z"), valorParcela: 120 }],
      })
    );
  });

  it("parcela 1 aberta: valor e vencimento acompanham a edição", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([linha(1, { valorParcela: 120 })]);
    const fd = formUmaVez();
    fd.set("data", "2026-09-05");

    await updateVenda(fd);

    expect(criadas()[0]).toMatchObject({ valorParcela: 150, dataVencimento: new Date("2026-10-10T00:00:00.000Z") });
  });

  it("sem total conhecido (nem formulário nem banco): a linha existente fica como está", async () => {
    // Só cabeçalho (sem itensJson e sem `valor`) e venda não encontrada: sem saber o total, gerar
    // linha inventaria valor — e apagar a que existe perderia a única parcela da venda.
    dbMock.venda.findUnique.mockResolvedValue(null);
    dbMock.parcelaVencimento.findMany.mockResolvedValue([linha(1)]);
    const fd = formUmaVez();
    fd.delete("itensJson");

    const r = await updateVenda(fd);

    expect(r).toMatchObject({ success: true });
    expect(dbMock.parcelaVencimento.deleteMany).not.toHaveBeenCalled();
    expect(dbMock.parcelaVencimento.createMany).not.toHaveBeenCalled();
  });

  it("3x para 1x com a parcela 1 antecipada: recusa, porque as outras duas sumiriam", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([linha(1, { antecipada: true }), linha(2), linha(3)]);

    const r = (await updateVenda(formUmaVez())) as { success: boolean; error?: string };

    expect(r.success).toBe(false);
    expect(r.error).toContain("antecipada");
    expect(dbMock.parcelaVencimento.deleteMany).not.toHaveBeenCalled();
  });

  it("a taxa da Prudent usa o vencimento da linha, não o prazo fixo de 31 dias", async () => {
    await updateVenda(formUmaVez());
    const esperada = custoAntecipacaoVenda({
      formaPagamento: FORMA_PAGAMENTO.DESCONTO_FOLHA,
      dataVenda: new Date("2026-08-15"),
      valorVenda: 150,
      parcelas: 1,
      parcelas_detalhes: [{ dataVencimento: new Date("2026-09-10T00:00:00.000Z"), valorParcela: 150 }],
    });
    const semLinha = custoAntecipacaoVenda({ formaPagamento: FORMA_PAGAMENTO.DESCONTO_FOLHA, dataVenda: new Date("2026-08-15"), valorVenda: 150, parcelas: 1 });
    expect(esperada).not.toBe(semLinha);
    expect(dbMock.venda.update.mock.calls[0][0].data.taxaFinanceiraValor).toBe(esperada);
  });
});

describe("updateVenda — parcela num lote da Prudent (2026-09-17)", () => {
  // Sem isto, salvar a venda apagava o vínculo: o lote ficava vazio e as parcelas voltavam para a
  // fila, prontas para ir num segundo lote — o mesmo título vendido duas vezes.
  const comLote = (numero: number) => linha(numero, { antecipacaoLoteId: 7 });

  it("o vínculo com o lote sobrevive ao salvar", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([comLote(1)]);
    const r = await updateVenda(formUmaVez());
    expect(r).toMatchObject({ success: true });
    expect(criadas()[0]).toMatchObject({ numeroParcela: 1, antecipacaoLoteId: 7 });
  });

  it("recusa quando a parcela do lote sumiria", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([comLote(1), linha(2), linha(3)]);
    const r = (await updateVenda(formUmaVez())) as { success: boolean; error?: string };
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/lote|Prudent/i);
    expect(dbMock.parcelaVencimento.deleteMany).not.toHaveBeenCalled();
  });

  it("a venda continua marcada como em andamento (flag 2)", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([comLote(1)]);
    await updateVenda(formUmaVez());
    expect(dbMock.venda.update.mock.calls[0][0].data.antecipada).toBe(2);
  });
});

describe("updateVenda — 1x fora da folha", () => {
  it("de folha para PIX em 1x: a linha aberta some", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([linha(1)]);
    const r = await updateVenda(formUmaVez(FORMA_PAGAMENTO.PIX));
    expect(r).toMatchObject({ success: true });
    expect(dbMock.parcelaVencimento.deleteMany).toHaveBeenCalledWith({ where: { vendaId: 10 } });
    expect(dbMock.parcelaVencimento.createMany).not.toHaveBeenCalled();
  });

  it("de folha para PIX com a parcela antecipada ou paga: recusa, sem apagar", async () => {
    for (const travada of [{ antecipada: true }, { paga: true, origemPagamento: "manual" }]) {
      vi.clearAllMocks();
      dbMock.venda.update.mockResolvedValue({ clienteId: null });
      dbMock.parcelaVencimento.findMany.mockResolvedValue([linha(1, travada)]);

      const r = (await updateVenda(formUmaVez(FORMA_PAGAMENTO.PIX))) as { success: boolean; error?: string };

      expect(r.success).toBe(false);
      // A causa é a troca de forma de pagamento, não "mudar para 1 parcela": a mensagem diz o que seria apagado.
      expect(r.error).toContain("apagada");
      expect(r.error).toContain("1");
      expect(dbMock.parcelaVencimento.deleteMany).not.toHaveBeenCalled();
    }
  });

  it("PIX em 1x sem linha: não mexe nas parcelas", async () => {
    await updateVenda(formUmaVez(FORMA_PAGAMENTO.PIX));
    expect(dbMock.parcelaVencimento.deleteMany).not.toHaveBeenCalled();
    expect(dbMock.parcelaVencimento.createMany).not.toHaveBeenCalled();
  });
});

describe("updateVenda — 1x em folha com regra da empresa (2026-09-30)", () => {
  // Empresa com corte 25 / vencimento 15. Antes, a edição chamava `parcelaUnicaDaFolha` sem regra
  // e, como a linha é apagada e recriada a cada save, o vencimento voltava para o dia 10.
  const regra2515 = {
    id: 1,
    empresaParceiraId: 3,
    vigenteDe: new Date("2026-01-01T00:00:00.000Z"),
    vigenteAte: null,
    diaCorte: 25,
    diaVencimento: 15,
    diaPix: 15,
    repassePct: null,
    repasseBase: null,
    cobrancaViaBfx: false,
  };
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
  const form = () => {
    const fd = formUmaVez();
    fd.set("data", "2026-09-22");
    return fd;
  };

  beforeEach(() => {
    dbMock.venda.findUnique.mockResolvedValue(vendaGravada);
    dbMock.cliente.findUnique.mockResolvedValue({ empresaParceiraId: 3 });
    dbMock.regraEmpresa.findMany.mockResolvedValue([regra2515]);
    dbMock.parcelaVencimento.findMany.mockResolvedValue([
      linha(1, { valorParcela: 150, dataVencimento: new Date("2026-10-15T00:00:00.000Z") }),
    ]);
  });

  it("salvar sem alterar nada mantém o vencimento gravado (save idempotente)", async () => {
    const r = await updateVenda(form());
    expect(r).toMatchObject({ success: true });
    expect(criadas()[0]).toMatchObject({ numeroParcela: 1, dataVencimento: new Date("2026-10-15T00:00:00.000Z") });
  });

  it("vencimento gravado à mão sobrevive ao save sem mudança de data nem de forma", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([
      linha(1, { valorParcela: 150, dataVencimento: new Date("2026-10-20T00:00:00.000Z") }),
    ]);
    await updateVenda(form());
    expect(criadas()[0]).toMatchObject({ dataVencimento: new Date("2026-10-20T00:00:00.000Z") });
  });

  it("mudou a data da venda: o vencimento sai da regra da empresa na nova data", async () => {
    const fd = form();
    fd.set("data", "2026-09-26");
    await updateVenda(fd);
    expect(criadas()[0]).toMatchObject({ dataVencimento: new Date("2026-11-15T00:00:00.000Z") });
  });

  it("virou folha agora (antes era PIX, sem linha): o vencimento sai da regra da empresa", async () => {
    dbMock.venda.findUnique.mockResolvedValue({ ...vendaGravada, formaPagamento: FORMA_PAGAMENTO.PIX, descontoEmFolha: false });
    dbMock.parcelaVencimento.findMany.mockResolvedValue([]);
    await updateVenda(form());
    expect(criadas()[0]).toMatchObject({ dataVencimento: new Date("2026-10-15T00:00:00.000Z") });
  });
});

// Venda legada com entrega NULL passando pelo updateVenda real (revisao final de 2026-10-02).
describe("updateVenda — venda legada com entrega nula", () => {
  const gravada = (extra: Record<string, unknown> = {}) => ({
    clienteId: 42,
    dataVenda: new Date("2026-09-22T00:00:00.000Z"),
    formaPagamento: FORMA_PAGAMENTO.DESCONTO_FOLHA,
    descontoEmFolha: true,
    boleto: false,
    parcelas: 1,
    valorFrete: 30,
    custoEnvio: 0,
    entrega: null,
    desconto: 0,
    valorVenda: 150,
    quantidade: 1,
    custoProduto: 100,
    produtoNome: "Produto X",
    itens: [{ subtotal: 150 }],
    ...extra,
  });
  beforeEach(() => {
    dbMock.cliente.findUnique.mockResolvedValue({ empresaParceiraId: null });
    dbMock.regraEmpresa.findMany.mockResolvedValue([]);
  });

  it("salvar sem mexer (entrega vazia): passa e nao escreve entrega", async () => {
    dbMock.venda.findUnique.mockResolvedValue(gravada());
    const fd = formUmaVez();
    fd.set("frete", "30");
    fd.set("envio", "0");
    fd.set("entrega", "");
    const r = await updateVenda(fd);
    expect(r).toMatchObject({ success: true });
    expect(dbMock.venda.update.mock.calls[0][0].data).not.toHaveProperty("entrega");
  });

  it("marcar Entrega sem custo de envio: recusa", async () => {
    dbMock.venda.findUnique.mockResolvedValue(gravada());
    const fd = formUmaVez();
    fd.set("frete", "30");
    fd.set("envio", "0");
    fd.set("entrega", "1");
    const r = await updateVenda(fd);
    expect(r).toMatchObject({ success: false, error: MSG_CUSTO_ENVIO_ENTREGA });
  });

  it("marcar Retirada com frete cobrado: recusa", async () => {
    dbMock.venda.findUnique.mockResolvedValue(gravada({ valorFrete: 0 }));
    const fd = formUmaVez();
    fd.set("frete", "30");
    fd.set("envio", "0");
    fd.set("entrega", "0");
    const r = await updateVenda(fd);
    expect(r).toMatchObject({ success: false, error: MSG_RETIRADA_COM_FRETE });
  });
});
