// Editar venda precisa atualizar `valorParcela` — mas so quando algo que muda a parcela
// mudou (2026-09-16). Ver docs/superpowers/specs/2026-09-16-e-consignado-correcoes-auditoria.md, 9.1.
//
// Venda de R$ 600 em 12x editada para 6x ficava com parcelas=6 e valorParcela=50: o limite
// de credito e o consignado contavam metade. Recalcular em todo save, por outro lado,
// reescreveria o valorParcela de venda importada/legada (juros embutidos) num save sem
// mudanca nenhuma — o save tem de ser idempotente.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { valorParcelaAposEdicao } from "@/lib/parcelas";

describe("valorParcelaAposEdicao", () => {
  // Save sem mudanca devolve undefined sem olhar o valor gravado: e isso que preserva a
  // parcela de venda importada/legada com juros embutidos (valorParcela != total/parcelas).
  it("save sem mudanca de parcelas nem de total nao toca no valorParcela", () => {
    expect(
      valorParcelaAposEdicao({
        antes: { parcelas: 12, total: 600 },
        depois: { parcelas: 12, total: 600 },
      }),
    ).toBeUndefined();
  });

  it("12x para 6x recalcula a parcela", () => {
    expect(
      valorParcelaAposEdicao({
        antes: { parcelas: 12, total: 600 },
        depois: { parcelas: 6, total: 600 },
      }),
    ).toBe(100);
  });

  it("total mudou (desconto, item, frete) recalcula com truncamento em centavos", () => {
    expect(
      valorParcelaAposEdicao({
        antes: { parcelas: 3, total: 900 },
        depois: { parcelas: 3, total: 1000 },
      }),
    ).toBe(333.33);
  });

  it("total novo desconhecido (form sem itens e sem valor) nao arrisca reescrever", () => {
    expect(
      valorParcelaAposEdicao({ antes: { parcelas: 12, total: 600 }, depois: { parcelas: 6, total: null } }),
    ).toBeUndefined();
  });

  it("sem venda anterior conhecida nao arrisca reescrever", () => {
    expect(valorParcelaAposEdicao({ antes: null, depois: { parcelas: 6, total: 600 } })).toBeUndefined();
  });
});

// updateVenda de ponta a ponta, com o mesmo padrao de mocks de historico-edicao-preserva-antecipada.test.ts.
const dbMock = {
  usuario: { findFirst: vi.fn() },
  venda: { update: vi.fn(), findUnique: vi.fn() },
  itemVenda: { deleteMany: vi.fn(), createMany: vi.fn() },
  parcelaVencimento: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
  despesa: { create: vi.fn() },
};

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/audit", () => ({ createAuditLog: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendVendaNotification: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/guards", () => ({ requireSessionOrThrow: vi.fn(async () => ({ id: 1, username: "v", role: "vendedor" })) }));
vi.mock("@/lib/consignado-db", () => ({ recalcularConsignadoSeguro: vi.fn() }));

const { updateVenda } = await import("@/app/(app)/historico/actions");

function formVenda(parcelas: number): FormData {
  const fd = new FormData();
  fd.set("id", "10");
  fd.set("data", "2026-01-01");
  fd.set("vendedor", "vendedor-teste");
  fd.set("frete", "0");
  fd.set("envio", "0");
  fd.set("desconto", "0");
  fd.set("parcelas", String(parcelas));
  fd.set("formaPagamento", "DESCONTO_FOLHA");
  fd.set(
    "itensJson",
    JSON.stringify([{ produtoNome: "Produto X", custoProduto: 300, valorVenda: 600, quantidade: 1, subtotal: 600 }]),
  );
  fd.set(
    "parcelasVencimento",
    JSON.stringify(
      Array.from({ length: parcelas }, (_, i) => ({
        numeroParcela: i + 1,
        dataVencimento: `2026-${String(i + 2).padStart(2, "0")}-10`,
        valorParcela: 600 / parcelas,
      })),
    ),
  );
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.usuario.findFirst.mockResolvedValue({ id: 1 });
  dbMock.venda.update.mockResolvedValue({ clienteId: 7 });
  dbMock.parcelaVencimento.findMany.mockResolvedValue([]);
});

describe("updateVenda — valorParcela", () => {
  it("mudar de 12x para 6x grava a parcela nova", async () => {
    dbMock.venda.findUnique.mockResolvedValue({
      parcelas: 12,
      valorParcela: 50,
      valorFrete: 0,
      desconto: 0,
      valorVenda: 600,
      quantidade: 1,
      itens: [{ subtotal: 600 }],
    });

    const r = await updateVenda(formVenda(6));

    expect(r).toEqual({ success: true });
    expect(dbMock.venda.update.mock.calls[0][0].data.valorParcela).toBe(100);
  });

  it("produto sem nome: o form nao manda itens nem valor, e a parcela nao e zerada", async () => {
    // edit-venda-itens-client descarta item sem produtoNome; sem `valor` no form o
    // caminho legado calcularia total 0 e gravaria valorParcela 0.
    dbMock.venda.findUnique.mockResolvedValue({
      parcelas: 12,
      valorParcela: 50,
      valorFrete: 0,
      desconto: 0,
      valorVenda: 600,
      quantidade: 1,
      itens: [],
    });
    const fd = formVenda(12);
    fd.set("itensJson", "[]");

    const r = await updateVenda(fd);

    expect(r).toEqual({ success: true });
    expect("valorParcela" in dbMock.venda.update.mock.calls[0][0].data).toBe(false);
  });

  it("save identico nao manda valorParcela no update", async () => {
    dbMock.venda.findUnique.mockResolvedValue({
      parcelas: 12,
      valorParcela: 60,
      valorFrete: 0,
      desconto: 0,
      valorVenda: 600,
      quantidade: 1,
      itens: [{ subtotal: 600 }],
    });

    const r = await updateVenda(formVenda(12));

    expect(r).toEqual({ success: true });
    expect("valorParcela" in dbMock.venda.update.mock.calls[0][0].data).toBe(false);
  });
});
