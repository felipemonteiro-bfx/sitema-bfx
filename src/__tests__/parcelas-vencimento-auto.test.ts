// Trava do bug relatado em 2026-08-27: na venda rapida, o valor da 1a parcela nao
// aceitava edicao ("consigo alterar a segunda em diante, mas a primeira nao") e as
// datas de vencimento voltavam sozinhas para o padrao.
//
// Causa: a auto-init de `parcelas-vencimento-form.tsx` usava o VALOR DA PRIMEIRA
// PARCELA como sentinela de "a lista esta desatualizada":
//
//   parcelas.length !== numeroParcelas ||
//   parcelas[0]?.valorParcela !== Math.trunc((valorTotal / numeroParcelas) * 100) / 100
//
// Editar a 1a parcela tornava a condicao verdadeira e o effect regenerava a lista
// inteira — jogando fora a edicao E reescrevendo todas as datas ja escolhidas.
//
// Vitest roda em `environment: "node"`, sem jsdom nem testing-library, entao a regra
// mora num modulo puro (mesmo motivo documentado em `data-input.ts`). O ciclo do
// componente e simulado aqui pelo helper `Formulario`, que reproduz o effect: guarda
// `valorTotalObservado` entre renders, como o `useRef` do componente faz.
import { describe, it, expect } from "vitest";
import { sincronizarParcelasAuto, type ParcelaAjuste } from "@/lib/parcelas-ajuste";

const DATA_VENDA = "2026-08-27";

/** Espelha o `useEffect` de `parcelas-vencimento-form.tsx`, incluindo o ref do total. */
class Formulario {
  parcelas: ParcelaAjuste[] = [];
  private totalAnterior: number | null = null;
  /** Quantas vezes a sincronizacao chamou `onChange` no ultimo `render`. */
  sincronizacoes = 0;

  render(numeroParcelas: number, valorTotal: number) {
    this.sincronizacoes = 0;
    // O React re-renderiza depois de cada `onChange`, entao o effect roda de novo.
    // Se algum caminho nao convergir, isto estoura em vez de girar para sempre.
    for (let i = 0; i < 10; i++) {
      const { parcelas, valorTotalObservado } = sincronizarParcelasAuto({
        parcelas: this.parcelas,
        numeroParcelas,
        valorTotal,
        valorTotalAnterior: this.totalAnterior,
        dataVenda: DATA_VENDA,
      });
      this.totalAnterior = valorTotalObservado;
      if (!parcelas) return this;
      this.parcelas = parcelas;
      this.sincronizacoes += 1;
    }
    throw new Error("sincronizarParcelasAuto nao convergiu — loop de render");
  }

  editarValor(index: number, valorParcela: number) {
    this.parcelas = this.parcelas.map((p, i) => (i === index ? { ...p, valorParcela } : p));
    return this;
  }

  editarData(index: number, dataVencimento: string) {
    this.parcelas = this.parcelas.map((p, i) => (i === index ? { ...p, dataVencimento } : p));
    return this;
  }

  get total() {
    return this.parcelas.reduce((s, p) => s + p.valorParcela, 0);
  }
}

describe("sincronizarParcelasAuto — o bug da 1a parcela", () => {
  it("o valor editado na 1a parcela sobrevive ao proximo render", () => {
    const form = new Formulario().render(3, 700);
    expect(form.parcelas).toHaveLength(3);

    form.editarValor(0, 233.3).render(3, 700);

    // Com a sentinela antiga (233,3 !== 233,33) a lista inteira era regenerada aqui.
    expect(form.sincronizacoes).toBe(0);
    expect(form.parcelas[0].valorParcela).toBe(233.3);
  });

  it("editar a 1a parcela nao reescreve as datas de vencimento ja escolhidas", () => {
    const form = new Formulario().render(3, 700);
    form.editarData(0, "2026-08-01").editarData(1, "2026-08-08").render(3, 700);

    form.editarValor(0, 100).render(3, 700);

    expect(form.parcelas.map((p) => p.dataVencimento)).toEqual([
      "2026-08-01",
      "2026-08-08",
      "2026-12-10",
    ]);
  });

  it("1a e 2a parcela se comportam igual — zerar qualquer uma das duas persiste", () => {
    const form = new Formulario().render(3, 700);

    form.editarValor(1, 0).render(3, 700);
    expect(form.parcelas[1].valorParcela).toBe(0);

    form.editarValor(0, 0).render(3, 700);
    expect(form.parcelas[0].valorParcela).toBe(0);
  });

  it("trocar so a data nao dispara sincronizacao nenhuma", () => {
    const form = new Formulario().render(3, 700);

    form.editarData(2, "2026-11-05").render(3, 700);

    expect(form.sincronizacoes).toBe(0);
    expect(form.parcelas[2].dataVencimento).toBe("2026-11-05");
  });
});

describe("sincronizarParcelasAuto — quando ela deve agir", () => {
  it("lista vazia gera a partir da data da venda e a soma fecha o total exato", () => {
    const form = new Formulario().render(3, 700);

    expect(form.parcelas.map((p) => p.dataVencimento)).toEqual([
      "2026-10-10",
      "2026-11-10",
      "2026-12-10",
    ]);
    // 233,33 x3 dava 699,99 e o card acusava divergencia do total — era esse aviso
    // que empurrava o usuario a corrigir justamente a 1a parcela, a unica travada.
    expect(form.total).toBeCloseTo(700, 2);
  });

  it("aumentar o numero de parcelas preserva as datas ja escolhidas e refaz os valores", () => {
    const form = new Formulario().render(2, 968);
    form.editarData(0, "2026-08-01").editarData(1, "2026-08-08").render(2, 968);

    form.render(3, 1452);

    expect(form.parcelas.map((p) => p.dataVencimento)).toEqual([
      "2026-08-01",
      "2026-08-08",
      "2026-09-08",
    ]);
    expect(form.parcelas.map((p) => p.valorParcela)).toEqual([484, 484, 484]);
  });

  it("diminuir o numero de parcelas corta do fim e mantem as datas das que ficam", () => {
    const form = new Formulario().render(4, 1000);
    const datasIniciais = form.parcelas.map((p) => p.dataVencimento);

    form.render(2, 1000);

    expect(form.parcelas.map((p) => p.dataVencimento)).toEqual(datasIniciais.slice(0, 2));
    expect(form.total).toBeCloseTo(1000, 2);
  });

  it("mudar so o total redistribui os valores e mantem as datas", () => {
    const form = new Formulario().render(3, 700);
    form.editarData(0, "2026-08-01").render(3, 700);

    form.render(3, 900);

    expect(form.parcelas[0].dataVencimento).toBe("2026-08-01");
    expect(form.total).toBeCloseTo(900, 2);
  });

  it("total que muda enquanto a venda esta em 1x nao e engolido ao voltar a parcelar", () => {
    // Achado do review: o componente avancava o ref do total mesmo quando a
    // sincronizacao pulava. Com o campo Parcelas em 1 (sugestao do desconto em folha
    // faz isso sozinho), o total novo era registrado sem nunca ter sido aplicado, e a
    // lista voltava presa nos valores antigos — R$ 400 numa venda de R$ 1400.
    const form = new Formulario().render(3, 1400);
    expect(form.total).toBeCloseTo(1400, 2);

    form.render(1, 400); // card some, lista continua na memoria do formulario
    form.render(3, 400); // volta a parcelar, ja com o total novo

    // Voltar ao total ANTIGO nao discrimina: com o ref avancado indevidamente para
    // 400, a subida de volta para 1400 tambem redistribuiria. O caso que trava o bug
    // e' terminar no total novo — com o ref adiantado, a lista fica em R$ 1400.
    expect(form.total).toBeCloseTo(400, 2);
  });

  it("pagamento em uma parcela so nao gera lista nenhuma", () => {
    const form = new Formulario().render(1, 500);

    expect(form.parcelas).toEqual([]);
  });
});

describe("sincronizarParcelasAuto — entrada corrompida nao vira loop de render", () => {
  it("total NaN (querystring solta) nao sincroniza", () => {
    const form = new Formulario().render(3, 700);

    expect(() => form.render(3, NaN)).not.toThrow();
    expect(form.total).toBeCloseTo(700, 2);
  });

  it("numero de parcelas fracionario nao fica alternando entre dois tamanhos", () => {
    const form = new Formulario();

    expect(() => form.render(2.5, 1000)).not.toThrow();
    expect(form.parcelas).toEqual([]);
  });
});
