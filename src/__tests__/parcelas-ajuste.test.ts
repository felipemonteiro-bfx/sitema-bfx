// Trava de regressao do bug de ajuste de parcelas na edicao do Historico (D-01, D-02, D-03).
//
// `edit-parcelas-section.tsx` passava `disableAutoInit={initialParcelas.length > 0}` — um
// booleano fixo, verdadeiro para toda venda ja parcelada, que travava a geracao da lista de
// datas de vencimento pra sempre. Trocar o campo Parcelas de 2 para 4 mudava o cabecalho
// (`venda.parcelas`) mas nunca as linhas (`parcelas_vencimento`) — a venda 182 em producao
// ficou com `parcelas = 4` e 5 linhas gravadas, o rastro real do defeito.
//
// Este teste trava a regra pura de ajuste, sem nenhum componente React: `ajustarParcelas`
// decide quantas linhas existem e quais datas elas tem quando o numero de parcelas muda, e
// `redistribuirValores` decide como o valor total e dividido entre elas.
import { describe, it, expect } from "vitest";
import { ajustarParcelas, redistribuirValores, type ParcelaAjuste } from "@/lib/parcelas-ajuste";

function parcela(numeroParcela: number, dataVencimento: string, valorParcela: number): ParcelaAjuste {
  return { numeroParcela, dataVencimento, valorParcela };
}

describe("ajustarParcelas (D-01, D-02, D-03)", () => {
  it("N nao muda (3 -> 3): as tres datas voltam identicas as de entrada", () => {
    const parcelas = [
      parcela(1, "2026-01-10", 100),
      parcela(2, "2026-02-10", 100),
      parcela(3, "2026-03-10", 100),
    ];
    const { parcelas: resultado } = ajustarParcelas({
      parcelas,
      numeroParcelas: 3,
      valorTotal: 300,
    });
    expect(resultado.map((p) => p.dataVencimento)).toEqual([
      "2026-01-10",
      "2026-02-10",
      "2026-03-10",
    ]);
  });

  it("crescimento 2 -> 4: as duas primeiras intactas (numero, data, ordem), as duas novas em cadencia mensal", () => {
    const parcelas = [
      parcela(1, "2026-01-10", 500),
      parcela(2, "2026-02-10", 500),
    ];
    const { parcelas: resultado } = ajustarParcelas({
      parcelas,
      numeroParcelas: 4,
      valorTotal: 2000,
    });
    expect(resultado).toHaveLength(4);
    expect(resultado[0]).toMatchObject({ numeroParcela: 1, dataVencimento: "2026-01-10" });
    expect(resultado[1]).toMatchObject({ numeroParcela: 2, dataVencimento: "2026-02-10" });
    expect(resultado[2]).toMatchObject({ numeroParcela: 3, dataVencimento: "2026-03-10" });
    expect(resultado[3]).toMatchObject({ numeroParcela: 4, dataVencimento: "2026-04-10" });
  });

  it("crescimento a partir de dia alto (ultima parcela 2026-01-31, 1 -> 2): nova cai no ultimo dia de fevereiro, sem transbordar para marco", () => {
    const parcelas = [parcela(1, "2026-01-31", 1000)];
    const { parcelas: resultado } = ajustarParcelas({
      parcelas,
      numeroParcelas: 2,
      valorTotal: 2000,
    });
    expect(resultado).toHaveLength(2);
    expect(resultado[0].dataVencimento).toBe("2026-01-31");
    expect(resultado[1].dataVencimento).toBe("2026-02-28");
  });

  it("reducao 4 -> 2: sobram as parcelas 1 e 2, as do fim sao cortadas", () => {
    const parcelas = [
      parcela(1, "2026-01-10", 250),
      parcela(2, "2026-02-10", 250),
      parcela(3, "2026-03-10", 250),
      parcela(4, "2026-04-10", 250),
    ];
    const { parcelas: resultado } = ajustarParcelas({
      parcelas,
      numeroParcelas: 2,
      valorTotal: 1000,
    });
    expect(resultado.map((p) => p.dataVencimento)).toEqual(["2026-01-10", "2026-02-10"]);
  });

  it("a soma dos valorParcela fecha o valorTotal em todos os casos acima, inclusive total nao divisivel (100 em 3)", () => {
    const casos: { total: number; resultado: ParcelaAjuste[] }[] = [
      {
        total: 300,
        resultado: ajustarParcelas({
          parcelas: [
            parcela(1, "2026-01-10", 100),
            parcela(2, "2026-02-10", 100),
            parcela(3, "2026-03-10", 100),
          ],
          numeroParcelas: 3,
          valorTotal: 300,
        }).parcelas,
      },
      {
        total: 2000,
        resultado: ajustarParcelas({
          parcelas: [parcela(1, "2026-01-10", 500), parcela(2, "2026-02-10", 500)],
          numeroParcelas: 4,
          valorTotal: 2000,
        }).parcelas,
      },
      {
        total: 1000,
        resultado: ajustarParcelas({
          parcelas: [
            parcela(1, "2026-01-10", 250),
            parcela(2, "2026-02-10", 250),
            parcela(3, "2026-03-10", 250),
            parcela(4, "2026-04-10", 250),
          ],
          numeroParcelas: 2,
          valorTotal: 1000,
        }).parcelas,
      },
      {
        total: 100,
        resultado: ajustarParcelas({
          parcelas: [],
          numeroParcelas: 3,
          valorTotal: 100,
          dataVenda: "2026-01-05",
        }).parcelas,
      },
    ];

    for (const { resultado, total } of casos) {
      const soma = resultado.reduce((s, p) => s + p.valorParcela, 0);
      expect(Math.abs(soma - total)).toBeLessThan(0.005);
    }

    // total que nao divide exato: trunc nas primeiras, resto na ultima.
    const caso100em3 = casos[3].resultado;
    expect(caso100em3.map((p) => p.valorParcela)).toEqual([33.33, 33.33, 33.34]);
  });

  it("parcela paga nao e descartada em silencio: parcelasPagas [1,2,3] com reducao para 2 traz 3 linhas e minimoPorPagas 3", () => {
    const parcelas = [
      parcela(1, "2026-01-10", 250),
      parcela(2, "2026-02-10", 250),
      parcela(3, "2026-03-10", 250),
      parcela(4, "2026-04-10", 250),
    ];
    const { parcelas: resultado, minimoPorPagas } = ajustarParcelas({
      parcelas,
      numeroParcelas: 2,
      valorTotal: 1000,
      parcelasPagas: [1, 2, 3],
    });
    expect(resultado).toHaveLength(3);
    expect(minimoPorPagas).toBe(3);
  });

  it("reducao legitima nao dispara o clamp: parcelasPagas [1] com reducao 4 -> 2 traz 2 linhas e minimoPorPagas null", () => {
    const parcelas = [
      parcela(1, "2026-01-10", 250),
      parcela(2, "2026-02-10", 250),
      parcela(3, "2026-03-10", 250),
      parcela(4, "2026-04-10", 250),
    ];
    const { parcelas: resultado, minimoPorPagas } = ajustarParcelas({
      parcelas,
      numeroParcelas: 2,
      valorTotal: 1000,
      parcelasPagas: [1],
    });
    expect(resultado).toHaveLength(2);
    expect(minimoPorPagas).toBeNull();
  });

  it("lista vazia com numeroParcelas 3 (venda antiga sem linhas em parcelas_vencimento): gera 3 linhas a partir de calcularPrimeiroVencimento, dia 10, cadencia mensal", () => {
    const { parcelas: resultado } = ajustarParcelas({
      parcelas: [],
      numeroParcelas: 3,
      valorTotal: 300,
      dataVenda: "2026-01-05",
    });
    expect(resultado).toHaveLength(3);
    expect(resultado.map((p) => p.dataVencimento)).toEqual([
      "2026-02-10",
      "2026-03-10",
      "2026-04-10",
    ]);
  });
});

describe("redistribuirValores", () => {
  it("lista vazia volta vazia", () => {
    expect(redistribuirValores([], 100)).toEqual([]);
  });
});

// Achados do review de codigo (WR-01 e WR-02), corrigidos depois da implementacao inicial.
describe("ajustarParcelas — arrasto de fim de mes e determinismo", () => {
  it("WR-01: crescer de 1 para 5 a partir de 31/01 nao encolhe o dia para sempre — fevereiro usa 28, mas marco volta a 31", () => {
    const { parcelas } = ajustarParcelas({
      parcelas: [parcela(1, "2026-01-31", 100)],
      numeroParcelas: 5,
      valorTotal: 500,
      dataVenda: "2026-01-01",
    });

    // Antes da correcao saia 31, 28, 28, 28, 28: cada nova parcela contava um mes a
    // partir da anterior ja encolhida, entao o 28 de fevereiro contaminava o resto.
    expect(parcelas.map((p) => p.dataVencimento)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
      "2026-05-31",
    ]);
  });

  it("WR-02: gerar parcelas de uma lista vazia sem dataVenda falha alto, em vez de cair no relogio do servidor", () => {
    expect(() =>
      ajustarParcelas({ parcelas: [], numeroParcelas: 3, valorTotal: 300 })
    ).toThrow(/dataVenda/);
  });
});
