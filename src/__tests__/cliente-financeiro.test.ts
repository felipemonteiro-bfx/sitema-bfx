import { describe, it, expect, vi, beforeEach } from "vitest";

const dbMock = {
  $queryRaw: vi.fn(),
  parcelaVencimento: { findMany: vi.fn() },
  cliente: { findUnique: vi.fn() },
  venda: { findMany: vi.fn() },
  produto: { findMany: vi.fn() },
};
vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/busca-produtos", () => ({ buscarProdutos: vi.fn() }));

const { parcelasDoCliente, boletosDoCliente } = await import("@/lib/cliente-financeiro");
const { executarTool } = await import("@/lib/mcp-agente");

const ESCOPO = { clienteId: 7, nome: "Ana Souza" };
const venda = { id: 31, produtoNome: "Geladeira", parcelas: 10 };
const meiaNoite = new Date();
meiaNoite.setHours(0, 0, 0, 0);
const futuro = new Date(meiaNoite.getTime() + 10 * 86400000);
const passado = new Date(meiaNoite.getTime() - 10 * 86400000);

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.parcelaVencimento.findMany.mockResolvedValue([]);
  dbMock.venda.findMany.mockResolvedValue([]);
});

describe("cliente-financeiro: venda válida (D1)", () => {
  it("parcelas: o where exclui venda cancelada/estornada e prende o cliente", async () => {
    await parcelasDoCliente(7, {});
    const where = dbMock.parcelaVencimento.findMany.mock.calls[0][0].where;
    expect(where.venda).toEqual({ clienteId: 7, status: { notIn: ["cancelada", "estornada"] } });
  });

  it("parcelas: filtros de apresentação continuam valendo junto do filtro de venda", async () => {
    await parcelasDoCliente(7, { apenasVencidas: true });
    const where = dbMock.parcelaVencimento.findMany.mock.calls[0][0].where;
    expect(where.paga).toBe(false);
    expect(where.venda.status).toEqual({ notIn: ["cancelada", "estornada"] });
  });

  it("boletos: o where exclui venda cancelada/estornada e prende o cliente", async () => {
    await boletosDoCliente(7, {});
    const where = dbMock.venda.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({
      clienteId: 7,
      boleto: true,
      status: { notIn: ["cancelada", "estornada"] },
    });
  });

  it("boletos: apenasPendentes mantém o filtro de venda", async () => {
    await boletosDoCliente(7, { apenasPendentes: true });
    const where = dbMock.venda.findMany.mock.calls[0][0].where;
    expect(where.boletoUrl).toBeNull();
    expect(where.status).toEqual({ notIn: ["cancelada", "estornada"] });
  });
});

describe("executarTool devolve a mesma saída de antes para venda válida", () => {
  it("minhas_parcelas", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([
      { numeroParcela: 1, dataVencimento: passado, valorParcela: 100.456, paga: false, origemPagamento: null, venda },
      { numeroParcela: 2, dataVencimento: futuro, valorParcela: 50, paga: false, origemPagamento: null, venda },
      { numeroParcela: 3, dataVencimento: passado, valorParcela: 20, paga: true, origemPagamento: "asaas", venda },
    ]);
    const saida = (await executarTool("minhas_parcelas", {}, ESCOPO)) as Record<string, unknown>;
    expect(JSON.stringify(saida)).toBe(
      JSON.stringify({
        cliente: "Ana Souza",
        totalEmAberto: 150.45,
        totalVencido: 100.45,
        parcelas: [
          { produto: "Geladeira", numeroParcela: "1/10", dataVencimento: passado.toISOString().slice(0, 10), valor: 100.45, paga: false, diasAtraso: 10 },
          { produto: "Geladeira", numeroParcela: "2/10", dataVencimento: futuro.toISOString().slice(0, 10), valor: 50, paga: false, diasAtraso: 0 },
          { produto: "Geladeira", numeroParcela: "3/10", dataVencimento: passado.toISOString().slice(0, 10), valor: 20, paga: true, diasAtraso: 0 },
        ],
      }),
    );
  });

  it("meus_boletos", async () => {
    const data = new Date("2026-09-10T00:00:00Z");
    dbMock.venda.findMany.mockResolvedValue([
      { id: 31, dataVenda: data, produtoNome: "Geladeira", parcelas: 10, valorVenda: 1000.999, boletoUrl: "https://x/b" },
      { id: 32, dataVenda: data, produtoNome: "Fogão", parcelas: 1, valorVenda: null, boletoUrl: null },
    ]);
    const saida = await executarTool("meus_boletos", {}, ESCOPO);
    expect(JSON.stringify(saida)).toBe(
      JSON.stringify({
        total: 2,
        boletos: [
          { dataVenda: "2026-09-10", produto: "Geladeira", parcelas: 10, valor: 1000.99, emitido: true, link: "https://x/b" },
          { dataVenda: "2026-09-10", produto: "Fogão", parcelas: 1, valor: null, emitido: false, link: null },
        ],
      }),
    );
  });
});
