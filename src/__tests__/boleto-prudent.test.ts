// Regras puras do boleto Prudent (Fase 4, spec §3.4 e §3.5).
import { describe, it, expect } from "vitest";
import {
  STATUS_BOLETO,
  DIRECIONAMENTO,
  agruparParcelasPorVencimento,
  valorDoBoleto,
  statusPorPagamentos,
  validarNovoPagamento,
  divergencia,
  saldoDoBoleto,
} from "@/lib/boleto-prudent";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const pg = (valorPrincipal: number, estornado = false) => ({
  valorPrincipal,
  estornadoEm: estornado ? d("2026-10-01") : null,
});

describe("constantes", () => {
  it("status e direcionamento gravados no banco", () => {
    expect(STATUS_BOLETO).toEqual({
      aguardandoDocumento: "aguardando_documento",
      aPagar: "a_pagar",
      pagoParcial: "pago_parcial",
      pago: "pago",
      substituido: "substituido",
      cancelado: "cancelado",
    });
    expect(DIRECIONAMENTO).toEqual({ empresa: "empresa", bfx: "bfx" });
  });
});

describe("agruparParcelasPorVencimento", () => {
  it("um grupo por data pura, ordenado, com soma em centavos", () => {
    const grupos = agruparParcelasPorVencimento([
      { id: 3, dataVencimento: d("2026-11-10"), valorParcela: 0.1 },
      { id: 1, dataVencimento: d("2026-10-10"), valorParcela: 100.1 },
      { id: 2, dataVencimento: d("2026-11-10"), valorParcela: 0.2 },
      { id: 4, dataVencimento: d("2026-10-10"), valorParcela: 50.25 },
    ]);
    expect(grupos).toEqual([
      { vencimento: d("2026-10-10"), parcelaIds: [1, 4], valorEsperado: 150.35 },
      { vencimento: d("2026-11-10"), parcelaIds: [3, 2], valorEsperado: 0.3 },
    ]);
  });

  it("dias diferentes do mesmo mes viram boletos diferentes", () => {
    const grupos = agruparParcelasPorVencimento([
      { id: 1, dataVencimento: d("2026-10-10"), valorParcela: 100 },
      { id: 2, dataVencimento: d("2026-10-15"), valorParcela: 100 },
    ]);
    expect(grupos.map((g) => g.parcelaIds)).toEqual([[1], [2]]);
  });

  it("hora diferente no mesmo dia UTC cai no mesmo grupo, com vencimento a meia-noite UTC", () => {
    const grupos = agruparParcelasPorVencimento([
      { id: 1, dataVencimento: new Date("2026-10-10T00:00:00.000Z"), valorParcela: 10 },
      { id: 2, dataVencimento: new Date("2026-10-10T15:30:00.000Z"), valorParcela: 10 },
    ]);
    expect(grupos).toEqual([{ vencimento: d("2026-10-10"), parcelaIds: [1, 2], valorEsperado: 20 }]);
  });

  it("lista vazia devolve nenhum grupo", () => {
    expect(agruparParcelasPorVencimento([])).toEqual([]);
  });
});

describe("valorDoBoleto", () => {
  it.each([
    [{ valorDocumento: null, valorEsperado: 300 }, 300],
    [{ valorDocumento: 310.5, valorEsperado: 300 }, 310.5],
    [{ valorDocumento: 0, valorEsperado: 300 }, 0],
  ])("%o -> %d", (b, v) => {
    expect(valorDoBoleto(b)).toBe(v);
  });
});

describe("statusPorPagamentos", () => {
  const base = { status: "a_pagar", valorDocumento: null, valorEsperado: 1000 };

  it.each([
    ["sem pagamento", [], "a_pagar"],
    ["parcial", [pg(400)], "pago_parcial"],
    ["completo em duas vezes", [pg(400), pg(600)], "pago"],
    ["falta 1 centavo (tolerancia)", [pg(999.99)], "pago"],
    ["falta 2 centavos", [pg(999.98)], "pago_parcial"],
    ["estorno nao conta", [pg(1000, true)], "a_pagar"],
    ["estorno + parcial", [pg(1000, true), pg(300)], "pago_parcial"],
  ] as const)("%s -> %s", (_, pagamentos, esperado) => {
    expect(statusPorPagamentos(base, [...pagamentos])).toBe(esperado);
  });

  it("usa o valor do documento quando existe", () => {
    expect(statusPorPagamentos({ ...base, valorDocumento: 1050 }, [pg(1000)])).toBe("pago_parcial");
    expect(statusPorPagamentos({ ...base, valorDocumento: 1050 }, [pg(1050)])).toBe("pago");
  });

  it.each(["substituido", "cancelado", "aguardando_documento"])("mantem %s", (status) => {
    expect(statusPorPagamentos({ ...base, status }, [pg(1000)])).toBe(status);
  });

  it("volta de pago para a_pagar quando o unico pagamento e estornado", () => {
    expect(statusPorPagamentos({ ...base, status: "pago" }, [pg(1000, true)])).toBe("a_pagar");
  });
});

describe("saldoDoBoleto", () => {
  const b = { status: "a_pagar", valorDocumento: null, valorEsperado: 1000 };
  it.each([
    [[], 1000],
    [[pg(300.1), pg(0.2)], 699.7],
    [[pg(300, true)], 1000],
    [[pg(1000)], 0],
  ] as const)("%o -> %d", (pagamentos, saldo) => {
    expect(saldoDoBoleto(b, [...pagamentos])).toBe(saldo);
  });

  it("nunca fica negativo", () => {
    expect(saldoDoBoleto(b, [pg(1000.01)])).toBe(0);
  });
});

describe("validarNovoPagamento", () => {
  const b = { status: "a_pagar", valorDocumento: null, valorEsperado: 1000 };

  it("aceita pagamento dentro do saldo", () => {
    expect(validarNovoPagamento(b, [], 1000)).toEqual({ ok: true });
    expect(validarNovoPagamento({ ...b, status: "pago_parcial" }, [pg(400)], 600)).toEqual({ ok: true });
  });

  it("tolera 1 centavo acima", () => {
    expect(validarNovoPagamento(b, [], 1000.01)).toEqual({ ok: true });
  });

  it("recusa o que passa do valor, dizendo quanto", () => {
    expect(validarNovoPagamento(b, [pg(400)], 1234.56)).toEqual({
      ok: false,
      erro: "O pagamento passa do valor do boleto em R$ 634,56.",
    });
    expect(validarNovoPagamento(b, [], 1000.02)).toEqual({
      ok: false,
      erro: "O pagamento passa do valor do boleto em R$ 0,02.",
    });
  });

  it("formata milhar com ponto", () => {
    expect(validarNovoPagamento(b, [], 2500)).toEqual({
      ok: false,
      erro: "O pagamento passa do valor do boleto em R$ 1.500,00.",
    });
  });

  it("ignora pagamento estornado na soma", () => {
    expect(validarNovoPagamento(b, [pg(1000, true)], 1000)).toEqual({ ok: true });
  });

  it("usa o valor do documento quando existe", () => {
    expect(validarNovoPagamento({ ...b, valorDocumento: 1050 }, [], 1050)).toEqual({ ok: true });
  });

  it.each(["substituido", "cancelado"])("recusa boleto %s", (status) => {
    expect(validarNovoPagamento({ ...b, status }, [], 100)).toEqual({
      ok: false,
      erro: "Boleto substituído ou cancelado não recebe pagamento.",
    });
  });

  it("recusa boleto sem documento", () => {
    expect(validarNovoPagamento({ ...b, status: "aguardando_documento" }, [], 100)).toEqual({
      ok: false,
      erro: "Anexe o boleto antes de registrar o pagamento.",
    });
  });

  it.each([0, -10, Number.NaN])("recusa principal %d", (v) => {
    expect(validarNovoPagamento(b, [], v)).toEqual({
      ok: false,
      erro: "Informe um valor principal maior que zero.",
    });
  });
});

describe("divergencia", () => {
  const b = { valorEsperado: 300, vencimento: d("2026-10-10") };

  it.each([
    ["igual", { valor: 300, vencimento: d("2026-10-10") }, { valor: false, vencimento: false }],
    ["valor diferente", { valor: 300.01, vencimento: d("2026-10-10") }, { valor: true, vencimento: false }],
    ["vencimento diferente", { valor: 300, vencimento: d("2026-10-11") }, { valor: false, vencimento: true }],
    ["ruido de ponto flutuante nao diverge", { valor: 0.1 + 0.2 + 299.7, vencimento: d("2026-10-10") }, { valor: false, vencimento: false }],
    ["mesma data com hora nao diverge", { valor: 300, vencimento: new Date("2026-10-10T12:00:00.000Z") }, { valor: false, vencimento: false }],
    ["documento sem valor nem vencimento nao diverge", { valor: null, vencimento: null }, { valor: false, vencimento: false }],
  ] as const)("%s", (_, doc, esperado) => {
    expect(divergencia(b, doc)).toEqual(esperado);
  });
});
