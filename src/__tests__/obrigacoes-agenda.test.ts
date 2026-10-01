// Regras de exibicao da agenda /obrigacoes (Fase 4): em que aba o boleto aparece, o rotulo da
// situacao, quando o "No boleto" diverge e o que entra na projecao de caixa.
import { describe, it, expect } from "vitest";
import {
  abaDoBoleto,
  dataPixDoMes,
  documentoDiverge,
  entradaDaProjecao,
  situacaoDoBoleto,
  type BoletoAgenda,
} from "@/lib/obrigacoes-agenda";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const HOJE = d("2026-10-01");

const boleto = (extra: Partial<BoletoAgenda> = {}): BoletoAgenda => ({
  id: 1,
  status: "a_pagar",
  direcionamento: "bfx",
  vencimento: d("2026-10-10"),
  valorEsperado: 300,
  valorDocumento: 300,
  vencimentoDocumento: d("2026-10-10"),
  divergenciaJustificativa: null,
  pagamentos: [],
  ...extra,
});

describe("abaDoBoleto", () => {
  it.each([
    ["aguardando_documento", "sem_boleto"],
    ["a_pagar", "a_pagar"],
    ["pago_parcial", "a_pagar"],
    ["pago", "pagos"],
    ["substituido", "historico"],
    ["cancelado", "historico"],
  ])("%s → %s", (status, aba) => {
    expect(abaDoBoleto(boleto({ status }))).toBe(aba);
  });
});

describe("abaDoBoleto — boleto que a empresa paga", () => {
  // achado da revisao: sem acao possivel na tela, ele ficava preso em "Sem boleto" para sempre
  it.each(["aguardando_documento", "a_pagar", "pago"])("%s da empresa so aparece em Todos", (status) => {
    expect(abaDoBoleto(boleto({ status, direcionamento: "empresa" }))).toBe("historico");
  });
});

describe("situacaoDoBoleto", () => {
  it("sem documento", () => {
    expect(situacaoDoBoleto(boleto({ status: "aguardando_documento" }), HOJE)).toEqual({ rotulo: "sem boleto", tom: "warning" });
  });

  it("a pagar, com e sem diferenca justificada", () => {
    expect(situacaoDoBoleto(boleto(), HOJE)).toEqual({ rotulo: "a pagar", tom: "neutro" });
    expect(situacaoDoBoleto(boleto({ divergenciaJustificativa: "juros" }), HOJE)).toEqual({
      rotulo: "a pagar · diferença justificada",
      tom: "neutro",
    });
  });

  it("vencido pelo vencimento do documento", () => {
    expect(situacaoDoBoleto(boleto({ vencimentoDocumento: d("2026-09-30") }), HOJE)).toEqual({ rotulo: "vencido", tom: "error" });
  });

  it("pago em parte e pago com a data do ultimo pagamento nao estornado", () => {
    expect(situacaoDoBoleto(boleto({ status: "pago_parcial" }), HOJE)).toEqual({ rotulo: "pago em parte", tom: "info" });
    const pagamentos = [
      { valorPrincipal: 100, estornadoEm: null, dataPagamento: d("2026-09-20") },
      { valorPrincipal: 200, estornadoEm: null, dataPagamento: d("2026-09-28") },
      { valorPrincipal: 200, estornadoEm: d("2026-09-29"), dataPagamento: d("2026-09-29") },
    ];
    expect(situacaoDoBoleto(boleto({ status: "pago", pagamentos }), HOJE)).toEqual({ rotulo: "pago em 28/09", tom: "success" });
  });

  it("boleto da empresa: a empresa paga, em qualquer status vivo", () => {
    expect(situacaoDoBoleto(boleto({ direcionamento: "empresa", status: "aguardando_documento" }), HOJE)).toEqual({
      rotulo: "a empresa paga",
      tom: "muted",
    });
  });

  it("substituido e cancelado", () => {
    expect(situacaoDoBoleto(boleto({ status: "substituido" }), HOJE)).toEqual({ rotulo: "substituído", tom: "muted" });
    expect(situacaoDoBoleto(boleto({ status: "cancelado", direcionamento: "empresa" }), HOJE)).toEqual({
      rotulo: "cancelado",
      tom: "muted",
    });
  });
});

describe("documentoDiverge", () => {
  it("compara valor e vencimento do documento com o esperado; sem documento nao diverge", () => {
    expect(documentoDiverge(boleto())).toBe(false);
    expect(documentoDiverge(boleto({ valorDocumento: 310 }))).toBe(true);
    expect(documentoDiverge(boleto({ vencimentoDocumento: d("2026-10-11") }))).toBe(true);
    expect(documentoDiverge(boleto({ valorDocumento: null, vencimentoDocumento: null }))).toBe(false);
  });
});

describe("dataPixDoMes", () => {
  it("o dia do Pix no mes do vencimento, em data pura", () => {
    expect(dataPixDoMes(d("2026-10-10"), 15)).toEqual(d("2026-10-15"));
    expect(dataPixDoMes(new Date("2026-12-31T23:00:00.000Z"), 5)).toEqual(d("2026-12-05"));
  });
});

describe("entradaDaProjecao", () => {
  it("so boletos vivos da BFX com saldo; vencimento do documento quando ha; depositos dos lotes em andamento", () => {
    const e = entradaDaProjecao({
      hoje: HOJE,
      boletos: [
        { ...boleto({ id: 1, vencimentoDocumento: d("2026-10-12") }), dataPix: d("2026-10-15") },
        { ...boleto({ id: 2, direcionamento: "empresa" }), dataPix: d("2026-10-15") },
        { ...boleto({ id: 3, status: "substituido" }), dataPix: null },
        {
          ...boleto({
            id: 4,
            status: "pago_parcial",
            pagamentos: [{ valorPrincipal: 100, estornadoEm: null, dataPagamento: d("2026-09-20") }],
          }),
          dataPix: null,
        },
        { ...boleto({ id: 5, status: "aguardando_documento", valorDocumento: null, vencimentoDocumento: null }), dataPix: null },
      ],
      lotesEmAndamento: [
        { valorAprovado: 500, valorLiquidoSolicitado: 480, dataDepositoPrevista: d("2026-10-03") },
        { valorAprovado: null, valorLiquidoSolicitado: 480, dataDepositoPrevista: d("2026-10-04") },
        { valorAprovado: null, valorLiquidoSolicitado: null, dataDepositoPrevista: d("2026-10-05") },
        { valorAprovado: 100, valorLiquidoSolicitado: null, dataDepositoPrevista: null },
      ],
    });
    expect(e.hoje).toEqual(HOJE);
    expect(e.dias).toBe(60);
    expect(e.pixEsperados).toEqual([]);
    expect(e.boletos).toEqual([
      { vencimento: d("2026-10-12"), saldo: 300, dataPix: d("2026-10-15") },
      { vencimento: d("2026-10-10"), saldo: 200, dataPix: null },
      { vencimento: d("2026-10-10"), saldo: 300, dataPix: null },
    ]);
    expect(e.depositosPrevistos).toEqual([
      { data: d("2026-10-03"), valor: 500 },
      { data: d("2026-10-04"), valor: 480 },
    ]);
  });
});
