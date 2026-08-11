import { describe, it, expect } from "vitest";
import {
  COLUNAS_VENDAS,
  COLUNAS_PADRAO,
  COLUNAS_SENSIVEIS,
  resolverColunas,
  cabecalhoCsv,
  linhaCsv,
  celulaPdf,
  filtrarColunasPorPerfil,
  calcularLayoutPdf,
  truncarParaLargura,
  type VendaRelatorio,
} from "@/lib/relatorio-vendas-colunas";

function vendaBase(over: Partial<VendaRelatorio> = {}): VendaRelatorio {
  return {
    dataVenda: new Date(Date.UTC(2026, 6, 2, 0, 0, 0, 0)),
    vendedor: "Ana",
    parcelas: 3,
    formaPagamento: "PIX",
    cliente: { empresa: "Empresa X", nome: "João", matricula: "123", renda: null },
    itens: [{ produtoNome: "Fone", quantidade: 1, subtotal: 200, custoProduto: 0 }],
    ...over,
  };
}

describe("resolverColunas", () => {
  it("param ausente, vazio ou so espaco cai no padrao, nessa ordem", () => {
    expect(resolverColunas(null).map((c) => c.key)).toEqual(COLUNAS_PADRAO);
    expect(resolverColunas(undefined).map((c) => c.key)).toEqual(COLUNAS_PADRAO);
    expect(resolverColunas("").map((c) => c.key)).toEqual(COLUNAS_PADRAO);
    expect(resolverColunas("   ").map((c) => c.key)).toEqual(COLUNAS_PADRAO);
  });

  it("sem nenhuma key valida cai no padrao", () => {
    expect(resolverColunas("banana,foo").map((c) => c.key)).toEqual(COLUNAS_PADRAO);
  });

  it("descarta key desconhecida e devolve em ordem canonica, nao na ordem digitada", () => {
    expect(resolverColunas("nome,banana,empresa").map((c) => c.key)).toEqual(["empresa", "nome"]);
  });

  it("deduplica keys repetidas", () => {
    expect(resolverColunas("nome,nome,empresa").map((c) => c.key)).toEqual(["empresa", "nome"]);
  });
});

describe("catalogo COLUNAS_VENDAS", () => {
  it("cabecalhoCsv do padrao e byte a byte igual ao header de hoje", () => {
    expect(cabecalhoCsv(resolverColunas(null))).toBe(
      "Matricula,Nome,Produtos,Vendedor,Data,Valor,Parcelas,Pagamento"
    );
  });

  it("labelCurto do conjunto padrao e o esperado", () => {
    expect(resolverColunas(null).map((c) => c.labelCurto)).toEqual([
      "Mat.",
      "Nome",
      "Produtos",
      "Vendedor",
      "Data",
      "Valor",
      "Parc.",
      "Pagto.",
    ]);
  });

  it("margemPct devolve percentual quando ha custo, null quando nao ha", () => {
    const coluna = COLUNAS_VENDAS.find((c) => c.key === "margemPct")!;
    const comCusto = vendaBase({
      itens: [{ produtoNome: "Fone", quantidade: 1, subtotal: 200, custoProduto: 100 }],
    });
    const semCusto = vendaBase({
      itens: [{ produtoNome: "Fone", quantidade: 1, subtotal: 200, custoProduto: 0 }],
    });
    expect(coluna.valor(comCusto)).toBe(50);
    expect(coluna.valor(semCusto)).toBeNull();
  });

  it("margemConsignavel devolve 30% da renda, null quando renda ausente", () => {
    const coluna = COLUNAS_VENDAS.find((c) => c.key === "margemConsignavel")!;
    const comRenda = vendaBase({ cliente: { empresa: "X", nome: "Joao", matricula: "1", renda: 3000 } });
    const semRenda = vendaBase({ cliente: { empresa: "X", nome: "Joao", matricula: "1", renda: null } });
    expect(coluna.valor(comRenda)).toBe(900);
    expect(coluna.valor(semRenda)).toBeNull();
  });

  it("margemPct vira vazio no CSV e travessao no PDF quando null", () => {
    const colunas = [COLUNAS_VENDAS.find((c) => c.key === "margemPct")!];
    const semCusto = vendaBase({
      itens: [{ produtoNome: "Fone", quantidade: 1, subtotal: 200, custoProduto: 0 }],
    });
    expect(linhaCsv(colunas, semCusto)).toBe("");
    expect(celulaPdf(colunas[0]!, semCusto)).toBe("—");
  });

  it("margemConsignavel vira vazio no CSV e travessao no PDF quando null", () => {
    const colunas = [COLUNAS_VENDAS.find((c) => c.key === "margemConsignavel")!];
    const semRenda = vendaBase({ cliente: { empresa: "X", nome: "Joao", matricula: "1", renda: null } });
    expect(linhaCsv(colunas, semRenda)).toBe("");
    expect(celulaPdf(colunas[0]!, semRenda)).toBe("—");
  });

  it("linhaCsv envolve em aspas e escapa um nome de cliente que contenha virgula", () => {
    const colunas = resolverColunas("nome");
    const venda = vendaBase({ cliente: { empresa: "X", nome: 'Silva, João "Jota"', matricula: "1", renda: null } });
    expect(linhaCsv(colunas, venda)).toBe('"Silva, João ""Jota"""');
  });

  it("celula de data a partir de um Date de meia-noite UTC formata o mesmo dia do calendario (regressao d9064ee)", () => {
    const coluna = COLUNAS_VENDAS.find((c) => c.key === "data")!;
    const venda = vendaBase({ dataVenda: new Date(Date.UTC(2026, 6, 2, 0, 0, 0, 0)) });
    expect(linhaCsv([coluna], venda)).toBe("2026-07-02");
    expect(celulaPdf(coluna, venda)).toBe("02/07/2026");
  });

  it("filtrarColunasPorPerfil remove colunas sensiveis quando nao-admin, mantem quando admin", () => {
    const semAdmin = filtrarColunasPorPerfil(COLUNAS_VENDAS, false);
    const comAdmin = filtrarColunasPorPerfil(COLUNAS_VENDAS, true);
    expect(semAdmin.some((c) => COLUNAS_SENSIVEIS.includes(c.key))).toBe(false);
    expect(comAdmin.filter((c) => COLUNAS_SENSIVEIS.includes(c.key)).length).toBe(2);
  });
});

describe("calcularLayoutPdf", () => {
  it("8 faixas do padrao: primeira em x=40, x crescente, sem invasao, fim <= 802", () => {
    const layout = calcularLayoutPdf(resolverColunas(null), 40, 762);
    expect(layout.length).toBe(8);
    expect(layout[0]!.x).toBe(40);
    for (let i = 1; i < layout.length; i++) {
      expect(layout[i]!.x).toBeGreaterThan(layout[i - 1]!.x);
      expect(layout[i]!.x).toBeGreaterThanOrEqual(layout[i - 1]!.x + layout[i - 1]!.largura);
    }
    const ultima = layout[layout.length - 1]!;
    expect(ultima.x + ultima.largura).toBeLessThanOrEqual(802);
  });

  it("larguras do padrao batem com as de hoje dentro de 2pt de tolerancia", () => {
    const layout = calcularLayoutPdf(resolverColunas(null), 40, 762);
    const esperadas = [55, 105, 160, 110, 85, 90, 40, 117];
    layout.forEach((faixa, i) => {
      expect(Math.abs(faixa.largura - esperadas[i]!)).toBeLessThanOrEqual(2);
    });
  });

  it("uma coluna so ocupa a largura util inteira", () => {
    const coluna = COLUNAS_VENDAS.find((c) => c.key === "nome")!;
    const layout = calcularLayoutPdf([coluna], 40, 762);
    expect(layout.length).toBe(1);
    expect(layout[0]!.largura).toBeCloseTo(762, 5);
  });

  it("com as 13 colunas ainda cabe: soma <= 762, nenhuma largura negativa ou zero", () => {
    const layout = calcularLayoutPdf(COLUNAS_VENDAS, 40, 762);
    const soma = layout.reduce((s, f) => s + f.largura, 0);
    expect(soma).toBeLessThanOrEqual(762 + 0.01);
    layout.forEach((f) => expect(f.largura).toBeGreaterThan(0));
  });
});

describe("truncarParaLargura", () => {
  const medir5pt = (t: string) => t.length * 5;

  it("corta para o maior prefixo que cabe", () => {
    expect(truncarParaLargura("ABCDEFGHIJ", 20, medir5pt)).toBe("ABCD");
  });

  it("devolve o texto inteiro quando ja cabe", () => {
    expect(truncarParaLargura("AB", 20, medir5pt)).toBe("AB");
  });
});
