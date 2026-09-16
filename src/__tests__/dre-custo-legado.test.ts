// DRE e resumo da IA: custo de venda sem itens multiplica pela quantidade (2026-09-16).
//
// Em venda so de cabecalho, `custoProduto` e unitario: a criacao legada, `updateVenda` e
// `custoTotalVenda` multiplicam por `quantidade`. O DRE (`finance.ts`) e o resumo financeiro
// da IA (`ai-actions.ts`) somavam o custo sem multiplicar — venda de 2 unidades a custo 250
// entrava com CMV 250 no DRE e 500 no lucro gravado. Producao em 16/09: 18 vendas sem itens,
// nenhuma com quantidade > 1, entao nao ha dado a corrigir; o teste trava o calculo.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dbMock = {
  venda: { findMany: vi.fn() },
  usuario: { findMany: vi.fn() },
  despesa: { findMany: vi.fn() },
};
vi.mock("@/lib/db", () => ({ prisma: dbMock }));

const { calcularMetricasPeriodo } = await import("@/lib/finance");

function vendaLegada(over: Record<string, unknown> = {}) {
  return {
    id: 1,
    vendedor: "Maria",
    dataVenda: new Date("2026-01-10T12:00:00.000Z"),
    status: "ativa",
    valorVenda: 400,
    quantidade: 2,
    custoProduto: 250,
    valorFrete: 0,
    desconto: 0,
    custoEnvio: 0,
    temNota: false,
    taxaNota: 5.97,
    taxaFinanceiraValor: null,
    itens: [],
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.usuario.findMany.mockResolvedValue([]);
  dbMock.despesa.findMany.mockResolvedValue([]);
});

describe("calcularMetricasPeriodo — venda sem itens", () => {
  it("CMV e lucro por vendedor multiplicam o custo unitario pela quantidade", async () => {
    dbMock.venda.findMany.mockResolvedValueOnce([vendaLegada()]);

    const m = await calcularMetricasPeriodo(new Date("2026-01-01"), new Date("2026-02-01"));

    expect(m.receita).toBe(800);
    expect(m.cmv).toBe(500);
    expect(m.porVendedor["Maria"].lucroLiquido).toBe(300);
  });

  it("venda com itens continua somando custo x quantidade dos itens", async () => {
    dbMock.venda.findMany.mockResolvedValueOnce([
      vendaLegada({
        custoProduto: 999,
        itens: [
          { subtotal: 300, custoProduto: 100, quantidade: 3 },
          { subtotal: 200, custoProduto: 50, quantidade: 2 },
        ],
      }),
    ]);

    const m = await calcularMetricasPeriodo(new Date("2026-01-01"), new Date("2026-02-01"));

    expect(m.cmv).toBe(400);
  });

  it("venda sem itens e sem custo entra com CMV 0", async () => {
    dbMock.venda.findMany.mockResolvedValueOnce([vendaLegada({ custoProduto: null })]);

    const m = await calcularMetricasPeriodo(new Date("2026-01-01"), new Date("2026-02-01"));

    expect(m.cmv).toBe(0);
  });
});

describe("resumo financeiro da IA — mesma regra de custo", () => {
  it("ai-actions nao soma custo de cabecalho sem a quantidade", () => {
    // O calculo saiu de ai-actions para resumirRelatorioVendas (src/lib/resumo-vendas.ts).
    const ia = readFileSync(join(process.cwd(), "src/lib/ai-actions.ts"), "utf8");
    const resumo = readFileSync(join(process.cwd(), "src/lib/resumo-vendas.ts"), "utf8");
    expect(ia.includes(": (v.custoProduto || 0);")).toBe(false);
    expect(ia.includes("resumirRelatorioVendas(")).toBe(true);
    expect(resumo.includes("custoTotalVenda(")).toBe(true);
  });
});
