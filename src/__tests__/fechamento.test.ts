import { describe, expect, it } from "vitest";
import {
  ROTULO_MOTIVO,
  ROTULO_STATUS_FECHAMENTO,
  STATUS_FECHAMENTO,
  competenciaDe,
  elegibilidadeFechamento,
  identificadorParcela,
  intervaloCompetencia,
  podeEditar,
  podeReabrir,
  rotuloCompetencia,
  totaisFechamento,
  validarAjuste,
  type MotivoBloqueio,
  type ParcelaParaFechamento,
} from "@/lib/fechamento";

const ELEGIVEL: ParcelaParaFechamento = {
  id: 1,
  vendaStatus: "ativa",
  vendaEmFolha: true,
  liquidadaEm: null,
  fechamentoId: null,
  confirmacaoRh: "confirmada",
  antecipada: false,
  paga: false,
  antecipacaoLoteId: null,
  loteStatus: null,
  boletoDirecionamento: null,
  empresaParceiraId: 7,
};

describe("competência", () => {
  it("competenciaDe usa o mês UTC", () => {
    expect(competenciaDe(new Date("2026-10-31T23:30:00Z"))).toBe("2026-10");
    expect(competenciaDe(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01");
    expect(competenciaDe(new Date("2026-12-10T00:00:00Z"))).toBe("2026-12");
  });

  it("intervaloCompetencia vai do dia 1º ao 1º do mês seguinte (exclusivo)", () => {
    const { inicio, fim } = intervaloCompetencia("2026-10");
    expect(inicio.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(fim.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("intervaloCompetencia vira o ano em dezembro", () => {
    const { inicio, fim } = intervaloCompetencia("2026-12");
    expect(inicio.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(fim.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it.each(["2026-13", "2026-00", "2026-1", "26-10", "", "2026-10-01", " 2026-10", "abcd-ef"])(
    "intervaloCompetencia recusa %j",
    (c) => {
      expect(() => intervaloCompetencia(c)).toThrow(/compet[eê]ncia/i);
    }
  );

  it("rotuloCompetencia escreve o mês por extenso", () => {
    expect(rotuloCompetencia("2026-10")).toBe("outubro de 2026");
    expect(rotuloCompetencia("2027-03")).toBe("março de 2027");
  });

  it("rotuloCompetencia recusa formato inválido", () => {
    expect(() => rotuloCompetencia("2026-13")).toThrow();
  });
});

describe("identificadorParcela", () => {
  it("monta V{venda}-{n}/{total}", () => {
    expect(identificadorParcela(240, 3, 4)).toBe("V240-3/4");
  });
});

describe("status", () => {
  it("rótulos de todos os status", () => {
    expect(ROTULO_STATUS_FECHAMENTO[STATUS_FECHAMENTO.emPreparacao]).toBe("Em preparação");
    expect(ROTULO_STATUS_FECHAMENTO[STATUS_FECHAMENTO.conferido]).toBe("Conferido");
    expect(ROTULO_STATUS_FECHAMENTO[STATUS_FECHAMENTO.enviado]).toBe("Enviado ao RH");
    expect(ROTULO_STATUS_FECHAMENTO[STATUS_FECHAMENTO.pagoParcial]).toBe("Pago parcialmente");
    expect(ROTULO_STATUS_FECHAMENTO[STATUS_FECHAMENTO.pago]).toBe("Pago");
  });

  it.each([
    ["em_preparacao", true, false],
    ["conferido", false, true],
    ["enviado", false, true],
    ["pago_parcial", false, true],
    ["pago", false, false],
    ["qualquer", false, false],
  ])("%s: podeEditar=%s podeReabrir=%s", (status, editar, reabrir) => {
    expect(podeEditar(status)).toBe(editar);
    expect(podeReabrir(status)).toBe(reabrir);
  });
});

describe("elegibilidadeFechamento", () => {
  it("parcela limpa é elegível", () => {
    expect(elegibilidadeFechamento(ELEGIVEL, 10)).toEqual({ ok: true });
  });

  it("parcela já reservada neste fechamento continua elegível", () => {
    expect(elegibilidadeFechamento({ ...ELEGIVEL, fechamentoId: 10 }, 10)).toEqual({ ok: true });
  });

  it("aguardando confirmação do RH não bloqueia", () => {
    expect(elegibilidadeFechamento({ ...ELEGIVEL, confirmacaoRh: null }, 10)).toEqual({ ok: true });
  });

  it("antecipada com boleto direcionado à BFX é elegível", () => {
    expect(
      elegibilidadeFechamento(
        { ...ELEGIVEL, antecipada: true, paga: true, antecipacaoLoteId: 3, loteStatus: "concluido", boletoDirecionamento: "bfx" },
        10
      )
    ).toEqual({ ok: true });
  });

  it("lote concluído não bloqueia", () => {
    expect(
      elegibilidadeFechamento({ ...ELEGIVEL, antecipacaoLoteId: 3, loteStatus: "concluido" }, 10)
    ).toEqual({ ok: true });
  });

  const casos: [string, Partial<ParcelaParaFechamento>, number | null, MotivoBloqueio][] = [
    ["venda cancelada", { vendaStatus: "cancelada" }, 10, "venda_inativa"],
    ["venda estornada", { vendaStatus: "estornada" }, 10, "venda_inativa"],
    ["venda que não é desconto em folha (Pix, cartão, boleto)", { vendaEmFolha: false }, 10, "forma_nao_folha"],
    ["já liquidada", { liquidadaEm: new Date("2026-10-15T00:00:00Z") }, 10, "ja_liquidada"],
    ["em outro fechamento", { fechamentoId: 99 }, 10, "em_outro_fechamento"],
    ["reservada e fechamento ainda sem id", { fechamentoId: 99 }, null, "em_outro_fechamento"],
    ["recusada pelo RH", { confirmacaoRh: "recusada" }, 10, "recusada_rh"],
    ["antecipada sem boleto", { antecipada: true, paga: true, boletoDirecionamento: null }, 10, "boleto_a_empresa"],
    ["antecipada com boleto à empresa", { antecipada: true, paga: true, boletoDirecionamento: "empresa" }, 10, "boleto_a_empresa"],
    ["paga por outra via", { paga: true }, 10, "paga_por_outra_via"],
    ["lote em andamento", { antecipacaoLoteId: 3, loteStatus: "em_andamento" }, 10, "lote_em_andamento"],
    ["cliente sem empresa", { empresaParceiraId: null }, 10, "sem_empresa"],
  ];

  it.each(casos)("%s → bloqueio", (_nome, parcial, fechamentoId, motivo) => {
    expect(elegibilidadeFechamento({ ...ELEGIVEL, ...parcial }, fechamentoId)).toEqual({ ok: false, motivo });
  });

  it("checa na ordem da tabela da spec: o primeiro motivo vence", () => {
    const tudoErrado: ParcelaParaFechamento = {
      id: 2,
      vendaStatus: "cancelada",
      vendaEmFolha: false,
      liquidadaEm: new Date("2026-10-15T00:00:00Z"),
      fechamentoId: 99,
      confirmacaoRh: "recusada",
      antecipada: true,
      paga: true,
      antecipacaoLoteId: 3,
      loteStatus: "em_andamento",
      boletoDirecionamento: "empresa",
      empresaParceiraId: null,
    };
    const ordem: MotivoBloqueio[] = [];
    let p = { ...tudoErrado };
    const corrigir: Record<MotivoBloqueio, Partial<ParcelaParaFechamento>> = {
      venda_inativa: { vendaStatus: "ativa" },
      forma_nao_folha: { vendaEmFolha: true },
      ja_liquidada: { liquidadaEm: null },
      em_outro_fechamento: { fechamentoId: null },
      recusada_rh: { confirmacaoRh: "confirmada" },
      boleto_a_empresa: { antecipada: false },
      paga_por_outra_via: { paga: false },
      lote_em_andamento: { loteStatus: "concluido" },
      sem_empresa: { empresaParceiraId: 7 },
    };
    for (let i = 0; i < 10; i++) {
      const r = elegibilidadeFechamento(p, 10);
      if (r.ok) break;
      ordem.push(r.motivo);
      p = { ...p, ...corrigir[r.motivo] };
    }
    expect(ordem).toEqual([
      "venda_inativa",
      "forma_nao_folha",
      "ja_liquidada",
      "em_outro_fechamento",
      "recusada_rh",
      "boleto_a_empresa",
      "paga_por_outra_via",
      "lote_em_andamento",
      "sem_empresa",
    ]);
  });

  it("todo motivo tem rótulo", () => {
    expect(ROTULO_MOTIVO).toEqual({
      venda_inativa: "Venda cancelada ou estornada",
      forma_nao_folha: "Venda não é desconto em folha",
      ja_liquidada: "Já paga no fechamento",
      em_outro_fechamento: "Em outro fechamento",
      recusada_rh: "Recusada pelo RH",
      boleto_a_empresa: "Boleto Prudent ainda direcionado à empresa",
      paga_por_outra_via: "Paga por outra via",
      lote_em_andamento: "Lote em andamento na Prudent",
      sem_empresa: "Cliente sem empresa parceira",
    });
  });
});

describe("totaisFechamento", () => {
  it("soma em centavos sem erro de ponto flutuante", () => {
    const linhas = [{ valor: 0.1 }, { valor: 0.2 }, { valor: 100.35 }];
    expect(totaisFechamento(linhas, [])).toEqual({ totalBruto: 100.65, totalAjustes: 0, totalFinal: 100.65 });
  });

  it("ignora ajustes removidos e aceita ajuste negativo", () => {
    const linhas = [{ valor: 250 }, { valor: 250 }];
    const ajustes = [
      { valor: -30.1, removidoEm: null },
      { valor: 10.05, removidoEm: null },
      { valor: 999, removidoEm: new Date("2026-10-02T00:00:00Z") },
    ];
    expect(totaisFechamento(linhas, ajustes)).toEqual({ totalBruto: 500, totalAjustes: -20.05, totalFinal: 479.95 });
  });

  it("sem linhas nem ajustes dá zero", () => {
    expect(totaisFechamento([], [])).toEqual({ totalBruto: 0, totalAjustes: 0, totalFinal: 0 });
  });
});

describe("validarAjuste", () => {
  it("aceita valor ± e justificativa com 5+ caracteres (aparada)", () => {
    expect(validarAjuste(-12.5, "  Desconto acordado  ")).toEqual({ ok: true, valor: -12.5, justificativa: "Desconto acordado" });
    expect(validarAjuste(30, "Frete")).toEqual({ ok: true, valor: 30, justificativa: "Frete" });
  });

  it("arredonda o valor a centavos", () => {
    expect(validarAjuste(10.005, "Ajuste x")).toMatchObject({ ok: true, valor: 10.01 });
  });

  it("aceita valor em texto com vírgula", () => {
    expect(validarAjuste("-7,50", "Devolução")).toMatchObject({ ok: true, valor: -7.5 });
  });

  it.each([0, 0.001, Number.NaN, Number.POSITIVE_INFINITY, null, undefined, "", "abc", {}])(
    "recusa valor %j",
    (v) => {
      const r = validarAjuste(v, "Justificativa ok");
      expect(r.ok).toBe(false);
    }
  );

  it.each(["", "abcd", "   abcd   ", null, undefined, 123])("recusa justificativa %j", (j) => {
    const r = validarAjuste(10, j);
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.erro).toMatch(/justificativa/i);
  });
});

describe("revisão: entradas inválidas", () => {
  it("justificativa acima de 500 caracteres é recusada", () => {
    const r = validarAjuste(10, "a".repeat(501));
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.erro).toMatch(/justificativa/i);
    expect(validarAjuste(10, "a".repeat(500))).toMatchObject({ ok: true });
  });

  it("aceita o formato brasileiro com milhar", () => {
    expect(validarAjuste("1.234,56", "Ajuste xx")).toMatchObject({ ok: true, valor: 1234.56 });
    expect(validarAjuste("-1.234", "Ajuste xx")).toMatchObject({ ok: true, valor: -1234 });
    expect(validarAjuste("12.5", "Ajuste xx")).toMatchObject({ ok: true, valor: 12.5 });
  });

  it.each(["0x10", "1e3", "1,2,3", "--5", "R$ 10", "10,123"])("recusa valor em texto %j", (v) => {
    expect(validarAjuste(v, "Ajuste xx")).toMatchObject({ ok: false });
  });

  it("recusa valor absurdo", () => {
    expect(validarAjuste(1e300, "Ajuste xx")).toMatchObject({ ok: false });
  });

  it("competência com ano fora de 19xx/20xx é recusada", () => {
    expect(() => intervaloCompetencia("0099-05")).toThrow(/compet[eê]ncia/i);
    expect(() => rotuloCompetencia("0099-05")).toThrow(/compet[eê]ncia/i);
  });

  it("competenciaDe recusa data inválida", () => {
    expect(() => competenciaDe(new Date("x"))).toThrow();
  });

  it("totaisFechamento recusa valor não finito", () => {
    expect(() => totaisFechamento([{ valor: Number.NaN }], [])).toThrow();
    expect(() => totaisFechamento([], [{ valor: Number.POSITIVE_INFINITY, removidoEm: null }])).toThrow();
  });
});
