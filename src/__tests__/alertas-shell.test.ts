// Contadores da sidebar (redesign Vantage, tarefa B2): assinatura pendente para todos os perfis
// (vendedor só das próprias vendas) e parcelas vencidas só para admin. Sem estoque (decisão v1.1).
import { describe, it, expect, vi, beforeEach } from "vitest";

const dbMock = {
  venda: { count: vi.fn() },
  parcelaVencimento: { count: vi.fn() },
  produto: { count: vi.fn() },
};
vi.mock("@/lib/db", () => ({ prisma: dbMock }));

const { whereAssinaturaPendente, carregarAlertasShell } = await import("@/lib/alertas-shell");
const { whereParcelasInadimplentes } = await import("@/lib/venda-utils");

const admin = { role: "admin", nomeExibicao: "Admin", username: "admin" };
const vendedor = { role: "vendedor", nomeExibicao: "Maria", username: "maria" };

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.venda.count.mockResolvedValue(4);
  dbMock.parcelaVencimento.count.mockResolvedValue(9);
});

describe("whereAssinaturaPendente", () => {
  it("admin: token gerado, não assinada, cancelada e estornada fora, sem filtro de vendedor", () => {
    const w = whereAssinaturaPendente(admin);
    expect(w.assinaturaToken).toEqual({ not: null });
    expect(w.status).toEqual({ notIn: ["cancelada", "estornada"] });
    expect(w.NOT).toEqual({ assinatura: { is: { assinaturaStatus: "assinado" } } });
    expect("vendedor" in w).toBe(false);
  });

  it("vendedor: restringe ao próprio nome de exibição", () => {
    expect(whereAssinaturaPendente(vendedor).vendedor).toBe("Maria");
  });

  it("vendedor sem nome de exibição: cai para o username", () => {
    expect(whereAssinaturaPendente({ ...vendedor, nomeExibicao: null }).vendedor).toBe("maria");
  });
});

describe("whereParcelasInadimplentes (critério do relatório de inadimplência)", () => {
  it("não paga, não antecipada, venda válida, vencida até a data", () => {
    const ate = new Date("2026-10-16T12:00:00Z");
    const w = whereParcelasInadimplentes(ate);
    expect(w.paga).toBe(false);
    expect(w.antecipada).toBe(false);
    expect(w.venda).toEqual({ status: { notIn: ["cancelada", "estornada"] } });
    expect(w.dataVencimento).toEqual({ lte: ate });
  });

  it("com piso: acrescenta gte", () => {
    const desde = new Date("2026-10-01T00:00:00");
    const ate = new Date("2026-10-16T12:00:00Z");
    expect(whereParcelasInadimplentes(ate, desde).dataVencimento).toEqual({ gte: desde, lte: ate });
  });
});

describe("carregarAlertasShell", () => {
  it("admin: devolve assinaturas pendentes e parcelas vencidas", async () => {
    const r = await carregarAlertasShell(admin);
    expect(r).toEqual({ assinaturasPendentes: 4, parcelasVencidas: 9 });
    expect(dbMock.venda.count).toHaveBeenCalledTimes(1);
    expect(dbMock.parcelaVencimento.count).toHaveBeenCalledTimes(1);
  });

  it("vendedor: não consulta parcelas e não devolve a chave", async () => {
    const r = await carregarAlertasShell(vendedor);
    expect(r).toEqual({ assinaturasPendentes: 4 });
    expect("parcelasVencidas" in r).toBe(false);
    expect(dbMock.parcelaVencimento.count).not.toHaveBeenCalled();
    expect(dbMock.venda.count.mock.calls[0][0].where.vendedor).toBe("Maria");
  });

  it("nunca consulta estoque nem expõe chave de estoque", async () => {
    const r = await carregarAlertasShell(admin);
    expect(dbMock.produto.count).not.toHaveBeenCalled();
    expect(Object.keys(r).some((k) => k.toLowerCase().includes("estoque"))).toBe(false);
  });
});
