// Edição de venda recusa número de parcela repetido (spec 2026-09-30 §3.2). Com a unique
// (venda_id, numero_parcela) o createMany falharia depois do deleteMany e a venda ficaria sem
// nenhuma linha de parcela; a recusa vem antes de qualquer escrita.
import { describe, it, expect, vi, beforeEach } from "vitest";

const dbMock = {
  // Fase 5: a edição/exclusão grava numa transação, com as parcelas travadas (FOR UPDATE).
  $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(dbMock)),
  $queryRaw: vi.fn(async () => []),
  usuario: { findFirst: vi.fn() },
  venda: { update: vi.fn(), findUnique: vi.fn() },
  itemVenda: { deleteMany: vi.fn(), createMany: vi.fn() },
  parcelaVencimento: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
  despesa: { create: vi.fn() },
};
vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/audit", () => ({ createAuditLog: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendVendaNotification: vi.fn(), enviarTermoAssinadoAoRh: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/guards", () => ({ requireSessionOrThrow: vi.fn(async () => ({ id: 1, username: "vendedor-teste", role: "vendedor" })) }));
vi.mock("@/lib/consignado-db", () => ({ recalcularConsignadoSeguro: vi.fn() }));

const { numerosDeParcelaRepetidos } = await import("@/lib/parcelas");
const { updateVenda } = await import("@/app/(app)/historico/actions");
const { FORMA_PAGAMENTO } = await import("@/lib/forma-pagamento");

describe("numerosDeParcelaRepetidos", () => {
  it("sem repetição devolve vazio", () => {
    expect(numerosDeParcelaRepetidos([{ numeroParcela: 1 }, { numeroParcela: 2 }, { numeroParcela: 3 }])).toEqual([]);
    expect(numerosDeParcelaRepetidos([])).toEqual([]);
  });
  it("devolve cada número repetido uma vez, em ordem", () => {
    const ps = [3, 1, 1, 2, 3, 3].map((numeroParcela) => ({ numeroParcela }));
    expect(numerosDeParcelaRepetidos(ps)).toEqual([1, 3]);
  });
});

describe("updateVenda com número de parcela repetido", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.usuario.findFirst.mockResolvedValue({ id: 1 });
    dbMock.venda.update.mockResolvedValue({ id: 10 });
    dbMock.parcelaVencimento.findMany.mockResolvedValue([]);
  });

  it("é recusada antes de qualquer escrita", async () => {
    const fd = new FormData();
    fd.set("id", "10");
    fd.set("data", "2026-01-01");
    fd.set("vendedor", "vendedor-teste");
    fd.set("frete", "0");
    fd.set("envio", "0");
    fd.set("desconto", "0");
    fd.set("parcelas", "3");
    fd.set("formaPagamento", FORMA_PAGAMENTO.DESCONTO_FOLHA);
    fd.set("itensJson", JSON.stringify([{ produtoNome: "Produto X", custoProduto: 600, valorVenda: 900, quantidade: 1, subtotal: 900 }]));
    fd.set(
      "parcelasVencimento",
      JSON.stringify([
        { numeroParcela: 1, dataVencimento: "2026-02-10", valorParcela: 300 },
        { numeroParcela: 1, dataVencimento: "2026-03-10", valorParcela: 300 },
        { numeroParcela: 3, dataVencimento: "2026-04-10", valorParcela: 300 },
      ])
    );

    const r = await updateVenda(fd);

    expect(r).toEqual({ success: false, error: "Parcela 1 aparece mais de uma vez. Revise as datas de vencimento." });
    expect(dbMock.venda.update).not.toHaveBeenCalled();
    expect(dbMock.itemVenda.deleteMany).not.toHaveBeenCalled();
    expect(dbMock.parcelaVencimento.deleteMany).not.toHaveBeenCalled();
    expect(dbMock.parcelaVencimento.createMany).not.toHaveBeenCalled();
  });
});
