// Margem por produto: sem vendas canceladas/estornadas e com as vendas sem itens (2026-09-16).
//
// O relatorio `/api/relatorios/margem-produto` e a ferramenta `resumo_margem_produto` da IA
// liam `itens_venda` direto: somavam venda cancelada e ignoravam venda so de cabecalho (18 em
// producao). A agregacao passa a sair de uma funcao so, testada aqui. O CSV escapava nada:
// produto com virgula quebrava a coluna.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { agregarMargemPorProduto } from "@/lib/margem-produto";
import { celulaCsv, linhaCsv } from "@/lib/csv";

function venda(over: Record<string, unknown> = {}) {
  return {
    status: "ativa",
    produtoNome: null,
    valorVenda: null,
    quantidade: null,
    custoProduto: null,
    itens: [] as { produtoNome: string; subtotal: number; custoProduto: number; quantidade: number }[],
    ...over,
  };
}

describe("agregarMargemPorProduto", () => {
  it("soma itens por produto e calcula lucro e margem", () => {
    const linhas = agregarMargemPorProduto([
      venda({ itens: [{ produtoNome: "BOTA", subtotal: 510, custoProduto: 100, quantidade: 2 }] }),
      venda({ itens: [{ produtoNome: "BOTA", subtotal: 255, custoProduto: 100, quantidade: 1 }] }),
    ]);
    expect(linhas).toEqual([
      { produto: "BOTA", quantidade: 3, custoTotal: 300, receitaTotal: 765, lucro: 465, margemPct: (465 / 765) * 100 },
    ]);
  });

  it("ignora venda cancelada e estornada", () => {
    const linhas = agregarMargemPorProduto([
      venda({ status: "cancelada", itens: [{ produtoNome: "FONE", subtotal: 180, custoProduto: 90, quantidade: 1 }] }),
      venda({ status: "estornada", itens: [{ produtoNome: "FONE", subtotal: 180, custoProduto: 90, quantidade: 1 }] }),
      venda({ itens: [{ produtoNome: "FONE", subtotal: 180, custoProduto: 90, quantidade: 1 }] }),
    ]);
    expect(linhas).toHaveLength(1);
    expect(linhas[0].receitaTotal).toBe(180);
    expect(linhas[0].quantidade).toBe(1);
  });

  it("venda sem itens entra pelo cabecalho: valor x quantidade e custo unitario x quantidade", () => {
    const linhas = agregarMargemPorProduto([
      venda({ produtoNome: "KIT NATURA", valorVenda: 465, quantidade: 2, custoProduto: 200 }),
    ]);
    expect(linhas).toEqual([
      { produto: "KIT NATURA", quantidade: 2, custoTotal: 400, receitaTotal: 930, lucro: 530, margemPct: (530 / 930) * 100 },
    ]);
  });

  it("produto sem nome agrupa como 'Sem nome' e receita zero nao divide por zero", () => {
    const linhas = agregarMargemPorProduto([venda({ produtoNome: "  ", valorVenda: 0, quantidade: 1, custoProduto: 10 })]);
    expect(linhas[0].produto).toBe("Sem nome");
    expect(linhas[0].margemPct).toBe(0);
  });

  it("ordena por lucro, maior primeiro", () => {
    const linhas = agregarMargemPorProduto([
      venda({ itens: [{ produtoNome: "A", subtotal: 100, custoProduto: 90, quantidade: 1 }] }),
      venda({ itens: [{ produtoNome: "B", subtotal: 100, custoProduto: 10, quantidade: 1 }] }),
    ]);
    expect(linhas.map((l) => l.produto)).toEqual(["B", "A"]);
  });
});

describe("celulaCsv / linhaCsv", () => {
  it("campo com virgula, aspas ou quebra de linha vai entre aspas com aspas dobradas", () => {
    expect(celulaCsv("CONJUNTO, COURO")).toBe('"CONJUNTO, COURO"');
    expect(celulaCsv('BOTA "LINXX"')).toBe('"BOTA ""LINXX"""');
    expect(celulaCsv("A\nB")).toBe('"A\nB"');
  });

  it("texto que comeca com = + - @ nao vira formula na planilha", () => {
    expect(celulaCsv("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(celulaCsv("@SOMA")).toBe("'@SOMA");
    expect(celulaCsv("\t=1+1")).toBe("'\t=1+1");
  });

  it("numero nao ganha apostrofo, nem negativo, nem vindo como texto (toFixed)", () => {
    expect(celulaCsv(-12.5)).toBe("-12.5");
    expect(celulaCsv(0)).toBe("0");
    expect(celulaCsv("-10.00")).toBe("-10.00");
    expect(celulaCsv("+3")).toBe("+3");
  });

  it("linhaCsv junta as celulas escapadas", () => {
    expect(linhaCsv(["X, Y", 3, "10.00"])).toBe('"X, Y",3,10.00');
  });
});

describe("consumidores", () => {
  const ler = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

  it("rota de margem e IA usam a agregacao unica", () => {
    expect(ler("src/app/api/relatorios/margem-produto/route.ts").includes("agregarMargemPorProduto(")).toBe(true);
    expect(ler("src/lib/ai-actions.ts").includes("agregarMargemPorProduto(")).toBe(true);
  });

  it("rota de margem escapa o CSV", () => {
    const rota = ler("src/app/api/relatorios/margem-produto/route.ts");
    expect(rota.includes("linhaCsv(")).toBe(true);
    expect(rota.includes('].join(",")')).toBe(false);
  });

  it("resumo de vendas da IA exclui cancelada e estornada, como o DRE", () => {
    const ia = ler("src/lib/ai-actions.ts");
    const inicio = ia.indexOf('case "resumo_relatorio_vendas"');
    const trecho = ia.slice(inicio, ia.indexOf("case ", inicio + 10));
    expect(trecho.includes("FILTRO_VENDA_VALIDA")).toBe(true);
  });
});
