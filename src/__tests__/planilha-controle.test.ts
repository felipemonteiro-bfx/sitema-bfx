// Planilha de controle no formato da equipe (2026-09-11): o modelo das abas,
// montado no servidor a partir das parcelas do desconto em folha.
import { describe, it, expect } from "vitest";
import {
  descreverProduto,
  formatarDocumento,
  mesDoDesconto,
  montarPlanilhaControle,
  nomeDaAba,
  normalizarFiltroPlanilha,
  ultimoDiaDoMes,
  type VendaParaPlanilha,
} from "@/lib/planilha-controle";

const HOJE = "2026-09-11";

function p(vencimento: string, valor: number, numero: number, antecipada = false) {
  return { numeroParcela: numero, dataVencimento: new Date(`${vencimento}T00:00:00.000Z`), valorParcela: valor, antecipada };
}

function venda(dados: Partial<VendaParaPlanilha>): VendaParaPlanilha {
  return {
    id: 1,
    status: "ativa",
    antecipada: 0,
    dataVenda: new Date("2026-07-12T00:00:00.000Z"),
    produtoNome: "FRITADEIRA ELÉTRICA 4L",
    itens: [],
    cliente: { nome: "LUCIANA FERREIRA DIAS", cpf: "03119321265", cnpj: null, empresa: "AMAZON FIVE" },
    parcelasVencimento: [],
    ...dados,
  };
}

describe("regras de mês e de formato", () => {
  it("o mês do desconto é o anterior ao vencimento (vence dia 10 do mês seguinte)", () => {
    expect(mesDoDesconto("2026-10-10")).toBe("2026-09");
    expect(mesDoDesconto("2027-01-10")).toBe("2026-12");
  });

  it("aba com o nome usado na planilha da equipe", () => {
    expect(nomeDaAba("2026-09")).toBe("SETEMBRO 2026");
    expect(nomeDaAba("2027-03")).toBe("MARÇO 2027");
  });

  it("desconto no último dia do mês da aba", () => {
    expect(ultimoDiaDoMes("2026-08")).toBe("2026-08-31");
    expect(ultimoDiaDoMes("2028-02")).toBe("2028-02-29");
  });

  it("CPF e CNPJ com máscara; já mascarado fica; vazio vira vazio", () => {
    expect(formatarDocumento("03119321265")).toBe("031.193.212-65");
    expect(formatarDocumento("031.193.212-65")).toBe("031.193.212-65");
    expect(formatarDocumento("12345678000190")).toBe("12.345.678/0001-90");
    expect(formatarDocumento(null)).toBe("");
  });

  it("produto: o nome da venda; com vários itens, a lista com quantidade", () => {
    expect(descreverProduto(venda({}))).toBe("FRITADEIRA ELÉTRICA 4L");
    expect(
      descreverProduto(
        venda({
          produtoNome: "VENTILADOR",
          itens: [
            { produtoNome: "VENTILADOR", quantidade: 2 },
            { produtoNome: "FORNO 50L", quantidade: 1 },
          ],
        })
      )
    ).toBe("2x VENTILADOR + FORNO 50L");
  });
});

describe("montarPlanilhaControle — abas, blocos e coluna K", () => {
  const vendas = [
    venda({ id: 1, parcelasVencimento: [p("2026-08-10", 305, 1), p("2026-09-10", 305, 2, true), p("2026-10-10", 305, 3)] }),
    venda({
      id: 2,
      dataVenda: new Date("2026-08-18T00:00:00.000Z"),
      produtoNome: "LAVADORA 12KG",
      cliente: { nome: "MARIANA COSTA RIBEIRO", cpf: "78521433000", cnpj: null, empresa: "EQUILIBRIUM" },
      parcelasVencimento: [p("2026-09-10", 450, 1, true), p("2026-10-10", 450, 2)],
    }),
  ];
  const { abas, resumo } = montarPlanilhaControle(vendas, {}, HOJE);

  it("uma aba por mês de desconto, em ordem", () => {
    expect(abas.map((a) => a.nome)).toEqual(["JULHO 2026", "AGOSTO 2026", "SETEMBRO 2026"]);
  });

  it("um bloco por empresa, em ordem alfabética, com o título da planilha", () => {
    expect(abas[1].blocos.map((b) => b.titulo)).toEqual([
      "DESCONTOS EM FOLHA AMAZON FIVE - AF/BFX",
      "DESCONTOS EM FOLHA EQUILIBRIUM - AF/BFX",
    ]);
  });

  it("cada linha é uma parcela com as colunas da planilha", () => {
    expect(abas[0].blocos[0].linhas).toEqual([
      {
        nome: "LUCIANA FERREIRA DIAS",
        cpf: "031.193.212-65",
        cargo: "",
        dataCompra: "2026-07-12",
        produto: "FRITADEIRA ELÉTRICA 4L",
        valor: 305,
        parcela: "1/3",
        dataDesconto: "2026-07-31",
        status: "VENCIDA - CONFERIR REPASSE",
      },
    ]);
  });

  it("status com as palavras da equipe", () => {
    expect(abas[1].blocos.flatMap((b) => b.linhas.map((l) => l.status))).toEqual(["ANTECIPAÇÃO OK", "ANTECIPAÇÃO OK"]);
    expect(abas[2].blocos.flatMap((b) => b.linhas.map((l) => l.status))).toEqual(["À VENCER", "À VENCER"]);
  });

  it("coluna K: o valor de cada parcela antecipada da aba", () => {
    expect(abas.map((a) => a.antecipados)).toEqual([[], [305, 450], []]);
  });

  it("resumo do popover", () => {
    expect(resumo).toEqual({ abas: 3, parcelas: 5, valorAntecipado: 755 });
  });
});

describe("montarPlanilhaControle — filtros e exclusões", () => {
  const amazon = venda({ id: 1, parcelasVencimento: [p("2026-09-10", 305, 1), p("2026-10-10", 305, 2)] });
  const equilibrium = venda({
    id: 2,
    cliente: { nome: "MARIANA COSTA RIBEIRO", cpf: null, cnpj: null, empresa: "EQUILIBRIUM" },
    parcelasVencimento: [p("2026-10-10", 450, 1)],
  });

  it("venda cancelada ou estornada não entra", () => {
    const { abas, resumo } = montarPlanilhaControle([venda({ status: "cancelada", parcelasVencimento: [p("2026-10-10", 100, 1)] })], {}, HOJE);
    expect(abas).toEqual([]);
    expect(resumo).toEqual({ abas: 0, parcelas: 0, valorAntecipado: 0 });
  });

  it("venda legada com o flag antecipada = 1: todas as parcelas ANTECIPAÇÃO OK", () => {
    const { abas } = montarPlanilhaControle([venda({ antecipada: 1, parcelasVencimento: [p("2026-10-10", 100, 1)] })], {}, HOJE);
    expect(abas[0].blocos[0].linhas[0].status).toBe("ANTECIPAÇÃO OK");
    expect(abas[0].antecipados).toEqual([100]);
  });

  it("filtra por empresa", () => {
    const { abas } = montarPlanilhaControle([amazon, equilibrium], { empresa: "EQUILIBRIUM" }, HOJE);
    expect(abas.map((a) => a.nome)).toEqual(["SETEMBRO 2026"]);
    expect(abas[0].blocos.map((b) => b.titulo)).toEqual(["DESCONTOS EM FOLHA EQUILIBRIUM - AF/BFX"]);
  });

  it("filtra pelos meses de desconto (MM/AAAA, como o seletor)", () => {
    const { abas } = montarPlanilhaControle([amazon, equilibrium], { mesInicio: "08/2026", mesFim: "08/2026" }, HOJE);
    expect(abas.map((a) => a.nome)).toEqual(["AGOSTO 2026"]);
  });

  it("sem os meses que já passaram, começa no mês de hoje", () => {
    const { abas } = montarPlanilhaControle([amazon, equilibrium], { incluirPassados: false }, HOJE);
    expect(abas.map((a) => a.nome)).toEqual(["SETEMBRO 2026"]);
  });

  it("venda sem empresa vai para o bloco SEM EMPRESA; linhas do bloco em ordem de nome", () => {
    const zuleide = venda({ id: 3, cliente: { nome: "ZULEIDE", cpf: null, cnpj: null, empresa: null }, parcelasVencimento: [p("2026-10-10", 10, 1)] });
    const ana = venda({ id: 4, cliente: { nome: "ANA", cpf: null, cnpj: null, empresa: null }, parcelasVencimento: [p("2026-10-10", 20, 1)] });
    const { abas } = montarPlanilhaControle([zuleide, ana], {}, HOJE);
    expect(abas[0].blocos[0].titulo).toBe("DESCONTOS EM FOLHA SEM EMPRESA - AF/BFX");
    expect(abas[0].blocos[0].linhas.map((l) => l.nome)).toEqual(["ANA", "ZULEIDE"]);
  });

  it("filtro de empresa não diferencia maiúsculas — como o bloco, que junta as grafias", () => {
    const outraGrafia = venda({
      id: 5,
      cliente: { nome: "CARLA", cpf: null, cnpj: null, empresa: "Amazon Five" },
      parcelasVencimento: [p("2026-10-10", 50, 1)],
    });
    const { abas } = montarPlanilhaControle([amazon, outraGrafia], { empresa: "AMAZON FIVE" }, HOJE);
    expect(abas.flatMap((a) => a.blocos.flatMap((b) => b.linhas.map((l) => l.nome)))).toContain("CARLA");
  });
});

describe("normalizarFiltroPlanilha", () => {
  it("mês sem zero à esquerda vira MM/AAAA; 'todas' é sem filtro; passados só desliga com false", () => {
    expect(normalizarFiltroPlanilha({ mesInicio: "8/2026", mesFim: " 10/2026 ", empresa: "todas" })).toEqual({
      mesInicio: "08/2026",
      mesFim: "10/2026",
      empresa: undefined,
      incluirPassados: true,
    });
    expect(normalizarFiltroPlanilha({ incluirPassados: false }).incluirPassados).toBe(false);
  });
});
