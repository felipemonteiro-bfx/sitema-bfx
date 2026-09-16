import { describe, it, expect } from "vitest";
import { decidirConfirmacaoConsignado, estadoCardLimite } from "@/lib/consignado-venda";
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

describe("estadoCardLimite", () => {
  const base = {
    renda: 1000,
    margemTotal: 300,
    comprometimentoAtual: 100,
    margemDisponivel: 200,
    tetoParcelaMax: 475,
    tomadoConsignado: 150,
    tomadoFolhaBfx: 0,
    pctConsignado: 15,
    faixaConsignado: "ok",
    margemFolhaTotal: 300,
    margemFolhaDisponivel: 150,
  };

  it("folha sem renda fica em renda pendente, sem limite, disponivel nem barra", () => {
    const r = estadoCardLimite({
      descontoEmFolha: true,
      limite: {
        ...base,
        renda: 0,
        margemTotal: 0,
        margemDisponivel: -100,
        pctConsignado: null,
        faixaConsignado: "renda_pendente",
        margemFolhaTotal: 0,
        margemFolhaDisponivel: -150,
      },
      valorParcela: 90,
    });
    expect(r.tom).toBe("renda_pendente");
    expect(r.limite).toBeNull();
    expect(r.disponivel).toBeNull();
    expect(r.pctBarra).toBeNull();
    expect(r.comprometido).toBe(150);
  });

  it("folha com parcela nova levando a 30% ou mais fica em limite, mesmo com faixa atual ok", () => {
    const r = estadoCardLimite({ descontoEmFolha: true, limite: base, valorParcela: 150 });
    expect(r.tom).toBe("limite");
    expect(r.limite).toBe(300);
    expect(r.disponivel).toBe(150);
  });

  it("folha abaixo de 30% com faixa atual alerta fica em alerta", () => {
    const r = estadoCardLimite({
      descontoEmFolha: true,
      limite: { ...base, tomadoConsignado: 220, pctConsignado: 22, faixaConsignado: "alerta", margemFolhaDisponivel: 80 },
      valorParcela: 50,
    });
    expect(r.tom).toBe("alerta");
    expect(r.pctConsignado).toBe(22);
    expect(r.pctBarra).toBeCloseTo((220 / 300) * 100, 5);
  });

  it("folha tranquila fica ok com barra pelas chaves de folha", () => {
    const r = estadoCardLimite({ descontoEmFolha: true, limite: base, valorParcela: 40 });
    expect(r.tom).toBe("ok");
    expect(r.pctBarra).toBe(50);
  });

  it("PIX com parcela acima do disponivel fica em excede e usa as chaves antigas", () => {
    const r = estadoCardLimite({ descontoEmFolha: false, limite: base, valorParcela: 250 });
    expect(r.tom).toBe("excede");
    expect(r.limite).toBe(300);
    expect(r.comprometido).toBe(100);
    expect(r.disponivel).toBe(200);
    expect(r.pctConsignado).toBeNull();
  });

  it("PIX normal fica ok e mantem a barra de comprometimento", () => {
    const r = estadoCardLimite({ descontoEmFolha: false, limite: { ...base, faixaConsignado: "limite" }, valorParcela: 50 });
    expect(r.tom).toBe("ok");
    expect(r.pctBarra).toBeCloseTo((100 / 300) * 100, 5);
  });
});
