import { describe, it, expect } from "vitest";
import { parseDataISO, dataExibidaDoInput, dataParaHidden, selecaoDeDataDoCalendario } from "@/lib/data-input";

// Bug encontrado em 2026-08-05 testando /cadastros em producao: o produto #205
// tinha DATA COMPRA = 19/06/2026 na tabela, mas o formulario de edicao abria o
// campo em "Selecionar data". Salvar sem alterar nada teria enviado "" e
// apagado a data no banco (updateProduto grava null quando a string vem vazia).

describe("parseDataISO", () => {
  it("converte ISO em Date local, sem deslocar o dia por fuso", () => {
    const d = parseDataISO("2026-06-19");
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(5); // junho
    expect(d?.getDate()).toBe(19);
  });

  it("vazio, null e undefined viram undefined", () => {
    expect(parseDataISO("")).toBeUndefined();
    expect(parseDataISO(null)).toBeUndefined();
    expect(parseDataISO(undefined)).toBeUndefined();
  });

  it("data invalida vira undefined em vez de Invalid Date", () => {
    expect(parseDataISO("nao-e-data")).toBeUndefined();
  });
});

describe("dataExibidaDoInput", () => {
  it("controlado: o value do pai vence um estado interno vazio — este E o bug", () => {
    // Exatamente o cenario do produto: o componente montou sem data (interno
    // undefined) e o pai preencheu depois via useEffect.
    const d = dataExibidaDoInput({ controlado: true, value: "2026-06-19", interno: undefined });
    expect(d).toBeInstanceOf(Date);
    expect(d?.getDate()).toBe(19);
  });

  it("controlado: o value do pai vence um estado interno DESATUALIZADO", () => {
    const antiga = new Date("2020-01-01T00:00:00");
    const d = dataExibidaDoInput({ controlado: true, value: "2026-06-19", interno: antiga });
    expect(d?.getFullYear()).toBe(2026);
  });

  it("controlado com value vazio: limpa de verdade", () => {
    const d = dataExibidaDoInput({ controlado: true, value: "", interno: new Date() });
    expect(d).toBeUndefined();
  });

  it("nao controlado: usa o estado interno", () => {
    const interno = new Date("2026-06-19T00:00:00");
    expect(dataExibidaDoInput({ controlado: false, value: undefined, interno })).toBe(interno);
  });

  it("nao controlado sem data: undefined", () => {
    expect(dataExibidaDoInput({ controlado: false, interno: undefined })).toBeUndefined();
  });
});

describe("dataParaHidden", () => {
  it("formata em yyyy-MM-dd", () => {
    expect(dataParaHidden(new Date("2026-06-19T00:00:00"))).toBe("2026-06-19");
  });

  it("preenche mes e dia com zero a esquerda", () => {
    expect(dataParaHidden(new Date("2026-01-05T00:00:00"))).toBe("2026-01-05");
  });

  it("sem data manda string vazia", () => {
    expect(dataParaHidden(undefined)).toBe("");
  });

  it("round-trip preserva o dia", () => {
    const iso = "2026-06-19";
    expect(dataParaHidden(parseDataISO(iso))).toBe(iso);
  });
});

// Bug relatado em 2026-08-27 junto com o das parcelas: "nao estou conseguindo fazer
// alteracao nas datas de parcelas", num iPhone.
//
// Duas causas no <DateInput>, ambas no calendario:
//
// 1. O <Calendar> nao recebia `defaultMonth`. Em react-day-picker v9,
//    `getInitialMonth` e' `month || defaultMonth || today` — `selected` NAO entra na
//    conta, e o mes so e' calculado na montagem (o Popover desmonta o conteudo ao
//    fechar, entao toda abertura recomeca em hoje). A 8a parcela de uma venda 12x
//    vence 10/04/2027: o calendario abria em agosto/2026, sem nenhum dia marcado, e
//    a unica saida era acertar 8 vezes um chevron de 28 px.
//
// 2. `mode="single"` sem `required` faz toggle-off: tocar no dia JA selecionado
//    devolve `undefined` no onSelect. No campo controlado isso fechava o popover sem
//    mudar nada (parece que o app ignorou o toque); no nao-controlado apagava a data
//    e o hidden ia vazio no submit — a mesma familia do bug de round-trip que ja
//    corrompeu dado neste formulario.
describe("selecaoDeDataDoCalendario", () => {
  it("data escolhida vira o valor ISO do campo", () => {
    expect(selecaoDeDataDoCalendario({ selecionada: new Date(2026, 8, 15) })).toEqual({
      novaData: "2026-09-15",
      limpar: false,
    });
  });

  it("campo obrigatorio: tocar no dia ja selecionado nao apaga a data", () => {
    // Vencimento de parcela, data da venda, data da despesa. Antes o campo
    // nao-controlado zerava e o hidden ia "" no submit — a action recusava.
    expect(selecaoDeDataDoCalendario({ selecionada: undefined, obrigatorio: true })).toEqual({
      novaData: undefined,
      limpar: false,
    });
  });

  it("campo opcional: tocar no dia ja selecionado continua limpando", () => {
    // Data de nascimento do cliente — o backend grava null e o toggle-off e' o unico
    // gesto que a UI oferece para apagar, porque o campo nao tem botao de limpar.
    expect(selecaoDeDataDoCalendario({ selecionada: undefined })).toEqual({
      novaData: undefined,
      limpar: true,
    });
  });
});
