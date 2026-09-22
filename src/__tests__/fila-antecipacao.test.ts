// Fila de antecipação com os cálculos no servidor (2026-09-11).
//
// Pedido do André: "de forma alguma os cálculos vêm do front, tudo deve vir do
// backend, o front só mostra". Estas funções rodam no servidor (page.tsx e a
// server action da seleção); a tela recebe o resultado pronto.
import { describe, it, expect } from "vitest";
import { calcularSelecao, contagensDaFila, mesesEmAberto } from "@/lib/fila-antecipacao";
import { parcelasDaVenda, type VendaParaResumo } from "@/lib/antecipacao-compradores";
import { algumMesNoIntervalo } from "@/lib/periodo-meses";
import { calcularAntecipacao, parsePeriodoMesAno, titulosDeVenda } from "@/lib/antecipacao";

const HOJE = "2026-09-11";

function p(vencimento: string, valor: number, antecipada = false, numeroParcela?: number) {
  return { numeroParcela, dataVencimento: `${vencimento}T00:00:00.000Z`, valorParcela: valor, antecipada };
}

function venda(dados: Partial<VendaParaResumo & { dataVenda: string }>): VendaParaResumo & { dataVenda: string } {
  return {
    id: 1,
    status: "ativa",
    antecipada: 0,
    clienteId: 1,
    clienteNome: "LUCIANA FERREIRA DIAS",
    empresa: "AMAZON FIVE",
    dataVenda: "2026-07-12T00:00:00.000Z",
    parcelas_detalhes: [],
    ...dados,
  };
}

describe("parcelasDaVenda — o popover das parcelas", () => {
  it("situação de cada parcela, contagens e totais — o caso do design", () => {
    const r = parcelasDaVenda(
      venda({
        antecipada: 3,
        parcelas_detalhes: [p("2026-09-10", 305, true, 2), p("2026-08-10", 305, false, 1), p("2026-10-10", 305, false, 3)],
      }),
      HOJE
    );
    expect(r.dataCompra).toBe("2026-07-12");
    expect(r.quantidade).toBe(3);
    expect(r.valorParcela).toBe(305);
    expect(r.lista.map((l) => [l.numero, l.vencimento, l.valor, l.situacao])).toEqual([
      [1, "2026-08-10", 305, "vencida"],
      [2, "2026-09-10", 305, "antecipada"],
      [3, "2026-10-10", 305, "a_antecipar"],
    ]);
    expect(r.contagem).toEqual({ antecipadas: 1, emAndamento: 0, aAntecipar: 1, vencidas: 1 });
    expect(r.totais).toEqual({ antecipado: 305, emAndamento: 0, faltaAntecipar: 305 });
    expect(r.desfeita).toBe(false);
  });

  it("parcelas de valores diferentes não têm valor único", () => {
    const r = parcelasDaVenda(venda({ parcelas_detalhes: [p("2026-10-10", 233.33, false, 1), p("2026-11-10", 233.34, false, 2)] }), HOJE);
    expect(r.valorParcela).toBeNull();
  });

  it("venda legada com antecipada = 1: todas as parcelas antecipadas", () => {
    const r = parcelasDaVenda(venda({ antecipada: 1, parcelas_detalhes: [p("2026-08-10", 100, false, 1), p("2026-10-10", 100, false, 2)] }), HOJE);
    expect(r.contagem).toEqual({ antecipadas: 2, emAndamento: 0, aAntecipar: 0, vencidas: 0 });
  });

  it("parcela baixada manualmente deixa de estar vencida e não volta para antecipação", () => {
    const r = parcelasDaVenda(venda({
      parcelas_detalhes: [{ ...p("2026-08-10", 100, false, 1), id: 9, paga: true, origemPagamento: "manual" }],
    }), HOJE);
    expect(r.lista[0]).toMatchObject({ id: 9, situacao: "paga", origemPagamento: "manual" });
    expect(r.contagem).toEqual({ antecipadas: 1, aAntecipar: 0, vencidas: 0 });
    expect(titulosDeVenda({ dataVenda: "2026-07-12", valorVenda: 100, parcelas: 1, parcelas_detalhes: [{ ...p("2026-08-10", 100), paga: true }] })).toEqual([]);
  });

  it("sem número gravado, numera pela ordem de vencimento", () => {
    const r = parcelasDaVenda(venda({ parcelas_detalhes: [p("2026-11-10", 100), p("2026-10-10", 100)] }), HOJE);
    expect(r.lista.map((l) => [l.numero, l.vencimento])).toEqual([
      [1, "2026-10-10"],
      [2, "2026-11-10"],
    ]);
  });

  it("venda cancelada não tem parcela a antecipar", () => {
    const r = parcelasDaVenda(venda({ status: "cancelada", parcelas_detalhes: [p("2026-10-10", 100, false, 1)] }), HOJE);
    expect(r.contagem).toEqual({ antecipadas: 0, emAndamento: 0, aAntecipar: 0, vencidas: 0 });
    expect(r.totais).toEqual({ antecipado: 0, emAndamento: 0, faltaAntecipar: 0 });
    // A tela diz "cancelada ou estornada" em vez de "sem parcelas cadastradas".
    expect(r.desfeita).toBe(true);
  });
});

describe("contagensDaFila — o número em cada opção dos dropdowns", () => {
  it("conta por empresa e por status sobre a fila inteira", () => {
    expect(
      contagensDaFila([
        { empresa: "AMAZON FIVE", status: "pendente" },
        { empresa: "AMAZON FIVE", status: "antecipado" },
        { empresa: null, status: "pendente" },
      ])
    ).toEqual({ total: 3, porEmpresa: { "AMAZON FIVE": 2 }, porStatus: { pendente: 2, antecipado: 1 } });
  });
});

describe("mesesEmAberto e algumMesNoIntervalo — o filtro de vencimento", () => {
  it("meses das parcelas não antecipadas, sem repetição e em ordem", () => {
    expect(
      mesesEmAberto([p("2026-11-10", 1), p("2026-10-10", 1), p("2026-10-25", 1), p("2026-12-10", 1, true)])
    ).toEqual(["2026-10", "2026-11"]);
  });

  it("compara pelo mês escolhido no seletor (MM/AAAA)", () => {
    expect(algumMesNoIntervalo(["2026-10", "2027-01"], "11/2026", "12/2026")).toBe(false);
    expect(algumMesNoIntervalo(["2026-10", "2027-01"], "12/2026", "01/2027")).toBe(true);
  });

  it("sem período, toda venda passa", () => {
    expect(algumMesNoIntervalo([], "", "")).toBe(true);
  });
});

describe("calcularSelecao — o card de seleção, calculado no servidor", () => {
  const vendas = [
    {
      dataVenda: "2026-07-12T00:00:00.000Z",
      valorVenda: 915,
      parcelas: 3,
      parcelas_detalhes: [p("2026-08-10", 305, false, 1), p("2026-09-10", 305, true, 2), p("2026-10-10", 305, false, 3)],
    },
    {
      dataVenda: "2026-08-04T00:00:00.000Z",
      valorVenda: 1800,
      parcelas: 4,
      parcelas_detalhes: [p("2026-09-10", 450, true, 1), p("2026-10-10", 450, true, 2), p("2026-11-10", 450, false, 3), p("2026-12-10", 450, false, 4)],
    },
  ];

  it("mesmos números de titulosDeVenda + calcularAntecipacao, e conta as vencidas", () => {
    const r = calcularSelecao(vendas, null, HOJE);
    const esperado = calcularAntecipacao(vendas.flatMap((v) => titulosDeVenda(v, null)));
    expect(r.vendas).toBe(2);
    expect(r.parcelas).toBe(4);
    expect(r.valorBruto).toBeCloseTo(esperado.valorBruto, 6);
    expect(r.prazoMedioDias).toBeCloseTo(esperado.prazoMedioDias, 6);
    expect(r.taxaPercent).toBeCloseTo(esperado.taxaPercent, 6);
    expect(r.valorLiquido).toBeCloseTo(esperado.valorLiquido, 6);
    expect(r.vencidas).toBe(1);
    expect(r.vendasSemParcelas).toBe(0);
    expect(r.parcelasCadastradas).toBe(4);
  });

  it("com período, só as parcelas que vencem nele", () => {
    const r = calcularSelecao(vendas, parsePeriodoMesAno("10/2026", "10/2026"), HOJE);
    expect(r.parcelas).toBe(1);
    expect(r.valorBruto).toBe(305);
    expect(r.vencidas).toBe(0);
  });

  it("venda sem parcela cadastrada conta em vendasSemParcelas — a action não consegue antecipá-la", () => {
    const r = calcularSelecao([{ dataVenda: "2026-08-01T00:00:00.000Z", valorVenda: 300, parcelas: 1, parcelas_detalhes: [] }], null, HOJE);
    expect(r.vendasSemParcelas).toBe(1);
  });

  it("parcelasCadastradas conta só títulos de parcela real — o que a action consegue antecipar", () => {
    // Venda legada (sem parcela gravada: o prazo de 30 dias gera títulos) + venda
    // com todas as parcelas já antecipadas. O card mostra 3 títulos, mas a action
    // não acharia nenhuma parcela: a tela precisa bloquear o Antecipar.
    const r = calcularSelecao(
      [
        { dataVenda: "2026-08-01T00:00:00.000Z", valorVenda: 300, parcelas: 3, parcelas_detalhes: [] },
        { dataVenda: "2026-08-01T00:00:00.000Z", valorVenda: 200, parcelas: 2, parcelas_detalhes: [p("2026-09-10", 100, true, 1), p("2026-10-10", 100, true, 2)] },
      ],
      null,
      HOJE
    );
    expect(r.parcelas).toBe(3);
    expect(r.parcelasCadastradas).toBe(0);
  });

  it("nada selecionado devolve zeros", () => {
    expect(calcularSelecao([], null, HOJE)).toEqual({
      vendas: 0,
      parcelas: 0,
      valorBruto: 0,
      valorTaxa: 0,
      valorLiquido: 0,
      prazoMedioDias: 0,
      taxaPercent: 0,
      vencidas: 0,
      vendasSemParcelas: 0,
      parcelasCadastradas: 0,
    });
  });
});
