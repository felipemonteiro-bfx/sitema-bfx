import { describe, it, expect } from "vitest";
import {
  TAXA_MENSAL_PADRAO,
  prazoTituloDias,
  calcularPrazoMedioDias,
  calcularTaxaPercent,
  calcularAntecipacao,
  parsePeriodoMesAno,
  titulosDeVenda,
  vendaEhAntecipavel,
  WHERE_VENDA_ANTECIPAVEL,
  type TituloComPrazo,
  type VendaParaAntecipacao,
} from "@/lib/antecipacao";
import { FORMA_PAGAMENTO } from "@/lib/forma-pagamento";

/** 4 titulos iguais vencendo em 30/60/90/120 dias — o caso da planilha `taxa smart`. */
const VENDA_PLANILHA: VendaParaAntecipacao = {
  dataVenda: "2026-01-01T00:00:00.000Z",
  valorVenda: 4000,
  parcelas: 4,
  parcelas_detalhes: [
    { numeroParcela: 1, dataVencimento: "2026-01-31T00:00:00.000Z", valorParcela: 1000 },
    { numeroParcela: 2, dataVencimento: "2026-03-02T00:00:00.000Z", valorParcela: 1000 },
    { numeroParcela: 3, dataVencimento: "2026-04-01T00:00:00.000Z", valorParcela: 1000 },
    { numeroParcela: 4, dataVencimento: "2026-05-01T00:00:00.000Z", valorParcela: 1000 },
  ],
};

function titulo(valor: number, prazoDias: number): TituloComPrazo {
  return { valor, prazoDias };
}

describe("prazoTituloDias — D+1", () => {
  it("conta os dias corridos ate o vencimento e soma 1 (D+1)", () => {
    expect(prazoTituloDias("2026-01-01T00:00:00.000Z", "2026-01-31T00:00:00.000Z")).toBe(31);
  });

  it("vencimento no mesmo dia da venda vale 1 dia", () => {
    expect(prazoTituloDias("2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z")).toBe(1);
  });

  it("ignora a hora do dia — so a data conta", () => {
    expect(prazoTituloDias("2026-01-01T21:45:00.000Z", "2026-01-31T03:10:00.000Z")).toBe(31);
  });

  it("nunca retorna prazo negativo para titulo ja vencido", () => {
    expect(prazoTituloDias("2026-03-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z")).toBe(0);
  });
});

describe("calcularPrazoMedioDias", () => {
  it("reproduz o prazo medio da planilha: (31+61+91+121)/4 = 76", () => {
    const titulos = titulosDeVenda(VENDA_PLANILHA);
    expect(titulos.map((t) => t.prazoDias)).toEqual([31, 61, 91, 121]);
    expect(calcularPrazoMedioDias(titulos)).toBe(76);
  });

  it("pondera pelo valor: titulo grande e curto pesa mais que pequeno e longo", () => {
    const media = calcularPrazoMedioDias([titulo(1000, 31), titulo(100, 121)]);
    expect(media).toBeCloseTo(39.181818, 5);
  });

  it("lista vazia devolve 0 em vez de NaN", () => {
    expect(calcularPrazoMedioDias([])).toBe(0);
  });

  it("valor total zero devolve 0 em vez de dividir por zero", () => {
    expect(calcularPrazoMedioDias([titulo(0, 31), titulo(0, 61)])).toBe(0);
  });
});

describe("calcularTaxaPercent", () => {
  it("abaixo de 30 dias usa juros simples: N * (TX/30)", () => {
    expect(calcularTaxaPercent(16)).toBeCloseTo(2.128, 10);
  });

  it("a partir de 30 dias usa juros compostos", () => {
    // simples daria 5.985; composto da 6.0443...
    expect(calcularTaxaPercent(45)).toBeCloseTo(6.044309191912789, 10);
  });

  it("reproduz a TAXA TOTAL da planilha para 76 dias", () => {
    expect(calcularTaxaPercent(76)).toBeCloseTo(10.419386912884554, 10);
  });

  it("em exatamente 30 dias as duas formulas coincidem na taxa mensal cheia", () => {
    expect(calcularTaxaPercent(30)).toBeCloseTo(TAXA_MENSAL_PADRAO, 10);
  });

  it("prazo zero ou negativo nao gera taxa", () => {
    expect(calcularTaxaPercent(0)).toBe(0);
    expect(calcularTaxaPercent(-5)).toBe(0);
  });

  it("aceita uma taxa mensal diferente da padrao", () => {
    expect(calcularTaxaPercent(15, 3)).toBeCloseTo(1.5, 10);
  });
});

describe("parsePeriodoMesAno", () => {
  it("monta o intervalo UTC do primeiro ao ultimo instante do periodo", () => {
    const periodo = parsePeriodoMesAno("03/2026", "04/2026");
    expect(periodo?.inicio.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(periodo?.fim.toISOString()).toBe("2026-04-30T23:59:59.999Z");
  });

  it("aceita mes unico", () => {
    const periodo = parsePeriodoMesAno("02/2026", "02/2026");
    expect(periodo?.inicio.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(periodo?.fim.toISOString()).toBe("2026-02-28T23:59:59.999Z");
  });

  it("mes 13 nao vira janeiro do ano seguinte — devolve null", () => {
    expect(parsePeriodoMesAno("13/2025", "13/2025")).toBeNull();
  });

  it("rejeita intervalo invertido", () => {
    expect(parsePeriodoMesAno("06/2026", "03/2026")).toBeNull();
  });

  it.each([
    ["", ""],
    ["03/2026", ""],
    ["marco/2026", "04/2026"],
    ["3-2026", "04/2026"],
    ["00/2026", "04/2026"],
    ["03/26", "04/2026"],
  ])("rejeita entrada malformada (%s, %s)", (inicio, fim) => {
    expect(parsePeriodoMesAno(inicio, fim)).toBeNull();
  });

  it("null e undefined nao explodem", () => {
    expect(parsePeriodoMesAno(null, null)).toBeNull();
    expect(parsePeriodoMesAno(undefined, "04/2026")).toBeNull();
  });
});

describe("titulosDeVenda", () => {
  it("descarta parcelas ja antecipadas", () => {
    const titulos = titulosDeVenda({
      ...VENDA_PLANILHA,
      parcelas_detalhes: VENDA_PLANILHA.parcelas_detalhes!.map((p, i) => ({
        ...p,
        antecipada: i < 2,
      })),
    });
    expect(titulos.map((t) => t.prazoDias)).toEqual([91, 121]);
  });

  it("respeita o periodo de vencimento filtrado na tela", () => {
    const titulos = titulosDeVenda(VENDA_PLANILHA, {
      inicio: new Date("2026-03-01T00:00:00.000Z"),
      fim: new Date("2026-04-30T23:59:59.999Z"),
    });
    expect(titulos.map((t) => t.prazoDias)).toEqual([61, 91]);
  });

  it("descarta parcela com data de vencimento ilegivel", () => {
    const titulos = titulosDeVenda({
      ...VENDA_PLANILHA,
      parcelas_detalhes: [
        { numeroParcela: 1, dataVencimento: "data-invalida", valorParcela: 1000 },
        { numeroParcela: 2, dataVencimento: "2026-03-02T00:00:00.000Z", valorParcela: 1000 },
      ],
    });
    expect(titulos).toEqual([{ valor: 1000, prazoDias: 61 }]);
  });

  it("venda antiga sem parcelas_detalhes cai no fallback de 30 dias por parcela", () => {
    const titulos = titulosDeVenda({
      dataVenda: "2026-01-01T00:00:00.000Z",
      valorVenda: 4000,
      parcelas: 4,
    });
    // mesma media do calculo legado: (30*(n+1))/2 + 1 = 76
    expect(calcularPrazoMedioDias(titulos)).toBe(76);
    expect(titulos.map((t) => t.valor)).toEqual([1000, 1000, 1000, 1000]);
  });

  it("com periodo ativo o fallback nao gera titulo — a action nao antecipa o que nao existe", () => {
    const titulos = titulosDeVenda(
      { dataVenda: "2026-01-01T00:00:00.000Z", valorVenda: 4000, parcelas: 4 },
      { inicio: new Date("2026-03-01T00:00:00.000Z"), fim: new Date("2026-04-30T23:59:59.999Z") }
    );
    expect(titulos).toEqual([]);
  });

  it("venda sem valor nao gera titulo", () => {
    expect(titulosDeVenda({ dataVenda: "2026-01-01T00:00:00.000Z", valorVenda: 0, parcelas: 1 })).toEqual([]);
  });
});

describe("calcularAntecipacao", () => {
  it("resume bruto, taxa e liquido para o caso da planilha", () => {
    const resumo = calcularAntecipacao(titulosDeVenda(VENDA_PLANILHA));
    expect(resumo.prazoMedioDias).toBe(76);
    expect(resumo.taxaPercent).toBeCloseTo(10.419386912884554, 10);
    expect(resumo.valorBruto).toBe(4000);
    expect(resumo.valorTaxa).toBeCloseTo(416.7754765153822, 8);
    expect(resumo.valorLiquido).toBeCloseTo(3583.2245234846178, 8);
  });

  it("o bruto e a soma dos titulos que serao antecipados, nao o valor cheio da venda", () => {
    const parciais = titulosDeVenda({
      ...VENDA_PLANILHA,
      parcelas_detalhes: VENDA_PLANILHA.parcelas_detalhes!.map((p, i) => ({
        ...p,
        antecipada: i < 2,
      })),
    });
    expect(calcularAntecipacao(parciais).valorBruto).toBe(2000);
  });

  it("selecao vazia zera tudo sem NaN", () => {
    const resumo = calcularAntecipacao([]);
    expect(resumo).toEqual({
      prazoMedioDias: 0,
      taxaPercent: 0,
      valorBruto: 0,
      valorTaxa: 0,
      valorLiquido: 0,
    });
  });
});

describe("vendaEhAntecipavel — SE desconto em folha, ENTAO Prudent", () => {
  it("aceita venda com forma de pagamento desconto em folha", () => {
    expect(
      vendaEhAntecipavel({ formaPagamento: FORMA_PAGAMENTO.DESCONTO_FOLHA, descontoEmFolha: true })
    ).toBe(true);
  });

  it.each([
    FORMA_PAGAMENTO.BOLETO,
    FORMA_PAGAMENTO.PIX,
    FORMA_PAGAMENTO.DINHEIRO,
    FORMA_PAGAMENTO.CARTAO_CREDITO,
    FORMA_PAGAMENTO.CARTAO_DEBITO,
    FORMA_PAGAMENTO.TRANSFERENCIA,
    FORMA_PAGAMENTO.OUTRO,
  ])("rejeita venda em %s", (forma) => {
    expect(vendaEhAntecipavel({ formaPagamento: forma, descontoEmFolha: false })).toBe(false);
  });

  it("venda legada sem formaPagamento cai no flag descontoEmFolha", () => {
    expect(vendaEhAntecipavel({ formaPagamento: null, descontoEmFolha: true })).toBe(true);
    expect(vendaEhAntecipavel({ formaPagamento: null, descontoEmFolha: false })).toBe(false);
  });

  it("formaPagamento canonica vence o flag legado dessincronizado", () => {
    expect(
      vendaEhAntecipavel({ formaPagamento: FORMA_PAGAMENTO.PIX, descontoEmFolha: true })
    ).toBe(false);
  });

  it("forma presente mas invalida nao cai no legado — igual ao SQL, que exige IS NULL", () => {
    expect(vendaEhAntecipavel({ formaPagamento: "", descontoEmFolha: true })).toBe(false);
    expect(vendaEhAntecipavel({ formaPagamento: "Desconto em folha", descontoEmFolha: true })).toBe(false);
  });

  it("responde o mesmo que WHERE_VENDA_ANTECIPAVEL para qualquer venda", () => {
    // O filtro que roda em producao e o SQL; o predicado so vale se for equivalente.
    const [porForma, porLegado] = WHERE_VENDA_ANTECIPAVEL.OR;
    const casosSql = (v: { formaPagamento: string | null; descontoEmFolha: boolean }) =>
      v.formaPagamento === porForma.formaPagamento ||
      (v.formaPagamento === porLegado.formaPagamento && v.descontoEmFolha === porLegado.descontoEmFolha);

    const amostra = [
      { formaPagamento: FORMA_PAGAMENTO.DESCONTO_FOLHA, descontoEmFolha: true },
      { formaPagamento: FORMA_PAGAMENTO.DESCONTO_FOLHA, descontoEmFolha: false },
      { formaPagamento: FORMA_PAGAMENTO.PIX, descontoEmFolha: true },
      { formaPagamento: FORMA_PAGAMENTO.CARTAO_CREDITO, descontoEmFolha: false },
      { formaPagamento: null, descontoEmFolha: true },
      { formaPagamento: null, descontoEmFolha: false },
      { formaPagamento: "", descontoEmFolha: true },
      { formaPagamento: "Desconto em folha", descontoEmFolha: true },
    ];

    for (const venda of amostra) {
      expect(vendaEhAntecipavel(venda)).toBe(casosSql(venda));
    }
  });
});
