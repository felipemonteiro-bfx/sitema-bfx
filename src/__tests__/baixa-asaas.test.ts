// Baixa de parcela pelo status atual da cobranca no Asaas (2026-09-16).
// Ver docs/superpowers/specs/2026-09-16-baixa-de-parcelas.md.
import { describe, it, expect } from "vitest";
import { decidirBaixaAsaas, situacaoParaCliente, type ParcelaParaBaixa, type PagamentoAsaas } from "@/lib/baixa-parcelas";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("situacaoParaCliente", () => {
  const hoje = new Date("2026-09-16T00:00:00Z");
  const antes = new Date("2026-09-10T00:00:00Z");
  const depois = new Date("2026-10-10T00:00:00Z");

  it("Prudent: a vencer continua a vencer (folha ainda desconta); vencida ja foi descontada", () => {
    expect(situacaoParaCliente({ paga: true, origemPagamento: "prudent", dataVencimento: depois }, hoje)).toBe("a_vencer");
    expect(situacaoParaCliente({ paga: true, origemPagamento: "prudent", dataVencimento: antes }, hoje)).toBe("paga");
  });

  it("Asaas e manual quitam de fato; aberta vencida e atraso", () => {
    expect(situacaoParaCliente({ paga: true, origemPagamento: "asaas", dataVencimento: depois }, hoje)).toBe("paga");
    expect(situacaoParaCliente({ paga: true, origemPagamento: "manual", dataVencimento: antes }, hoje)).toBe("paga");
    expect(situacaoParaCliente({ paga: false, origemPagamento: null, dataVencimento: antes }, hoje)).toBe("vencida");
    expect(situacaoParaCliente({ paga: false, origemPagamento: null, dataVencimento: depois }, hoje)).toBe("a_vencer");
  });

  it("limite de credito da IA interna usa a mesma regra do agente", () => {
    const ia = readFileSync(join(process.cwd(), "src/lib/ai-actions.ts"), "utf8");
    const inicio = ia.indexOf('case "consultar_limite_cliente"');
    const trecho = ia.slice(inicio, inicio + 1500);
    expect(trecho.includes("FILTRO_PARCELA_COMPROMETIDA")).toBe(true);
    const parcelas = ia.slice(ia.indexOf('case "consultar_parcelas_cliente"'), inicio);
    expect(parcelas.includes("situacaoParaCliente(")).toBe(true);
  });
});

function parcela(over: Partial<ParcelaParaBaixa> = {}): ParcelaParaBaixa {
  return {
    id: 100,
    vendaId: 7,
    numeroParcela: 2,
    paga: false,
    origemPagamento: null,
    asaasPaymentId: null,
    vendaStatus: "ativa",
    fechamentoId: null,
    ...over,
  };
}

function pagamento(over: Partial<PagamentoAsaas> = {}): PagamentoAsaas {
  return {
    id: "pay_abc",
    status: "RECEIVED",
    externalReference: "7",
    installment: "ins_1",
    installmentNumber: 2,
    paymentDate: "2026-09-10",
    ...over,
  };
}

describe("decidirBaixaAsaas — baixa", () => {
  it("cobranca recebida do parcelamento baixa a parcela do mesmo numero com a data de pagamento", () => {
    expect(decidirBaixaAsaas(pagamento(), [parcela({ id: 99, numeroParcela: 1 }), parcela()])).toEqual({
      acao: "baixar",
      parcelaId: 100,
      asaasPaymentId: "pay_abc",
      dataPagamento: "2026-09-10",
    });
  });

  it("CONFIRMED, RECEIVED_IN_CASH e DUNNING_RECEIVED tambem contam como pagas", () => {
    for (const status of ["CONFIRMED", "RECEIVED_IN_CASH", "DUNNING_RECEIVED"]) {
      expect(decidirBaixaAsaas(pagamento({ status }), [parcela()]).acao).toBe("baixar");
    }
  });

  it("sem data de pagamento usa a data do cliente ou a de confirmacao", () => {
    const r = decidirBaixaAsaas(
      pagamento({ paymentDate: null, clientPaymentDate: null, confirmedDate: "2026-09-12" }),
      [parcela()],
    );
    expect(r).toMatchObject({ acao: "baixar", dataPagamento: "2026-09-12" });
  });

  it("cobranca avulsa (sem parcelamento) quita a parcela 1", () => {
    const r = decidirBaixaAsaas(pagamento({ installment: null, installmentNumber: null }), [
      parcela({ id: 50, numeroParcela: 1 }),
    ]);
    expect(r).toMatchObject({ acao: "baixar", parcelaId: 50 });
  });
});

describe("decidirBaixaAsaas — nao mexe", () => {
  it("parcelamento sem numero da parcela nao chuta a 1", () => {
    expect(decidirBaixaAsaas(pagamento({ installmentNumber: null }), [parcela({ numeroParcela: 1 })])).toEqual({
      acao: "ignorar",
      motivo: "sem_numero_parcela",
    });
  });

  // Fase 5 (spec §5.1): parcela reservada num fechamento só é liquidada pelo fechamento.
  it("parcela reservada num fechamento: cobrança paga não baixa, pede alerta aos admins", () => {
    expect(decidirBaixaAsaas(pagamento(), [parcela({ fechamentoId: 11 })])).toEqual({
      acao: "alertar_reservada",
      parcelaId: 100,
      fechamentoId: 11,
      asaasPaymentId: "pay_abc",
    });
    expect(decidirBaixaAsaas(pagamento({ status: "CONFIRMED" }), [parcela({ fechamentoId: 11 })])).toMatchObject({
      acao: "alertar_reservada",
    });
    // Cobrança apagada no Asaas não é dinheiro: só ignora.
    expect(decidirBaixaAsaas(pagamento({ deleted: true }), [parcela({ fechamentoId: 11 })])).toEqual({
      acao: "ignorar",
      motivo: "reservada_no_fechamento",
    });
  });

  it("parcela reservada num fechamento: estornada ou pendente, ignora", () => {
    expect(decidirBaixaAsaas(pagamento({ status: "PENDING" }), [parcela({ fechamentoId: 11 })])).toEqual({
      acao: "ignorar",
      motivo: "reservada_no_fechamento",
    });
    const baixada = parcela({ fechamentoId: 11, paga: true, origemPagamento: "asaas", asaasPaymentId: "pay_abc" });
    expect(decidirBaixaAsaas(pagamento({ status: "REFUNDED" }), [baixada])).toEqual({
      acao: "ignorar",
      motivo: "reservada_no_fechamento",
    });
  });

  it("referencia que nao e venda, venda nao ativa, parcela inexistente ou duplicada", () => {
    expect(decidirBaixaAsaas(pagamento({ externalReference: "abc" }), [parcela()])).toMatchObject({ motivo: "referencia_invalida" });
    expect(decidirBaixaAsaas(pagamento(), [parcela({ vendaStatus: "cancelada" })])).toMatchObject({ motivo: "venda_inativa" });
    expect(decidirBaixaAsaas(pagamento({ installmentNumber: 5 }), [parcela()])).toMatchObject({ motivo: "sem_parcela" });
    expect(decidirBaixaAsaas(pagamento(), [parcela({ id: 1 }), parcela({ id: 2 })])).toMatchObject({ motivo: "parcela_ambigua" });
  });

  it("nunca pisa baixa manual ou da Prudent", () => {
    for (const origem of ["manual", "prudent"]) {
      expect(decidirBaixaAsaas(pagamento(), [parcela({ paga: true, origemPagamento: origem })])).toMatchObject({
        acao: "ignorar",
        motivo: "baixada_por_outra_origem",
      });
      expect(
        decidirBaixaAsaas(pagamento({ status: "REFUNDED" }), [parcela({ paga: true, origemPagamento: origem })]),
      ).toMatchObject({ acao: "ignorar" });
    }
  });

  it("mesma cobranca ja baixada nao grava de novo", () => {
    expect(
      decidirBaixaAsaas(pagamento(), [parcela({ paga: true, origemPagamento: "asaas", asaasPaymentId: "pay_abc" })]),
    ).toEqual({ acao: "ignorar", motivo: "sem_mudanca" });
  });

  it("cobranca pendente em parcela aberta nao faz nada", () => {
    expect(decidirBaixaAsaas(pagamento({ status: "PENDING" }), [parcela()])).toEqual({ acao: "ignorar", motivo: "sem_mudanca" });
  });
});

describe("decidirBaixaAsaas — desfaz", () => {
  const baixadaPeloAsaas = parcela({ paga: true, origemPagamento: "asaas", asaasPaymentId: "pay_abc" });

  it("estorno, cobranca apagada ou voltando a pendente desfaz a baixa do proprio Asaas", () => {
    for (const status of ["REFUNDED", "RECEIVED_IN_CASH_UNDONE", "PENDING", "OVERDUE", "CHARGEBACK_REQUESTED"]) {
      expect(decidirBaixaAsaas(pagamento({ status }), [baixadaPeloAsaas])).toEqual({ acao: "desfazer", parcelaId: 100 });
    }
    expect(decidirBaixaAsaas(pagamento({ deleted: true }), [baixadaPeloAsaas])).toEqual({ acao: "desfazer", parcelaId: 100 });
  });

  it("estorno de outra cobranca nao desfaz a baixa feita por esta", () => {
    expect(
      decidirBaixaAsaas(pagamento({ id: "pay_outra", status: "REFUNDED" }), [baixadaPeloAsaas]),
    ).toMatchObject({ acao: "ignorar" });
  });
});
