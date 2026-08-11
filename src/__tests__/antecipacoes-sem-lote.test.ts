// Trava do Historico de Antecipacoes que mostrava vazio com 26 vendas antecipadas.
//
// Medido em producao (2026-08-11): `antecipacao_batches` com 0 registros,
// `parcelas_vencimento.antecipada` com 0 registros, e 26 vendas com o flag
// `antecipada = 1`. O historico lista lotes, entao dizia "Nenhuma antecipacao
// realizada ainda" ao lado de vendas exibidas como "Antecipado".
import { describe, it, expect } from "vitest";
import {
  idsEmLotes,
  agruparAntecipacoesSemLote,
  type VendaAntecipadaSemLote,
} from "@/lib/antecipacoes-sem-lote";

function venda(id: number, dataVenda: string, valorTotal: number): VendaAntecipadaSemLote {
  return {
    id,
    dataVenda,
    clienteNome: `Cliente ${id}`,
    empresa: "AMAZON FIVE",
    produtos: "MOCHILA SPORT TAMANHO G",
    valorTotal,
    parcelas: 1,
  };
}

describe("idsEmLotes", () => {
  it("junta os ids de todos os lotes", () => {
    expect([...idsEmLotes([{ vendaIds: "[1,2]" }, { vendaIds: "[3]" }])].sort()).toEqual([1, 2, 3]);
  });

  it("sem lote nenhum devolve conjunto vazio — o caso real de producao hoje", () => {
    expect(idsEmLotes([]).size).toBe(0);
  });

  it("lote com vendaIds ilegivel e ignorado, nao derruba a tela", () => {
    const ids = idsEmLotes([{ vendaIds: "{quebrado" }, { vendaIds: "[7]" }]);
    expect([...ids]).toEqual([7]);
  });

  it("vendaIds que nao e array e ignorado", () => {
    expect(idsEmLotes([{ vendaIds: '"5"' }]).size).toBe(0);
  });
});

describe("agruparAntecipacoesSemLote", () => {
  it("sem lote nenhum, todas as vendas antecipadas aparecem — o bug relatado", () => {
    const grupos = agruparAntecipacoesSemLote(
      [venda(39, "2026-02-24", 209), venda(40, "2026-02-24", 199)],
      new Set()
    );
    expect(grupos).toHaveLength(1);
    expect(grupos[0].quantidadeVendas).toBe(2);
    expect(grupos[0].valorTotal).toBe(408);
  });

  it("venda que ja pertence a um lote nao e listada de novo", () => {
    const grupos = agruparAntecipacoesSemLote(
      [venda(39, "2026-02-24", 209), venda(40, "2026-02-24", 199)],
      idsEmLotes([{ vendaIds: "[39]" }])
    );
    expect(grupos).toHaveLength(1);
    expect(grupos[0].quantidadeVendas).toBe(1);
    expect(grupos[0].vendas[0].id).toBe(40);
  });

  it("todas em lote resulta em nenhum grupo — o historico volta a mostrar so lotes", () => {
    const grupos = agruparAntecipacoesSemLote(
      [venda(39, "2026-02-24", 209)],
      idsEmLotes([{ vendaIds: "[39]" }])
    );
    expect(grupos).toEqual([]);
  });

  it("agrupa por data e ordena da mais recente para a mais antiga", () => {
    const grupos = agruparAntecipacoesSemLote(
      [venda(1, "2026-01-30", 100), venda(2, "2026-02-24", 200), venda(3, "2026-02-23", 300)],
      new Set()
    );
    expect(grupos.map((g) => g.data)).toEqual(["2026-02-24", "2026-02-23", "2026-01-30"]);
  });

  it("Date em UTC nao escorrega um dia para tras", () => {
    // 2026-02-24T00:00:00Z lido em America/Manaus (UTC-4) daria 23/02 com getter
    // local. A chave tem de continuar 2026-02-24 (mesma classe do commit d9064ee).
    const grupos = agruparAntecipacoesSemLote(
      [{ ...venda(1, "x", 100), dataVenda: new Date("2026-02-24T00:00:00.000Z") }],
      new Set()
    );
    expect(grupos[0].data).toBe("2026-02-24");
  });

  it("soma de centavos nao acumula erro de ponto flutuante", () => {
    const grupos = agruparAntecipacoesSemLote(
      [venda(1, "2026-03-01", 0.1), venda(2, "2026-03-01", 0.2)],
      new Set()
    );
    expect(grupos[0].valorTotal).toBe(0.3);
  });
});
