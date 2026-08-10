import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Mocks — mesmo padrao de fornecedores-post-route.test.ts: objeto local de
// mock, nunca importar `prisma` real no teste. O mock e so exigido pelo
// Bloco B (`finance.ts` importa `@/lib/db`); o Bloco A e puro e nao se
// importa com ele.
const dbMock = {
  venda: { findMany: vi.fn() },
  usuario: { findMany: vi.fn() },
  despesa: { findMany: vi.fn() },
};
vi.mock("@/lib/db", () => ({ prisma: dbMock }));

import {
  custoAntecipacaoVenda,
  lucroLiquidoComAntecipacao,
  type VendaParaCustoAntecipacao,
} from "@/lib/antecipacao-custo";
import { FORMA_PAGAMENTO, formaFromLegacyFlags } from "@/lib/forma-pagamento";

const { calcularMetricasPeriodo, calcularDre } = await import("@/lib/finance");

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), "utf8");

/**
 * Remove comentarios de bloco e de linha antes de procurar por um trecho no
 * fonte — sem isto um comentario dizendo "nao usar despesa.create aqui"
 * casaria com o proprio gate que deveria acusar o oposto.
 */
function semComentarios(src: string): string {
  const semBloco = src.replace(/\/\*[\s\S]*?\*\//g, "");
  return semBloco
    .split("\n")
    .filter((linha) => !linha.trim().startsWith("//"))
    .join("\n");
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.usuario.findMany.mockResolvedValue([]);
  dbMock.despesa.findMany.mockResolvedValue([]);
});

/** 4 titulos de 1000 vencendo 31/61/91/121 dias — o caso da planilha `taxa smart`. */
const VENDA_PLANILHA_4X1000: VendaParaCustoAntecipacao = {
  formaPagamento: FORMA_PAGAMENTO.DESCONTO_FOLHA,
  dataVenda: "2026-01-01T00:00:00.000Z",
  valorVenda: 4000,
  parcelas: 4,
  parcelas_detalhes: [
    { dataVencimento: "2026-01-31T00:00:00.000Z", valorParcela: 1000 },
    { dataVencimento: "2026-03-02T00:00:00.000Z", valorParcela: 1000 },
    { dataVencimento: "2026-04-01T00:00:00.000Z", valorParcela: 1000 },
    { dataVencimento: "2026-05-01T00:00:00.000Z", valorParcela: 1000 },
  ],
};

describe("custoAntecipacaoVenda — Bloco A (modulo puro)", () => {
  it("Teste 1 (numero dourado): 4 parcelas de 1000 vencendo 31/61/91/121 dias -> 416.78", () => {
    expect(custoAntecipacaoVenda(VENDA_PLANILHA_4X1000)).toBe(416.78);
  });

  it("Teste 2: a mesma venda em PIX nao vai para a Prudent -> null (nulo, nao zero)", () => {
    expect(
      custoAntecipacaoVenda({ ...VENDA_PLANILHA_4X1000, formaPagamento: FORMA_PAGAMENTO.PIX })
    ).toBeNull();
  });

  it("Teste 3 (legado): formaPagamento nulo + descontoEmFolha true -> mesmo custo da forma canonica", () => {
    expect(
      custoAntecipacaoVenda({ ...VENDA_PLANILHA_4X1000, formaPagamento: null, descontoEmFolha: true })
    ).toBe(416.78);
  });

  it("Teste 4 (legado nao vence forma canonica): formaPagamento PIX + descontoEmFolha true -> null", () => {
    expect(
      custoAntecipacaoVenda({
        ...VENDA_PLANILHA_4X1000,
        formaPagamento: FORMA_PAGAMENTO.PIX,
        descontoEmFolha: true,
      })
    ).toBeNull();
  });

  it("Teste 5: o flag `antecipada` da fila da Prudent nao apaga o custo — a venda inteira ja e custo real", () => {
    const marcada: VendaParaCustoAntecipacao = {
      ...VENDA_PLANILHA_4X1000,
      parcelas_detalhes: VENDA_PLANILHA_4X1000.parcelas_detalhes!.map((p) => ({
        ...p,
        antecipada: true,
      })),
    };
    expect(custoAntecipacaoVenda(marcada)).toBe(416.78);
  });

  it("Teste 6 (fallback com o TOTAL): sem parcelas_detalhes, total 1000 em 1 parcela -> 41.26", () => {
    // Nota de execucao (desvio do plano, documentado no SUMMARY): o plano
    // (fatos_travados #7) descreve este caso como "juros simples 4,123% ->
    // 41,23". Mas o prazo desta parcela fallback e 31 dias
    // (DIAS_NO_MES*(0+1)+1, igual ao padrao 30/60/90 usado nas demais), e
    // `calcularTaxaPercent` de `@/lib/antecipacao` so usa juros simples
    // quando `prazoMedioDias < 30` — 31 cai no ramo de juros compostos.
    // Rodando a formula real (nao reescrita, nao duplicada) por
    // `node --input-type=module` fora do bundler: 31 dias compostos a
    // 3,99% a.m. da 4,125707...% sobre R$ 1.000 = R$ 41,257... -> R$ 41,26
    // arredondado a centavo. O numero abaixo e o que a formula ja aprovada
    // realmente produz, nao um recalculo alternativo.
    expect(
      custoAntecipacaoVenda({
        formaPagamento: FORMA_PAGAMENTO.DESCONTO_FOLHA,
        dataVenda: "2026-01-01T00:00:00.000Z",
        valorVenda: 1000,
        parcelas: 1,
      })
    ).toBe(41.26);
  });

  it("Teste 7: arredondamento a centavo — nunca o float cru da formula", () => {
    const custo = custoAntecipacaoVenda(VENDA_PLANILHA_4X1000);
    expect(custo).toBe(416.78);
    expect(custo).not.toBe(416.7754765153822);
  });

  it("Teste 8: lucroLiquidoComAntecipacao desconta quando ha custo e preserva quando nulo", () => {
    expect(lucroLiquidoComAntecipacao(1000, 416.78)).toBe(583.22);
    expect(lucroLiquidoComAntecipacao(1000, null)).toBe(1000);
  });

  it("Teste 9: venda degenerada (sem parcela, total 0) -> custo 0, nunca NaN nem null", () => {
    expect(
      custoAntecipacaoVenda({
        formaPagamento: FORMA_PAGAMENTO.DESCONTO_FOLHA,
        dataVenda: "2026-01-01T00:00:00.000Z",
        valorVenda: 0,
        parcelas: null,
      })
    ).toBe(0);
  });
});

/** Fabrica uma venda minima para os testes de `finance.ts`, sem itens (usa os campos legados). */
function vendaFake(v: {
  vendedor: string;
  valorVenda: number;
  custoProduto?: number;
  taxaFinanceiraValor?: number | null;
}) {
  return {
    vendedor: v.vendedor,
    valorVenda: v.valorVenda,
    quantidade: 1,
    valorFrete: 0,
    desconto: 0,
    custoProduto: v.custoProduto ?? 0,
    custoEnvio: 0,
    temNota: false,
    taxaNota: 5.97,
    taxaFinanceiraValor: v.taxaFinanceiraValor ?? null,
    itens: [],
  };
}

describe("calcularMetricasPeriodo / calcularDre — Bloco B (custo lido da coluna, nao recalculado)", () => {
  it("Teste 10: custosVar de duas vendas de 1000 (uma com taxa 416.78, outra nula) e exatamente 416.78 maior que o mesmo cenario com as duas nulas", async () => {
    dbMock.venda.findMany.mockResolvedValueOnce([
      vendaFake({ vendedor: "V1", valorVenda: 1000, taxaFinanceiraValor: 416.78 }),
      vendaFake({ vendedor: "V1", valorVenda: 1000, taxaFinanceiraValor: null }),
    ]);
    const comTaxa = await calcularMetricasPeriodo(new Date("2026-01-01"), new Date("2026-02-01"));

    dbMock.venda.findMany.mockResolvedValueOnce([
      vendaFake({ vendedor: "V1", valorVenda: 1000, taxaFinanceiraValor: null }),
      vendaFake({ vendedor: "V1", valorVenda: 1000, taxaFinanceiraValor: null }),
    ]);
    const semTaxa = await calcularMetricasPeriodo(new Date("2026-01-01"), new Date("2026-02-01"));

    expect(Math.round((comTaxa.custosVar - semTaxa.custosVar) * 100) / 100).toBe(416.78);
  });

  it("Teste 11: porVendedor desconta a taxa so da venda que a tem", async () => {
    dbMock.venda.findMany.mockResolvedValueOnce([
      vendaFake({ vendedor: "Maria", valorVenda: 1000, custoProduto: 200, taxaFinanceiraValor: 416.78 }),
      vendaFake({ vendedor: "Joao", valorVenda: 1000, custoProduto: 300, taxaFinanceiraValor: null }),
    ]);

    const metrics = await calcularMetricasPeriodo(new Date("2026-01-01"), new Date("2026-02-01"));

    expect(metrics.porVendedor["Maria"].lucroLiquido).toBe(383.22);
    expect(metrics.porVendedor["Joao"].lucroLiquido).toBe(700);
  });

  it("Teste 12: calcularDre expoe detalhe.taxaAntecipacao e margem/lucro caem exatamente esse valor", async () => {
    dbMock.venda.findMany.mockResolvedValueOnce([
      vendaFake({ vendedor: "V1", valorVenda: 1000, taxaFinanceiraValor: 416.78 }),
      vendaFake({ vendedor: "V1", valorVenda: 1000, taxaFinanceiraValor: null }),
    ]);
    const dreComTaxa = await calcularDre("2026-01");

    dbMock.venda.findMany.mockResolvedValueOnce([
      vendaFake({ vendedor: "V1", valorVenda: 1000, taxaFinanceiraValor: null }),
      vendaFake({ vendedor: "V1", valorVenda: 1000, taxaFinanceiraValor: null }),
    ]);
    const dreSemTaxa = await calcularDre("2026-01");

    expect(dreComTaxa.detalhe.taxaAntecipacao).toBe(416.78);
    expect(Math.round((dreSemTaxa.margem - dreComTaxa.margem) * 100) / 100).toBe(416.78);
    expect(Math.round((dreSemTaxa.lucro - dreComTaxa.lucro) * 100) / 100).toBe(416.78);
  });

  it("Teste 13 (a fonte e a coluna, nao o recalculo): venda em DESCONTO_FOLHA com parcelas reais mas taxaFinanceiraValor nulo contribui 0 — o custo nao evapora quando a fila marca as parcelas como antecipadas", async () => {
    dbMock.venda.findMany.mockResolvedValueOnce([
      {
        ...vendaFake({ vendedor: "V1", valorVenda: 4000, taxaFinanceiraValor: null }),
        formaPagamento: FORMA_PAGAMENTO.DESCONTO_FOLHA,
        parcelasVencimento: [
          { dataVencimento: new Date("2026-01-31"), valorParcela: 1000, antecipada: true },
          { dataVencimento: new Date("2026-03-02"), valorParcela: 1000, antecipada: true },
          { dataVencimento: new Date("2026-04-01"), valorParcela: 1000, antecipada: true },
          { dataVencimento: new Date("2026-05-01"), valorParcela: 1000, antecipada: true },
        ],
      },
    ]);

    const metrics = await calcularMetricasPeriodo(new Date("2026-01-01"), new Date("2026-02-01"));

    expect(metrics.taxaAntecipacao).toBe(0);
  });

  it("Teste 14: a linha `comissoes` e receita x percentual e nao muda quando a taxa aparece — sem dupla contagem", async () => {
    dbMock.venda.findMany.mockResolvedValueOnce([
      vendaFake({ vendedor: "V1", valorVenda: 1000, taxaFinanceiraValor: 416.78 }),
    ]);
    const comTaxa = await calcularMetricasPeriodo(new Date("2026-01-01"), new Date("2026-02-01"));

    dbMock.venda.findMany.mockResolvedValueOnce([
      vendaFake({ vendedor: "V1", valorVenda: 1000, taxaFinanceiraValor: null }),
    ]);
    const semTaxa = await calcularMetricasPeriodo(new Date("2026-01-01"), new Date("2026-02-01"));

    expect(comTaxa.comissoes).toBe(semTaxa.comissoes);
  });
});

describe("Bloco C — gates de fonte", () => {
  it("Teste 15: nenhum dos caminhos da taxa cria linha de despesa (senao finance.ts somaria o mesmo desagio de novo via `variaveis`)", () => {
    const arquivos = [
      "src/lib/antecipacao-custo.ts",
      "src/lib/finance.ts",
      "src/app/(app)/venda-rapida/actions.ts",
      "src/app/(app)/historico/actions.ts",
    ];
    for (const arquivo of arquivos) {
      const fonte = semComentarios(ler(arquivo));
      expect(fonte).not.toContain("despesa.create");
    }
  });

  it("Teste 16: a fiacao do caminho de criacao existe — venda-rapida/actions.ts importa o modulo e grava taxaFinanceiraValor", () => {
    const fonte = ler("src/app/(app)/venda-rapida/actions.ts");
    expect(fonte).toContain("custoAntecipacaoVenda");
    expect(fonte).toContain("@/lib/antecipacao-custo");
    expect(fonte).toContain("taxaFinanceiraValor");
  });

  it("Teste 17: caminhos legados (V1, importacao, IA) seguem incapazes de gerar desconto em folha", () => {
    for (let parcelas = 1; parcelas <= 12; parcelas++) {
      const forma = formaFromLegacyFlags({ descontoEmFolha: false, boleto: false, parcelas });
      expect(forma).not.toBe(FORMA_PAGAMENTO.DESCONTO_FOLHA);
    }
  });
});
