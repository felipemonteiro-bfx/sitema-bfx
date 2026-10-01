import { describe, it, expect } from "vitest";
import { simularMargemVenda } from "@/lib/simular-margem-venda";
import { calcularAntecipacao, titulosDeVenda, TAXA_MENSAL_PADRAO } from "@/lib/antecipacao";

type Input = Parameters<typeof simularMargemVenda>[0];

/** Venda de 1000 em folha, 4x de 250 vencendo 30/60/90/120 dias depois da venda. */
const PARCELAS_4X = [
  { numeroParcela: 1, dataVencimento: "2026-01-31", valorParcela: 250 },
  { numeroParcela: 2, dataVencimento: "2026-03-02", valorParcela: 250 },
  { numeroParcela: 3, dataVencimento: "2026-04-01", valorParcela: 250 },
  { numeroParcela: 4, dataVencimento: "2026-05-01", valorParcela: 250 },
];

function base(over: Partial<Input> = {}): Input {
  return {
    dataVenda: "2026-01-01",
    formaPagamento: "DESCONTO_FOLHA",
    subtotalProdutos: 1000,
    custoProdutos: 400,
    frete: 0,
    envio: 0,
    desconto: 0,
    temNota: false,
    taxaNotaPct: 0,
    comissaoPct: 0,
    parcelas: PARCELAS_4X,
    numParcelas: 4,
    repassePct: null,
    disponivelAntes: null,
    ...over,
  };
}

function taxaEsperada(parcelas: typeof PARCELAS_4X, total: number): number {
  const titulos = titulosDeVenda({
    dataVenda: "2026-01-01",
    valorVenda: total,
    parcelas: parcelas.length,
    parcelas_detalhes: parcelas.map((p) => ({ ...p, antecipada: false })),
  });
  return Math.round(calcularAntecipacao(titulos, TAXA_MENSAL_PADRAO).valorTaxa * 100) / 100;
}

describe("simularMargemVenda", () => {
  it("folha 4x: tres cenarios, com taxa pela formula da Prudent e lucro decrescente", () => {
    const s = simularMargemVenda(base());
    expect(s.cenarios.map((c) => c.chave)).toEqual(["nenhuma", "menosUltima", "todas"]);
    const [nenhuma, menosUltima, todas] = s.cenarios;
    expect(menosUltima.rotulo).toBe("3 de 4");
    expect(todas.taxa).toBe(taxaEsperada(PARCELAS_4X, 1000));
    expect(menosUltima.taxa).toBe(taxaEsperada(PARCELAS_4X.slice(0, 3), 1000));
    expect(todas.taxa).toBeGreaterThan(0);
    expect(todas.dinheiroJa).toBe(Math.round((1000 - todas.taxa) * 100) / 100);
    expect(nenhuma.dinheiroJa).toBe(0);
    expect(todas.lucro).toBeLessThan(menosUltima.lucro);
    expect(menosUltima.lucro).toBeLessThan(nenhuma.lucro);
    expect(nenhuma.lucro).toBe(600);
    expect(s.semParcelas).toBe(false);
  });

  it("menos a ultima tira a parcela de maior numero, nao a ultima da lista", () => {
    const fora = [PARCELAS_4X[3], PARCELAS_4X[0], PARCELAS_4X[1], PARCELAS_4X[2]];
    const s = simularMargemVenda(base({ parcelas: fora }));
    const menosUltima = s.cenarios.find((c) => c.chave === "menosUltima")!;
    expect(menosUltima.taxa).toBe(taxaEsperada(PARCELAS_4X.slice(0, 3), 1000));
  });

  it("folha 1x: sem o cenario 'todas menos a ultima'", () => {
    const s = simularMargemVenda(
      base({ parcelas: [{ numeroParcela: 1, dataVencimento: "2026-01-31", valorParcela: 1000 }], numParcelas: 1 })
    );
    expect(s.cenarios.map((c) => c.chave)).toEqual(["nenhuma", "todas"]);
  });

  it("PIX: um cenario so, com o total disponivel ja", () => {
    const s = simularMargemVenda(base({ formaPagamento: "PIX" }));
    expect(s.cenarios).toHaveLength(1);
    expect(s.cenarios[0].chave).toBe("nenhuma");
    expect(s.cenarios[0].taxa).toBe(0);
    expect(s.cenarios[0].dinheiroJa).toBe(s.total);
  });

  it.each(["DINHEIRO", "CARTAO_DEBITO", "TRANSFERENCIA"])("%s tambem e dinheiro ja", (forma) => {
    const s = simularMargemVenda(base({ formaPagamento: forma }));
    expect(s.cenarios[0].dinheiroJa).toBe(1000);
  });

  it("BOLETO: um cenario so, sem dinheiro ja", () => {
    const s = simularMargemVenda(base({ formaPagamento: "BOLETO" }));
    expect(s.cenarios).toHaveLength(1);
    expect(s.cenarios[0].dinheiroJa).toBe(0);
  });

  it("repasse de 10% sobre total 1000 vale 100 e sai do lucro", () => {
    const sem = simularMargemVenda(base());
    const com = simularMargemVenda(base({ repassePct: 10 }));
    expect(com.repasse).toEqual({ pct: 10, valor: 100 });
    expect(sem.repasse).toBeNull();
    expect(com.cenarios[0].lucro).toBe(sem.cenarios[0].lucro - 100);
  });

  it("limite: null sem limite conhecido; antes e depois pela parcela", () => {
    expect(simularMargemVenda(base()).limite).toBeNull();
    const s = simularMargemVenda(base({ subtotalProdutos: 400, disponivelAntes: 300 }));
    expect(s.valorParcela).toBe(100);
    expect(s.limite).toEqual({ antes: 300, depois: 200 });
  });

  it("sem parcelas: semParcelas e taxas zeradas", () => {
    const s = simularMargemVenda(base({ parcelas: [] }));
    expect(s.semParcelas).toBe(true);
    for (const c of s.cenarios) {
      expect(c.taxa).toBe(0);
      expect(Number.isNaN(c.lucro)).toBe(false);
    }
  });

  it("nota de 5,97% sobre subtotal 1000", () => {
    const s = simularMargemVenda(base({ temNota: true, taxaNotaPct: 5.97 }));
    expect(s.custos.nota).toBe(59.7);
  });

  it("comissao sobre o lucro bruto, como o formulario mostra", () => {
    // total 1000 + frete 50 - desconto 50 = 1000; lucro bruto = 1000 - 400 - 30 (envio) = 570
    const s = simularMargemVenda(base({ frete: 50, desconto: 50, envio: 30, comissaoPct: 10 }));
    expect(s.total).toBe(1000);
    expect(s.custos).toEqual({ produtos: 400, envio: 30, nota: 0, comissao: 57, desconto: 50 });
    expect(s.cenarios[0].lucro).toBe(513);
  });

  it("parcela ja vencida na data da venda: prazo 0, taxa 0, sem NaN", () => {
    const s = simularMargemVenda(
      base({
        parcelas: [{ numeroParcela: 1, dataVencimento: "2025-12-01", valorParcela: 1000 }],
        numParcelas: 1,
      })
    );
    const todas = s.cenarios.find((c) => c.chave === "todas")!;
    expect(todas.taxa).toBe(0);
    expect(todas.dinheiroJa).toBe(1000);
    expect(Number.isNaN(todas.lucro)).toBe(false);
  });
});
