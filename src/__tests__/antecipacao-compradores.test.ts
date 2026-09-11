// Resumo da antecipação por comprador (2026-09-11).
//
// Pedido do André: na tela de antecipação, ver o que já foi antecipado de cada
// comprador, quantas parcelas faltam antecipar e os totais gerais. Medido em
// produção (VKE, 2026-09-11): nenhuma parcela em folha com `antecipada = true`,
// 24 vendas ativas em folha com o flag legado `venda.antecipada = 1` (parcelas
// todas com o flag em false) e 209 parcelas não antecipadas já vencidas.
import { describe, it, expect } from "vitest";
import {
  resumirAntecipacaoPorComprador,
  resumirAntecipacaoPorMes,
  situacaoParcelasVenda,
  type VendaParaResumo,
} from "@/lib/antecipacao-compradores";
import { hojeDataPura } from "@/lib/data-pura";

const HOJE = "2026-09-11";

function parcela(dataVencimento: string, valorParcela: number, antecipada = false) {
  return { dataVencimento: `${dataVencimento}T00:00:00.000Z`, valorParcela, antecipada };
}

function venda(dados: Partial<VendaParaResumo> & { id: number }): VendaParaResumo {
  return {
    status: "ativa",
    antecipada: 0,
    clienteId: 1,
    clienteNome: "RAIANE ADRIELY DA ROCHA PINTO",
    empresa: "AMAZON FIVE",
    parcelas_detalhes: [],
    ...dados,
  };
}

describe("situacaoParcelasVenda", () => {
  it("separa antecipadas, a antecipar e vencidas sem antecipação", () => {
    const s = situacaoParcelasVenda(
      venda({
        id: 1,
        parcelas_detalhes: [
          parcela("2026-07-31", 250),
          parcela("2026-08-31", 250, true),
          parcela("2026-09-30", 250),
          parcela("2026-10-31", 250),
        ],
      }),
      HOJE
    );
    expect(s.antecipadas).toEqual({ qtd: 1, valor: 250 });
    expect(s.aAntecipar).toEqual({ qtd: 2, valor: 500, proximoVencimento: "2026-09-30" });
    expect(s.vencidasSemAntecipar).toEqual({ qtd: 1, valor: 250 });
    expect(s.semParcelas).toBe(false);
  });

  it("parcela que vence hoje ainda está a antecipar", () => {
    const s = situacaoParcelasVenda(
      venda({ id: 1, parcelas_detalhes: [parcela(HOJE, 100)] }),
      HOJE
    );
    expect(s.aAntecipar.qtd).toBe(1);
    expect(s.vencidasSemAntecipar.qtd).toBe(0);
  });

  it("venda legada com antecipada = 1 conta todas as parcelas como antecipadas — o caso de produção", () => {
    // As 26 vendas de produção têm o flag na venda e nenhuma parcela marcada.
    // Sem esta regra o resumo diria que nada foi antecipado.
    const s = situacaoParcelasVenda(
      venda({
        id: 1,
        antecipada: 1,
        parcelas_detalhes: [parcela("2026-08-31", 300), parcela("2026-09-30", 300), parcela("2026-10-31", 300)],
      }),
      HOJE
    );
    expect(s.antecipadas).toEqual({ qtd: 3, valor: 900 });
    expect(s.aAntecipar.qtd).toBe(0);
    expect(s.vencidasSemAntecipar.qtd).toBe(0);
  });

  it("antecipação parcial (status 3) segue o flag de cada parcela", () => {
    const s = situacaoParcelasVenda(
      venda({
        id: 1,
        antecipada: 3,
        parcelas_detalhes: [parcela("2026-09-30", 200, true), parcela("2026-10-31", 200)],
      }),
      HOJE
    );
    expect(s.antecipadas.qtd).toBe(1);
    expect(s.aAntecipar.qtd).toBe(1);
  });

  it("venda sem parcela cadastrada não ganha parcela inventada", () => {
    const s = situacaoParcelasVenda(venda({ id: 1, parcelas_detalhes: [] }), HOJE);
    expect(s.semParcelas).toBe(true);
    expect(s.antecipadas.qtd + s.aAntecipar.qtd + s.vencidasSemAntecipar.qtd).toBe(0);
  });

  it("vencimento ilegível é descartado em vez de virar vencida", () => {
    const s = situacaoParcelasVenda(
      venda({ id: 1, parcelas_detalhes: [{ dataVencimento: "lixo", valorParcela: 100, antecipada: false }] }),
      HOJE
    );
    expect(s.aAntecipar.qtd + s.vencidasSemAntecipar.qtd).toBe(0);
  });
});

describe("resumirAntecipacaoPorComprador", () => {
  it("junta as vendas do mesmo comprador numa linha só", () => {
    const { compradores } = resumirAntecipacaoPorComprador(
      [
        venda({ id: 1, antecipada: 1, parcelas_detalhes: [parcela("2026-09-30", 450), parcela("2026-10-31", 450)] }),
        venda({ id: 2, parcelas_detalhes: [parcela("2026-10-31", 120), parcela("2026-11-30", 120)] }),
      ],
      HOJE
    );
    expect(compradores).toHaveLength(1);
    expect(compradores[0]).toMatchObject({
      chave: "c1",
      clienteId: 1,
      nome: "RAIANE ADRIELY DA ROCHA PINTO",
      empresa: "AMAZON FIVE",
      vendas: 2,
      antecipadas: { qtd: 2, valor: 900 },
      aAntecipar: { qtd: 2, valor: 240, proximoVencimento: "2026-10-31" },
    });
  });

  it("venda cancelada ou estornada não entra em nenhum total", () => {
    const resumo = resumirAntecipacaoPorComprador(
      [
        venda({ id: 1, status: "cancelada", parcelas_detalhes: [parcela("2026-10-31", 500)] }),
        venda({ id: 2, status: "estornada", clienteId: 2, parcelas_detalhes: [parcela("2026-10-31", 500)] }),
      ],
      HOJE
    );
    expect(resumo.compradores).toEqual([]);
    expect(resumo.totais.aAntecipar).toEqual({ qtd: 0, valor: 0 });
  });

  it("ordena por quem tem mais a antecipar e desempata pelo nome", () => {
    const { compradores } = resumirAntecipacaoPorComprador(
      [
        venda({ id: 1, clienteId: 1, clienteNome: "CARLA", parcelas_detalhes: [parcela("2026-10-31", 100)] }),
        venda({ id: 2, clienteId: 2, clienteNome: "ANA", parcelas_detalhes: [parcela("2026-10-31", 100)] }),
        venda({ id: 3, clienteId: 3, clienteNome: "BRUNO", parcelas_detalhes: [parcela("2026-10-31", 900)] }),
        venda({ id: 4, clienteId: 4, clienteNome: "ÁLVARO", antecipada: 1, parcelas_detalhes: [parcela("2026-10-31", 5000)] }),
      ],
      HOJE
    );
    expect(compradores.map((c) => c.nome)).toEqual(["BRUNO", "ANA", "CARLA", "ÁLVARO"]);
  });

  it("totais batem com a soma dos compradores e contam quem ainda tem pendência", () => {
    const { totais } = resumirAntecipacaoPorComprador(
      [
        venda({ id: 1, clienteId: 1, antecipada: 1, parcelas_detalhes: [parcela("2026-09-30", 400), parcela("2026-10-31", 400)] }),
        venda({ id: 2, clienteId: 2, parcelas_detalhes: [parcela("2026-08-31", 150), parcela("2026-09-30", 150)] }),
        venda({ id: 3, clienteId: 3, parcelas_detalhes: [parcela("2026-10-31", 75, true)] }),
      ],
      HOJE
    );
    expect(totais).toEqual({
      antecipadas: { qtd: 3, valor: 875 },
      aAntecipar: { qtd: 1, valor: 150 },
      vencidasSemAntecipar: { qtd: 1, valor: 150 },
      compradores: 3,
      compradoresComPendencia: 1,
      vendasSemParcelas: 0,
    });
  });

  it("centavos não acumulam erro de ponto flutuante", () => {
    const { totais, compradores } = resumirAntecipacaoPorComprador(
      [venda({ id: 1, parcelas_detalhes: [parcela("2026-10-31", 0.1), parcela("2026-11-30", 0.2)] })],
      HOJE
    );
    expect(compradores[0].aAntecipar.valor).toBe(0.3);
    expect(totais.aAntecipar.valor).toBe(0.3);
  });

  it("venda sem cliente vira linha própria, sem juntar compradores diferentes", () => {
    const { compradores } = resumirAntecipacaoPorComprador(
      [
        venda({ id: 7, clienteId: null, clienteNome: null, parcelas_detalhes: [parcela("2026-10-31", 100)] }),
        venda({ id: 8, clienteId: null, clienteNome: null, parcelas_detalhes: [parcela("2026-10-31", 100)] }),
      ],
      HOJE
    );
    expect(compradores.map((c) => c.chave).sort()).toEqual(["v7", "v8"]);
    expect(compradores.every((c) => c.clienteId === null)).toBe(true);
  });

  it("venda sem parcela entra só no contador de vendas sem parcelas", () => {
    const { compradores, totais } = resumirAntecipacaoPorComprador(
      [venda({ id: 1, parcelas_detalhes: [] }), venda({ id: 2, parcelas_detalhes: [parcela("2026-10-31", 100)] })],
      HOJE
    );
    expect(compradores[0].vendas).toBe(2);
    expect(compradores[0].vendasSemParcelas).toBe(1);
    expect(totais.vendasSemParcelas).toBe(1);
    expect(totais.aAntecipar).toEqual({ qtd: 1, valor: 100 });
  });
});

describe("achados da revisão", () => {
  it("venda cancelada ou estornada não tem nada a antecipar — a fila chama situacaoParcelasVenda direto", () => {
    for (const status of ["cancelada", "estornada"]) {
      const s = situacaoParcelasVenda(
        venda({ id: 1, status, parcelas_detalhes: [parcela("2026-10-31", 100), parcela("2026-08-31", 100, true)] }),
        HOJE
      );
      expect(s.aAntecipar.qtd, status).toBe(0);
      expect(s.antecipadas.qtd, status).toBe(0);
      expect(s.vencidasSemAntecipar.qtd, status).toBe(0);
    }
  });

  it("venda legada antecipada = 1 sem parcela não pede cadastro de parcelas", () => {
    // A fila já mostra essa venda como "Antecipado"; o aviso de "cadastre as
    // parcelas para poder antecipar" seria falso para ela.
    const s = situacaoParcelasVenda(venda({ id: 1, antecipada: 1, parcelas_detalhes: [] }), HOJE);
    expect(s.semParcelas).toBe(false);
  });

  it("aceita Date no vencimento, que é o que o Prisma entrega", () => {
    const s = situacaoParcelasVenda(
      venda({
        id: 1,
        parcelas_detalhes: [
          { dataVencimento: new Date("2026-09-30T00:00:00.000Z"), valorParcela: 100, antecipada: false },
          { dataVencimento: new Date("2026-09-10T00:00:00.000Z"), valorParcela: 50, antecipada: false },
        ],
      }),
      HOJE
    );
    expect(s.aAntecipar).toEqual({ qtd: 1, valor: 100, proximoVencimento: "2026-09-30" });
    expect(s.vencidasSemAntecipar).toEqual({ qtd: 1, valor: 50 });
  });

  it("totais são exatamente a soma das linhas de comprador", () => {
    const { compradores, totais } = resumirAntecipacaoPorComprador(
      [
        venda({ id: 1, clienteId: 1, antecipada: 1, parcelas_detalhes: [parcela("2026-09-30", 133.33), parcela("2026-10-31", 133.33)] }),
        venda({ id: 2, clienteId: 2, parcelas_detalhes: [parcela("2026-08-31", 206.66), parcela("2026-09-30", 206.66), parcela("2026-10-31", 206.68)] }),
        venda({ id: 3, clienteId: 3, parcelas_detalhes: [parcela("2026-10-31", 291.42, true), parcela("2026-11-30", 291.42)] }),
        venda({ id: 4, clienteId: 2, parcelas_detalhes: [] }),
      ],
      HOJE
    );
    const soma = (f: (c: (typeof compradores)[number]) => number) =>
      Math.round(compradores.reduce((s, c) => s + f(c), 0) * 100) / 100;
    expect(totais.antecipadas).toEqual({ qtd: soma((c) => c.antecipadas.qtd), valor: soma((c) => c.antecipadas.valor) });
    expect(totais.aAntecipar).toEqual({ qtd: soma((c) => c.aAntecipar.qtd), valor: soma((c) => c.aAntecipar.valor) });
    expect(totais.vencidasSemAntecipar).toEqual({
      qtd: soma((c) => c.vencidasSemAntecipar.qtd),
      valor: soma((c) => c.vencidasSemAntecipar.valor),
    });
    expect(totais.vendasSemParcelas).toBe(soma((c) => c.vendasSemParcelas));
  });
});

describe("resumirAntecipacaoPorMes — as abas da planilha", () => {
  it("separa por mês de vencimento e soma os três baldes", () => {
    const meses = resumirAntecipacaoPorMes(
      [
        venda({ id: 1, clienteId: 1, parcelas_detalhes: [parcela("2026-08-10", 100), parcela("2026-09-10", 100, true), parcela("2026-10-10", 100)] }),
        venda({ id: 2, clienteId: 2, parcelas_detalhes: [parcela("2026-10-10", 250), parcela("2026-11-10", 250)] }),
      ],
      HOJE
    );
    expect(meses).toEqual([
      { mes: "2026-08", antecipadas: { qtd: 0, valor: 0 }, aAntecipar: { qtd: 0, valor: 0 }, vencidasSemAntecipar: { qtd: 1, valor: 100 } },
      { mes: "2026-09", antecipadas: { qtd: 1, valor: 100 }, aAntecipar: { qtd: 0, valor: 0 }, vencidasSemAntecipar: { qtd: 0, valor: 0 } },
      { mes: "2026-10", antecipadas: { qtd: 0, valor: 0 }, aAntecipar: { qtd: 2, valor: 350 }, vencidasSemAntecipar: { qtd: 0, valor: 0 } },
      { mes: "2026-11", antecipadas: { qtd: 0, valor: 0 }, aAntecipar: { qtd: 1, valor: 250 }, vencidasSemAntecipar: { qtd: 0, valor: 0 } },
    ]);
  });

  it("venda legada antecipada = 1 aparece como antecipada no mês de cada parcela", () => {
    const meses = resumirAntecipacaoPorMes(
      [venda({ id: 1, antecipada: 1, parcelas_detalhes: [parcela("2026-10-10", 400), parcela("2026-11-10", 400)] })],
      HOJE
    );
    expect(meses.map((m) => [m.mes, m.antecipadas.qtd, m.aAntecipar.qtd])).toEqual([
      ["2026-10", 1, 0],
      ["2026-11", 1, 0],
    ]);
  });

  it("venda cancelada não entra em mês nenhum", () => {
    const meses = resumirAntecipacaoPorMes(
      [venda({ id: 1, status: "cancelada", parcelas_detalhes: [parcela("2026-10-10", 400)] })],
      HOJE
    );
    expect(meses).toEqual([]);
  });

  it("a soma dos meses bate com os totais do resumo por comprador", () => {
    const vendas = [
      venda({ id: 1, clienteId: 1, antecipada: 1, parcelas_detalhes: [parcela("2026-09-30", 133.33), parcela("2026-10-31", 133.33)] }),
      venda({ id: 2, clienteId: 2, parcelas_detalhes: [parcela("2026-08-31", 206.66), parcela("2026-09-30", 206.66, true), parcela("2026-10-31", 206.68)] }),
      venda({ id: 3, clienteId: 3, status: "estornada", parcelas_detalhes: [parcela("2026-11-30", 50)] }),
    ];
    const meses = resumirAntecipacaoPorMes(vendas, HOJE);
    const { totais } = resumirAntecipacaoPorComprador(vendas, HOJE);
    const soma = (f: (m: (typeof meses)[number]) => number) => Math.round(meses.reduce((s, m) => s + f(m), 0) * 100) / 100;
    expect({ qtd: soma((m) => m.antecipadas.qtd), valor: soma((m) => m.antecipadas.valor) }).toEqual(totais.antecipadas);
    expect({ qtd: soma((m) => m.aAntecipar.qtd), valor: soma((m) => m.aAntecipar.valor) }).toEqual(totais.aAntecipar);
    expect({ qtd: soma((m) => m.vencidasSemAntecipar.qtd), valor: soma((m) => m.vencidasSemAntecipar.valor) }).toEqual(
      totais.vencidasSemAntecipar
    );
  });
});

describe("hojeDataPura", () => {
  it("usa o dia de Manaus: 02h UTC do dia 11 ainda é dia 10 lá", () => {
    expect(hojeDataPura(new Date("2026-09-11T02:00:00.000Z"))).toBe("2026-09-10");
  });

  it("meio-dia UTC é o mesmo dia civil", () => {
    expect(hojeDataPura(new Date("2026-09-11T12:00:00.000Z"))).toBe("2026-09-11");
  });
});
