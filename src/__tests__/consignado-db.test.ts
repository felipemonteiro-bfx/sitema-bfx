// Gravação do e-Consignado (correções da auditoria de 2026-09-16).
// Ver docs/superpowers/specs/2026-09-16-e-consignado-correcoes-auditoria.md, itens 2 e 5.
import { describe, it, expect, vi, beforeEach } from "vitest";

const txMock = {
  cliente: { update: vi.fn(), create: vi.fn() },
  contratoConsignado: { upsert: vi.fn() },
};
const dbMock = {
  cliente: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
  contratoConsignado: { findMany: vi.fn(), upsert: vi.fn() },
  venda: { findMany: vi.fn() },
  $transaction: vi.fn(async (callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock)),
};

vi.mock("@/lib/db", () => ({ prisma: dbMock }));

const { aplicarImportacaoConsignado, recalcularConsignadoPendentes } = await import("@/lib/consignado-db");
const { planejarImportacaoConsignado } = await import("@/lib/consignado-import");

function linha(over: Record<string, unknown> = {}) {
  return {
    linha: 2,
    ifConcessoraCodigo: "237",
    ifConcessoraDescricao: "BRADESCO",
    contrato: "CTR-1",
    cpf: "52998224725",
    matricula: "1001",
    numeroInscricaoEmpregador: "01288370",
    nomeTrabalhador: "MARIA TESTE",
    nomeEmpregador: "AMAZON FIVE LTDA",
    dataInicioContrato: null,
    dataFimContrato: null,
    competenciaInicioDesconto: "06/2026",
    competenciaFimDesconto: "05/2032",
    totalParcelas: 72,
    valorParcela: 150,
    valorEmprestimo: null,
    valorLiberado: null,
    qtdPagamentos: null,
    qtdEscrituracoes: null,
    categoriaTrabalhador: null,
    competenciaArquivo: "09/2026",
    numeroInscricaoEstabelecimento: "01288370000139",
    dataAdmissao: null,
    ...over,
  };
}

function planoCasadoMaisLead() {
  return planejarImportacaoConsignado({
    linhas: [
      linha({ linha: 2, contrato: "CTR-1" }),
      linha({ linha: 3, contrato: "CTR-2", cpf: "11144477735", nomeTrabalhador: "LEAD NOVO" }),
    ],
    clientes: [
      {
        id: 7,
        nome: "MARIA TESTE",
        cpf: "52998224725",
        matricula: null,
        renda: 3000,
        empresa: null,
        empresaParceiraId: null,
        estagioCrm: "cliente",
        origem: "manual",
      },
    ],
    empresas: [{ id: 3, nome: "AMAZON FIVE", cnpj: "01288370000139" }],
    contratos: [],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  txMock.cliente.create.mockResolvedValue({ id: 50 });
  txMock.cliente.update.mockResolvedValue({});
  txMock.contratoConsignado.upsert.mockResolvedValue({});
  dbMock.cliente.findUnique.mockResolvedValue({ renda: 3000, nome: "X" });
  dbMock.contratoConsignado.findMany.mockResolvedValue([]);
  dbMock.venda.findMany.mockResolvedValue([]);
  dbMock.cliente.update.mockResolvedValue({});
  dbMock.cliente.updateMany.mockResolvedValue({ count: 1 });
});

describe("aplicarImportacaoConsignado — transacao", () => {
  it("grava leads, preenchimentos e contratos pelo cliente da transacao, nunca pelo prisma global", async () => {
    await aplicarImportacaoConsignado(planoCasadoMaisLead());

    expect(dbMock.$transaction).toHaveBeenCalledTimes(1);
    expect(txMock.cliente.create).toHaveBeenCalledTimes(1);
    expect(txMock.contratoConsignado.upsert).toHaveBeenCalledTimes(2);
    expect(dbMock.cliente.create).not.toHaveBeenCalled();
    expect(dbMock.contratoConsignado.upsert).not.toHaveBeenCalled();
  });

  it("recalcula as faixas depois do commit, para o cliente casado e para o lead criado", async () => {
    await aplicarImportacaoConsignado(planoCasadoMaisLead());

    const idsRecalculados = dbMock.cliente.update.mock.calls.map((c) => c[0].where.id).sort();
    expect(idsRecalculados).toEqual([50, 7].sort());
  });

  it("falha no meio da transacao rejeita a importacao e nao recalcula nada", async () => {
    txMock.contratoConsignado.upsert.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("P2002"));

    await expect(aplicarImportacaoConsignado(planoCasadoMaisLead())).rejects.toThrow("P2002");
    expect(dbMock.cliente.update).not.toHaveBeenCalled();
  });
});

describe("recalcularConsignadoPendentes", () => {
  it("so busca quem nao foi calculado no mes e grava agrupado com o mes de referencia", async () => {
    dbMock.cliente.findMany.mockResolvedValue([
      { id: 1, renda: 1000 },
      { id: 2, renda: null },
    ]);
    dbMock.venda.findMany.mockResolvedValue([
      {
        clienteId: 1,
        dataVenda: new Date(2026, 6, 10),
        parcelas: 12,
        valorParcela: 250,
        status: "ativa",
        descontoEmFolha: true,
        formaPagamento: "DESCONTO_FOLHA",
      },
    ]);

    const total = await recalcularConsignadoPendentes(new Date(2026, 8, 15));

    expect(total).toBe(2);
    expect(dbMock.cliente.findMany.mock.calls[0][0].where).toEqual({
      OR: [{ consignadoMesRef: null }, { consignadoMesRef: { not: "2026-09" } }],
    });
    // O `where` repete o filtro de pendente: se uma venda recalculou o cliente entre a
    // leitura e a gravação do lote, o valor novo (já no mês atual) não é sobrescrito.
    const pendente = { OR: [{ consignadoMesRef: null }, { consignadoMesRef: { not: "2026-09" } }] };
    expect(dbMock.cliente.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [1] }, ...pendente },
      data: { pctConsignado: 25, faixaConsignado: "alerta", consignadoMesRef: "2026-09" },
    });
    expect(dbMock.cliente.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [2] }, ...pendente },
      data: { pctConsignado: null, faixaConsignado: "renda_pendente", consignadoMesRef: "2026-09" },
    });
  });

  it("sem pendentes nao carrega contratos nem vendas e nao grava", async () => {
    dbMock.cliente.findMany.mockResolvedValue([]);

    const total = await recalcularConsignadoPendentes(new Date(2026, 8, 15));

    expect(total).toBe(0);
    expect(dbMock.contratoConsignado.findMany).not.toHaveBeenCalled();
    expect(dbMock.venda.findMany).not.toHaveBeenCalled();
    expect(dbMock.cliente.updateMany).not.toHaveBeenCalled();
  });
});
