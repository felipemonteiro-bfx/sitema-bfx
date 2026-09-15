import { describe, it, expect } from "vitest";
import { decidirConfirmacaoConsignado } from "@/lib/consignado-venda";
import { FORMA_PAGAMENTO } from "@/lib/forma-pagamento";

describe("decidirConfirmacaoConsignado", () => {
  it("folha com pct posterior >= 30 sem confirmacao recusa", () => {
    const r = decidirConfirmacaoConsignado({
      formaPagamento: FORMA_PAGAMENTO.DESCONTO_FOLHA,
      descontoEmFolha: true,
      renda: 1000,
      tomadoAtual: 250,
      valorParcelaNova: 80,
      confirmouLimiteConsignado: false,
    });
    expect(r).toEqual({ ok: false, motivo: "precisa_confirmacao", pctPosterior: 33 });
  });

  it("folha com pct posterior >= 30 confirmada libera e marca excedeuLimite", () => {
    const r = decidirConfirmacaoConsignado({
      formaPagamento: FORMA_PAGAMENTO.DESCONTO_FOLHA,
      descontoEmFolha: true,
      renda: 1000,
      tomadoAtual: 250,
      valorParcelaNova: 80,
      confirmouLimiteConsignado: true,
    });
    expect(r).toEqual({ ok: true, excedeuLimite: 1, pctPosterior: 33, faixaPosterior: "limite" });
  });

  it("PIX com o mesmo comprometimento nao exige o flag", () => {
    const r = decidirConfirmacaoConsignado({
      formaPagamento: FORMA_PAGAMENTO.PIX,
      descontoEmFolha: false,
      renda: 1000,
      tomadoAtual: 400,
      valorParcelaNova: 80,
      confirmouLimiteConsignado: false,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.excedeuLimite).toBe(0);
  });

  it("folha abaixo de 30% nao pede confirmacao e nao marca excedeuLimite", () => {
    const r = decidirConfirmacaoConsignado({
      formaPagamento: FORMA_PAGAMENTO.DESCONTO_FOLHA,
      descontoEmFolha: true,
      renda: 1000,
      tomadoAtual: 150,
      valorParcelaNova: 50,
      confirmouLimiteConsignado: false,
    });
    expect(r).toMatchObject({ ok: true, excedeuLimite: 0, faixaPosterior: "alerta" });
  });

  it("sem renda nao trava folha", () => {
    const r = decidirConfirmacaoConsignado({
      formaPagamento: FORMA_PAGAMENTO.DESCONTO_FOLHA,
      descontoEmFolha: true,
      renda: null,
      tomadoAtual: 900,
      valorParcelaNova: 100,
      confirmouLimiteConsignado: false,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.excedeuLimite).toBe(0);
  });
});
