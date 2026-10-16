// Contadores da sidebar (redesign Vantage, tarefa B2): assinatura pendente para todos os perfis
// (vendedor só das próprias vendas) e parcelas vencidas só para admin. Sem estoque (decisão v1.1).
import { describe, it, expect, vi, beforeEach } from "vitest";

const dbMock = {
  venda: { count: vi.fn() },
  parcelaVencimento: { count: vi.fn() },
  produto: { count: vi.fn() },
};
vi.mock("@/lib/db", () => ({ prisma: dbMock }));
// unstable_cache só funciona dentro do runtime do Next: aqui registramos a chave e executamos direto.
const cacheMock = vi.fn((fn: (...a: unknown[]) => unknown, _chave?: string[], _opcoes?: { revalidate?: number }) => fn);
vi.mock("next/cache", () => ({ unstable_cache: cacheMock }));

const { whereAssinaturasPendentesDoUsuario, carregarAlertasShell } = await import("@/lib/alertas-shell");
const { whereAssinaturaPendente } = await import("@/lib/historico-filtros");
const { whereParcelasInadimplentes } = await import("@/lib/venda-utils");

const admin = { id: 1, role: "admin", nomeExibicao: "Admin", username: "admin" };
const vendedor = { id: 5, role: "vendedor", nomeExibicao: "Maria", username: "maria" };

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.venda.count.mockResolvedValue(4);
  dbMock.parcelaVencimento.count.mockResolvedValue(9);
});

describe("whereAssinaturasPendentesDoUsuario", () => {
  it("admin: só o critério único de pendente, sem escopo", () => {
    expect(whereAssinaturasPendentesDoUsuario(admin)).toEqual({ AND: [whereAssinaturaPendente(), {}] });
  });

  it("vendedor: critério único + escopo por vendedorId (com perna legada)", () => {
    expect(whereAssinaturasPendentesDoUsuario(vendedor)).toEqual({
      AND: [whereAssinaturaPendente(), { OR: [{ vendedorId: 5 }, { vendedorId: null, vendedor: "Maria" }] }],
    });
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
    expect(JSON.stringify(dbMock.venda.count.mock.calls[0][0].where)).toContain('"vendedorId":5');
  });

  it("nunca consulta estoque nem expõe chave de estoque", async () => {
    const r = await carregarAlertasShell(admin);
    expect(dbMock.produto.count).not.toHaveBeenCalled();
    expect(Object.keys(r).some((k) => k.toLowerCase().includes("estoque"))).toBe(false);
  });
});

// R1-7: o layout é force-dynamic; sem cache seriam 2 count a cada navegação.
describe("carregarAlertasShell — cache de 60s por usuário", () => {
  it("envolve a consulta em unstable_cache com revalidate 60 e chave por id + perfil", async () => {
    await carregarAlertasShell(vendedor);
    const [, chave, opcoes] = cacheMock.mock.calls[cacheMock.mock.calls.length - 1];
    expect(opcoes?.revalidate).toBe(60);
    expect(chave).toContain("5");
    expect(chave).toContain("vendedor");
  });

  it("usuários diferentes não compartilham a chave (o vendedor nunca recebe o número do admin)", async () => {
    await carregarAlertasShell(admin);
    const chaveAdmin = cacheMock.mock.calls[cacheMock.mock.calls.length - 1][1];
    await carregarAlertasShell(vendedor);
    const chaveVendedor = cacheMock.mock.calls[cacheMock.mock.calls.length - 1][1];
    expect(chaveAdmin).not.toEqual(chaveVendedor);
  });
});
