import { describe, it, expect, vi, beforeEach } from "vitest";

// resumoPlanilhaControleAction — o resumo do popover "Baixar planilha de
// controle" (2026-09-11): guarda própria, período validado, mesmo modelo do arquivo.
const dbMock = { venda: { findMany: vi.fn() } };
const guardsMock = vi.hoisted(() => ({ requireAdminOrThrow: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/guards", () => guardsMock);

const { resumoPlanilhaControleAction } = await import("@/app/(app)/prudent/actions");

const VENDA = {
  id: 1,
  status: "ativa",
  antecipada: 0,
  dataVenda: new Date("2026-07-12T00:00:00.000Z"),
  produtoNome: "FRITADEIRA ELÉTRICA 4L",
  itens: [],
  cliente: { nome: "LUCIANA FERREIRA DIAS", cpf: "03119321265", cnpj: null, empresa: "AMAZON FIVE" },
  parcelasVencimento: [
    { numeroParcela: 1, dataVencimento: new Date("2026-09-10T00:00:00.000Z"), valorParcela: 305, antecipada: true },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  guardsMock.requireAdminOrThrow.mockResolvedValue({ id: 1, role: "admin" });
  dbMock.venda.findMany.mockResolvedValue([VENDA]);
});

describe("resumoPlanilhaControleAction", () => {
  it("sem admin, recusa e não consulta o banco", async () => {
    guardsMock.requireAdminOrThrow.mockRejectedValue(new Error("Acesso negado."));
    await expect(resumoPlanilhaControleAction({})).rejects.toThrow("Acesso negado.");
    expect(dbMock.venda.findMany).not.toHaveBeenCalled();
  });

  it("período inválido: erro, sem consultar o banco", async () => {
    expect(await resumoPlanilhaControleAction({ mesInicio: "13/2026" })).toEqual({ ok: false, erro: "Período inválido." });
    expect(dbMock.venda.findMany).not.toHaveBeenCalled();
  });

  it("conta abas, parcelas e o que já foi antecipado — os números do arquivo", async () => {
    expect(await resumoPlanilhaControleAction({})).toEqual({
      ok: true,
      resumo: { abas: 1, parcelas: 1, valorAntecipado: 305 },
    });
  });
});
