import { describe, it, expect } from "vitest";
import {
  calcularConsignadoDeRegistros,
  clientePassaFiltroConsignado,
  montarPayloadLimite,
} from "@/lib/consignado";

const MES = new Date(2026, 8, 15); // 15/09/2026

function contrato(over: {
  valorParcela: number;
  competenciaInicioDesconto?: string;
  competenciaFimDesconto?: string;
}) {
  return {
    valorParcela: over.valorParcela,
    competenciaInicioDesconto: over.competenciaInicioDesconto ?? "01/2026",
    competenciaFimDesconto: over.competenciaFimDesconto ?? "12/2030",
  };
}

function folha(valorParcela: number, dataVenda = new Date(2026, 6, 10), parcelas = 12) {
  return {
    dataVenda,
    parcelas,
    valorParcela,
    status: "ativa",
    descontoEmFolha: true,
    formaPagamento: "DESCONTO_FOLHA" as const,
  };
}

describe("calcularConsignadoDeRegistros", () => {
  it("15% banco + 10% folha BFX = 25% alerta", () => {
    const r = calcularConsignadoDeRegistros({
      renda: 1000,
      contratos: [contrato({ valorParcela: 150 })],
      vendasFolha: [folha(100)],
      mesRef: MES,
    });
    expect(r.pct).toBe(25);
    expect(r.faixa).toBe("alerta");
    expect(r.tomadoConsignado).toBe(150);
    expect(r.tomadoFolhaBfx).toBe(100);
  });

  it("15% banco + 20% folha BFX = 35% limite", () => {
    const r = calcularConsignadoDeRegistros({
      renda: 1000,
      contratos: [contrato({ valorParcela: 150 })],
      vendasFolha: [folha(200)],
      mesRef: MES,
    });
    expect(r.pct).toBe(35);
    expect(r.faixa).toBe("limite");
  });

  it("renda null vira renda_pendente e nao alerta", () => {
    const r = calcularConsignadoDeRegistros({
      renda: null,
      contratos: [contrato({ valorParcela: 400 })],
      vendasFolha: [folha(100)],
      mesRef: MES,
    });
    expect(r.pct).toBeNull();
    expect(r.faixa).toBe("renda_pendente");
  });

  it("20 inclusive e alerta; 30 inclusive e limite; abaixo de 20 e ok", () => {
    expect(
      calcularConsignadoDeRegistros({
        renda: 1000,
        contratos: [contrato({ valorParcela: 200 })],
        vendasFolha: [],
        mesRef: MES,
      }).faixa,
    ).toBe("alerta");
    expect(
      calcularConsignadoDeRegistros({
        renda: 1000,
        contratos: [contrato({ valorParcela: 300 })],
        vendasFolha: [],
        mesRef: MES,
      }).faixa,
    ).toBe("limite");
    expect(
      calcularConsignadoDeRegistros({
        renda: 1000,
        contratos: [contrato({ valorParcela: 199 })],
        vendasFolha: [],
        mesRef: MES,
      }).faixa,
    ).toBe("ok");
  });

  it("competenciaFimDesconto no mes passado nao entra na soma", () => {
    const r = calcularConsignadoDeRegistros({
      renda: 1000,
      contratos: [
        contrato({ valorParcela: 400, competenciaInicioDesconto: "01/2026", competenciaFimDesconto: "08/2026" }),
        contrato({ valorParcela: 50, competenciaInicioDesconto: "01/2026", competenciaFimDesconto: "12/2026" }),
      ],
      vendasFolha: [],
      mesRef: MES,
    });
    expect(r.tomadoConsignado).toBe(50);
    expect(r.pct).toBe(5);
    expect(r.faixa).toBe("ok");
  });

  it("o mesmo contrato conta uma vez mesmo se listado duas vezes", () => {
    const r = calcularConsignadoDeRegistros({
      renda: 1000,
      contratos: [
        { ...contrato({ valorParcela: 150 }), ifConcessoraCodigo: "001", contrato: "CTR-001" },
        { ...contrato({ valorParcela: 150 }), ifConcessoraCodigo: "001", contrato: "CTR-001" },
      ],
      vendasFolha: [],
      mesRef: MES,
    });
    expect(r.tomadoConsignado).toBe(150);
    expect(r.pct).toBe(15);
  });

  it("venda PIX/boleto nao entra no tomado de folha", () => {
    const r = calcularConsignadoDeRegistros({
      renda: 1000,
      contratos: [],
      vendasFolha: [
        {
          dataVenda: new Date(2026, 6, 10),
          parcelas: 12,
          valorParcela: 400,
          status: "ativa",
          descontoEmFolha: false,
          formaPagamento: "PIX",
        },
      ],
      mesRef: MES,
    });
    expect(r.tomadoFolhaBfx).toBe(0);
    expect(r.faixa).toBe("ok");
  });
});

describe("montarPayloadLimite", () => {
  it("chaves antigas continuam todas as vendas; chaves novas separam banco e folha", () => {
    const pix = {
      dataVenda: new Date(2026, 6, 10),
      parcelas: 12,
      valorParcela: 80,
      status: "ativa",
      descontoEmFolha: false,
      formaPagamento: "PIX",
    };
    const consignado = calcularConsignadoDeRegistros({
      renda: 1000,
      contratos: [contrato({ valorParcela: 150 })],
      vendasFolha: [folha(100), pix],
      mesRef: MES,
    });
    const payload = montarPayloadLimite({
      nome: "MARIA",
      renda: 1000,
      vendas: [folha(100), pix],
      consignado,
      mesRef: MES,
    });
    expect(payload.comprometimentoAtual).toBe(180);
    expect(payload.margemTotal).toBe(300);
    expect(payload.tomadoConsignado).toBe(150);
    expect(payload.tomadoFolhaBfx).toBe(100);
    expect(payload.pctConsignado).toBe(25);
    expect(payload.faixaConsignado).toBe("alerta");
    expect(payload.tetoParcelaMax).toBe(475);
  });
});

describe("clientePassaFiltroConsignado", () => {
  it("faixa alerta AND empresa parceira so devolve quem bate nos dois", () => {
    const alertaAmazon = { faixaConsignado: "alerta", empresaParceiraId: 3 };
    const alertaOutra = { faixaConsignado: "alerta", empresaParceiraId: 9 };
    const limiteAmazon = { faixaConsignado: "limite", empresaParceiraId: 3 };
    const filtro = { faixa: "alerta", empresaParceiraId: 3 };
    expect(clientePassaFiltroConsignado(alertaAmazon, filtro)).toBe(true);
    expect(clientePassaFiltroConsignado(alertaOutra, filtro)).toBe(false);
    expect(clientePassaFiltroConsignado(limiteAmazon, filtro)).toBe(false);
  });
});
