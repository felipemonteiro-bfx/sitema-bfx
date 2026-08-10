import { describe, it, expect, vi, beforeEach } from "vitest";
import { custoEntregaDefinitivo, decidirGravacaoCustoEnvio } from "@/lib/uber-custo-entrega";

describe("custoEntregaDefinitivo (T-F21-04: BUSY_AREA_FEE muda antes da entrega concluir)", () => {
  it("Teste 1: 'delivered' e definitivo; status intermediarios nao sao", () => {
    expect(custoEntregaDefinitivo("delivered")).toBe(true);
    expect(custoEntregaDefinitivo("pending")).toBe(false);
    expect(custoEntregaDefinitivo("pickup")).toBe(false);
    expect(custoEntregaDefinitivo("en_route_to_dropoff")).toBe(false);
    expect(custoEntregaDefinitivo("dropoff")).toBe(false);
  });
});

describe("decidirGravacaoCustoEnvio (T-F21-04: protecao contra sobrescrita)", () => {
  it("Teste 2: venda sem custo e sem fonte -> grava, fonte 'uber_provisorio' quando status nao e final", () => {
    const d = decidirGravacaoCustoEnvio({
      custoEnvioAtual: 0,
      fonteAtual: null,
      novoCusto: 24.9,
      novoDefinitivo: false,
    });
    expect(d.gravar).toBe(true);
    if (!d.gravar) throw new Error("esperava gravar true");
    expect(d.fonteResultante).toBe("uber_provisorio");
  });

  it("Teste 3: custo digitado a mao (fonte nula, custo > 0) nunca e sobrescrito — 409", () => {
    const d = decidirGravacaoCustoEnvio({
      custoEnvioAtual: 35,
      fonteAtual: null,
      novoCusto: 24.9,
      novoDefinitivo: true,
    });
    expect(d.gravar).toBe(false);
    if (d.gravar) throw new Error("esperava gravar false");
    expect(d.motivo).toBe("custo_manual_preservado");
    expect(d.httpStatus).toBe(409);
  });

  it("Teste 4: fonte 'uber_provisorio' e novo custo definitivo -> grava e fonte vira 'uber_final'", () => {
    const d = decidirGravacaoCustoEnvio({
      custoEnvioAtual: 22,
      fonteAtual: "uber_provisorio",
      novoCusto: 24.9,
      novoDefinitivo: true,
    });
    expect(d.gravar).toBe(true);
    if (!d.gravar) throw new Error("esperava gravar true");
    expect(d.fonteResultante).toBe("uber_final");
  });

  it("Teste 5: fonte 'uber_final' e novo custo provisorio -> NAO grava — 409", () => {
    const d = decidirGravacaoCustoEnvio({
      custoEnvioAtual: 24.9,
      fonteAtual: "uber_final",
      novoCusto: 22,
      novoDefinitivo: false,
    });
    expect(d.gravar).toBe(false);
    if (d.gravar) throw new Error("esperava gravar false");
    expect(d.motivo).toBe("custo_final_ja_gravado");
    expect(d.httpStatus).toBe(409);
  });

  it("Teste 6: fonte 'uber_final' e novo custo definitivo com valor diferente -> grava (reconciliacao)", () => {
    const d = decidirGravacaoCustoEnvio({
      custoEnvioAtual: 24.9,
      fonteAtual: "uber_final",
      novoCusto: 27.5,
      novoDefinitivo: true,
    });
    expect(d.gravar).toBe(true);
    if (!d.gravar) throw new Error("esperava gravar true");
    expect(d.fonteResultante).toBe("uber_final");
  });
});

// Testes 7 e 8: registrarCustoEntregaUber grava uberDeliveryId/custoEnvioFonte no
// mesmo update e mapeia conflito de unicidade (P2002) para 409. Prisma mockado,
// mesmo padrao de fornecedores-post-route.test.ts.
const dbMock = {
  venda: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
};

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { registrarCustoEntregaUber } = await import("@/lib/uber-entrega");

const CONFIG_ESTATICA = { source: "static_token" as const, customerId: "cust1", token: "tok1" };

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.venda.findUnique.mockResolvedValue({ id: 7, status: "ativa", custoEnvio: 0, custoEnvioFonte: null });
  dbMock.venda.updateMany.mockResolvedValue({ count: 1 });
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      id: "del_1",
      status: "delivered",
      full_fee: { total: 2490, currency_code: "BRL", line_items: [] },
    }),
  });
});

describe("registrarCustoEntregaUber — rastreabilidade e trava de dupla contagem (T-F21-05)", () => {
  it("Teste 7: grava uberDeliveryId e custoEnvioFonte no mesmo update do custoEnvio", async () => {
    dbMock.venda.updateMany.mockResolvedValue({ count: 1 });

    await registrarCustoEntregaUber({ config: CONFIG_ESTATICA, vendaId: 7, deliveryId: "del_1" });

    expect(dbMock.venda.updateMany).toHaveBeenCalledTimes(1);
    const chamada = dbMock.venda.updateMany.mock.calls[0][0];
    expect(chamada.data.custoEnvio).toBe(24.9);
    expect(chamada.data.uberDeliveryId).toBe("del_1");
    expect(chamada.data.custoEnvioFonte).toBe("uber_final");
  });

  it("Teste 8: P2002 (delivery id ja usado em outra venda) vira gravado:false, motivo entrega_ja_lancada, 409", async () => {
    const erro = Object.assign(new Error("Unique constraint failed on the fields: (`uber_delivery_id`)"), {
      code: "P2002",
    });
    dbMock.venda.updateMany.mockRejectedValue(erro);

    const resultado = await registrarCustoEntregaUber({
      config: CONFIG_ESTATICA,
      vendaId: 7,
      deliveryId: "del_1",
    });

    expect(resultado.gravado).toBe(false);
    if (resultado.gravado) throw new Error("esperava gravado false");
    expect(resultado.motivo).toBe("entrega_ja_lancada");
    expect(resultado.httpStatus).toBe(409);
  });
});
