import { describe, it, expect, vi, beforeEach } from "vitest";
import { WHERE_VENDA_ANTECIPAVEL } from "@/lib/antecipacao";

// resumoPlanilhaFolhaAction — o resumo do popover "Baixar planilha da folha"
// (2026-09-17): guarda própria, competência validada, mesmo modelo do arquivo.
const dbMock = { venda: { findMany: vi.fn() } };
const guardsMock = vi.hoisted(() => ({ requireAdminOrThrow: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/guards", () => guardsMock);

const { resumoPlanilhaFolhaAction } = await import("@/app/(app)/prudent/actions");

const parcela = (valor: number) => ({ dataVencimento: new Date("2026-09-10T00:00:00.000Z"), valorParcela: valor, paga: false, origemPagamento: null });
const base = { status: "ativa", dataVenda: new Date("2026-07-12T00:00:00.000Z"), parcelas: 1, valorVenda: null, quantidade: 1, valorFrete: 0, desconto: 0, itens: [] };
const VENDAS = [
  { ...base, id: 1, cliente: { id: 1, nome: "LUCIANA", matricula: "00045", empresa: "AMAZON FIVE" }, parcelasVencimento: [parcela(305)] },
  { ...base, id: 2, cliente: { id: 2, nome: "MARIANA", matricula: null, empresa: "AMAZON FIVE" }, parcelasVencimento: [parcela(120.5)] },
  { ...base, id: 3, cliente: { id: 3, nome: "JOÃO", matricula: "7", empresa: "OUTRA" }, parcelasVencimento: [parcela(99)] },
];

beforeEach(() => {
  vi.clearAllMocks();
  guardsMock.requireAdminOrThrow.mockResolvedValue({ id: 1, role: "admin" });
  dbMock.venda.findMany.mockResolvedValue(VENDAS);
});

describe("resumoPlanilhaFolhaAction", () => {
  it("sem admin, recusa e não consulta o banco", async () => {
    guardsMock.requireAdminOrThrow.mockRejectedValue(new Error("Acesso negado."));
    await expect(resumoPlanilhaFolhaAction({ competencia: "08/2026" })).rejects.toThrow("Acesso negado.");
    expect(dbMock.venda.findMany).not.toHaveBeenCalled();
  });

  it("competência inválida: erro, sem consultar o banco", async () => {
    expect(await resumoPlanilhaFolhaAction({ competencia: "13/2026", empresa: "AMAZON FIVE" })).toEqual({ ok: false, erro: "Competência inválida." });
    expect(dbMock.venda.findMany).not.toHaveBeenCalled();
  });

  it("consulta só venda em desconto em folha", async () => {
    await resumoPlanilhaFolhaAction({ competencia: "08/2026", empresa: "AMAZON FIVE" });
    expect(dbMock.venda.findMany.mock.calls[0][0].where).toMatchObject(WHERE_VENDA_ANTECIPAVEL);
  });

  it("sem empresa, 'todas' ou empresa que não é texto: erro, sem consultar o banco", async () => {
    for (const empresa of [undefined, "", "todas", 5]) {
      expect(await resumoPlanilhaFolhaAction({ competencia: "08/2026", empresa } as never)).toEqual({ ok: false, erro: "Escolha a empresa." });
    }
    expect(dbMock.venda.findMany).not.toHaveBeenCalled();
  });

  it("conta compradores, total e sem matrícula — os números do arquivo", async () => {
    expect(await resumoPlanilhaFolhaAction({ competencia: "08/2026", empresa: "AMAZON FIVE" })).toEqual({
      ok: true,
      resumo: { compradores: 2, total: 425.5, semMatricula: 1, matriculasRepetidas: [] },
    });
  });
});
