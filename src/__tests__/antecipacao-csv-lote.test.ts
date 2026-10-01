// B2 (30/09): o CSV da Prudent sai do lote já gravado (`?loteId=`), não da seleção antes de gravar —
// o arquivo e o lote não podem divergir (recusa do RH, outra aba, desmarcação no meio).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const dbMock = {
  parcelaVencimento: { findMany: vi.fn() },
  venda: { findMany: vi.fn() },
};
vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/guards", () => ({ requireAdmin: vi.fn(async () => true) }));
const loteMock = { resolverParcelasDoLote: vi.fn() };
vi.mock("@/lib/lote-antecipacao-db", () => loteMock);

const { GET } = await import("@/app/api/relatorios/antecipacao/route");

const req = (qs: string) => new Request(`http://x/api/relatorios/antecipacao?${qs}`) as never;

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.parcelaVencimento.findMany.mockResolvedValue([
    { id: 1, vendaId: 10 },
    { id: 2, vendaId: 10 },
    { id: 3, vendaId: 11 },
  ]);
  dbMock.venda.findMany.mockResolvedValue([
    {
      id: 10,
      dataVenda: new Date("2026-09-01T00:00:00Z"),
      produtoNome: "TV",
      itens: [],
      cliente: { nome: "ANA", cpf: "1", cnpj: null, email: null, empresa: "AMAZON" },
      parcelasVencimento: [{ valorParcela: 100 }, { valorParcela: 100 }],
    },
  ]);
});

describe("GET /api/relatorios/antecipacao?loteId=", () => {
  it("lista as parcelas gravadas no lote, sem recalcular a seleção", async () => {
    const r = await GET(req("loteId=5"));
    expect(r.status).toBe(200);
    expect(dbMock.parcelaVencimento.findMany).toHaveBeenCalledWith({
      where: { antecipacaoLoteId: 5 },
      select: { id: true, vendaId: true },
    });
    expect(loteMock.resolverParcelasDoLote).not.toHaveBeenCalled();
    const arg = dbMock.venda.findMany.mock.calls[0][0];
    // Venda cancelada depois de abrir o lote continua no arquivo: ele descreve o lote, não a fila.
    expect(arg.where).toEqual({ id: { in: [10, 11] } });
    expect(arg.include.parcelasVencimento.where).toEqual({ id: { in: [1, 2, 3] } });
    expect(await r.text()).toContain("200.00");
  });

  it("loteId inválido → 400", async () => {
    const r = await GET(req("loteId=abc"));
    expect(r.status).toBe(400);
    expect(dbMock.parcelaVencimento.findMany).not.toHaveBeenCalled();
  });

  it("lote sem parcelas → 404", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([]);
    const r = await GET(req("loteId=5"));
    expect(r.status).toBe(404);
  });
});

describe("tela da fila: o CSV é baixado depois de abrir o lote, pelo id do lote", () => {
  it("abre o lote antes e baixa por loteId", () => {
    const tela = readFileSync(path.resolve(__dirname, "../components/antecipacao-client.tsx"), "utf8");
    const abre = tela.indexOf("await onSubmit(formData)");
    const baixa = tela.indexOf("baixarCsvDoLote(r.loteId)");
    expect(abre).toBeGreaterThan(-1);
    expect(baixa).toBeGreaterThan(abre);
    expect(tela.includes("/api/relatorios/antecipacao?loteId=${loteId}")).toBe(true);
    // a seleção não gera mais o arquivo da Prudent antes da gravação
    expect(tela.includes("/api/relatorios/antecipacao?${xlsxParams")).toBe(false);
  });
});
