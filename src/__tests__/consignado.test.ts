import { describe, it, expect } from "vitest";
import {
  calcularConsignadoDeRegistros,
  clientePassaFiltroConsignado,
  formatarPctConsignado,
  mesRefConsignado,
  montarPayloadLimite,
  OPCOES_FILTRO_FAIXA_CONSIGNADO,
  planejarRecalculoConsignado,
  ROTULO_FAIXA_CONSIGNADO,
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

describe("planejarRecalculoConsignado", () => {
  it("cliente so com folha BFX a 25% vira alerta; sem renda vira renda_pendente; agrupa por pct e faixa", () => {
    const grupos = planejarRecalculoConsignado({
      clientes: [
        { id: 1, renda: 1000 },
        { id: 2, renda: null },
        { id: 3, renda: 2000 },
        { id: 4, renda: 500 },
      ],
      contratos: [
        { clienteId: 3, ...contrato({ valorParcela: 500 }), ifConcessoraCodigo: "237", contrato: "X1" },
      ],
      vendas: [
        { clienteId: 1, ...folha(250) },
        { clienteId: 2, ...folha(100) },
        { clienteId: null, ...folha(999) },
      ],
      mesRef: MES,
    });

    const porId = new Map<number, { pct: number | null; faixa: string }>();
    for (const g of grupos) for (const id of g.ids) porId.set(id, { pct: g.pct, faixa: g.faixa });

    expect(porId.get(1)).toEqual({ pct: 25, faixa: "alerta" });
    expect(porId.get(3)).toEqual({ pct: 25, faixa: "alerta" });
    expect(porId.get(2)).toEqual({ pct: null, faixa: "renda_pendente" });
    expect(porId.get(4)).toEqual({ pct: 0, faixa: "ok" });
    expect(grupos.find((g) => g.faixa === "alerta")?.ids.sort()).toEqual([1, 3]);
    expect(grupos).toHaveLength(3);
  });
});

describe("mesRefConsignado", () => {
  it("formata o mes civil como YYYY-MM", () => {
    expect(mesRefConsignado(new Date(2026, 8, 30))).toBe("2026-09");
    expect(mesRefConsignado(new Date(2027, 0, 1))).toBe("2027-01");
  });
});

describe("formatarPctConsignado", () => {
  it("usa virgula decimal pt-BR e traco quando nao ha %", () => {
    expect(formatarPctConsignado(25.5)).toBe("25,5%");
    expect(formatarPctConsignado(33.33)).toBe("33,33%");
    expect(formatarPctConsignado(20)).toBe("20%");
    expect(formatarPctConsignado(null)).toBe("—");
    expect(formatarPctConsignado(undefined)).toBe("—");
  });
});

describe("rotulos de faixa", () => {
  it("filtro e selo usam o mesmo texto para cada faixa", () => {
    expect(ROTULO_FAIXA_CONSIGNADO.alerta).toBe("Alerta 20%");
    expect(ROTULO_FAIXA_CONSIGNADO.limite).toBe("Limite 30%");
    expect(ROTULO_FAIXA_CONSIGNADO.renda_pendente).toBe("Renda pendente");
    const valores = OPCOES_FILTRO_FAIXA_CONSIGNADO.map((o) => o.value);
    expect(valores).toEqual(["ok", "alerta", "limite", "renda_pendente"]);
    for (const o of OPCOES_FILTRO_FAIXA_CONSIGNADO) {
      expect(o.label).toBe(ROTULO_FAIXA_CONSIGNADO[o.value]);
    }
  });
});
