import { describe, it, expect } from "vitest";
import {
  converterCentavosParaReais,
  interpretarCustoEntregaUber,
  normalizarCodigoTaxaUber,
  deliveryIdValido,
} from "@/lib/uber-custo-entrega";

describe("converterCentavosParaReais (T-F21-02: erro de 100x corrompe o DRE inteiro)", () => {
  it("Teste 1: 2490 centavos vira 24.9 reais — nunca 2490, nunca 0.249", () => {
    expect(converterCentavosParaReais(2490)).toBe(24.9);
  });

  it("Teste 2: valor invalido (nao-inteiro, negativo, NaN, Infinity, string) nunca vira numero gravavel", () => {
    expect(converterCentavosParaReais(24.9)).toBeNull();
    expect(converterCentavosParaReais(-100)).toBeNull();
    expect(converterCentavosParaReais(NaN)).toBeNull();
    expect(converterCentavosParaReais(Infinity)).toBeNull();
    expect(converterCentavosParaReais("2490")).toBeNull();
  });
});

describe("interpretarCustoEntregaUber — caminho feliz", () => {
  it("Teste 3: full_fee com dois line items vira ok:true com total, moeda e linhas corretas", () => {
    const r = interpretarCustoEntregaUber(200, {
      id: "del_1",
      status: "delivered",
      full_fee: {
        total: 2490,
        currency_code: "BRL",
        line_items: [
          { fee_code: "FLAT_FEE", category: "DELIVERY", amount: 2000 },
          { fee_code: "COURIER_TIP", category: "TIP", amount: 490 },
        ],
      },
    });

    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("esperava ok:true");
    expect(r.totalCentavos).toBe(2490);
    expect(r.total).toBe(24.9);
    expect(r.moeda).toBe("BRL");
    expect(r.deliveryId).toBe("del_1");
    expect(r.status).toBe("delivered");
    expect(r.linhas).toHaveLength(2);
    expect(r.linhas[0].valor).toBe(20);
    expect(r.linhas[1].valor).toBe(4.9);
  });

  it("Teste 4: corpo aninhado sob `data` (envelope) e lido igual", () => {
    const r = interpretarCustoEntregaUber(200, {
      data: {
        id: "del_1",
        status: "delivered",
        full_fee: { total: 2490, currency_code: "BRL", line_items: [] },
      },
    });

    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("esperava ok:true");
    expect(r.total).toBe(24.9);
  });
});

describe("interpretarCustoEntregaUber — falhas", () => {
  it("Teste 5: moeda diferente de BRL nunca vira reais no banco", () => {
    const r = interpretarCustoEntregaUber(200, {
      id: "del_1",
      status: "delivered",
      full_fee: { total: 2490, currency_code: "USD", line_items: [] },
    });

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("esperava ok:false");
    expect(r.motivo).toBe("moeda_inesperada");
  });

  it("Teste 6: 200 sem full_fee vira resposta_incompleta", () => {
    const r = interpretarCustoEntregaUber(200, { id: "del_1", status: "delivered" });

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("esperava ok:false");
    expect(r.motivo).toBe("resposta_incompleta");
  });

  it("Teste 7: status HTTP mapeia para o motivo certo antes de olhar o corpo", () => {
    const r404 = interpretarCustoEntregaUber(404, {});
    expect(r404.ok).toBe(false);
    if (r404.ok) throw new Error("esperava ok:false");
    expect(r404.motivo).toBe("nao_encontrado");

    const r401 = interpretarCustoEntregaUber(401, {});
    expect(r401.ok).toBe(false);
    if (r401.ok) throw new Error("esperava ok:false");
    expect(r401.motivo).toBe("erro_upstream");

    const r403 = interpretarCustoEntregaUber(403, {});
    expect(r403.ok).toBe(false);
    if (r403.ok) throw new Error("esperava ok:false");
    expect(r403.motivo).toBe("erro_upstream");

    const r429 = interpretarCustoEntregaUber(429, {});
    expect(r429.ok).toBe(false);
    if (r429.ok) throw new Error("esperava ok:false");
    expect(r429.motivo).toBe("erro_upstream");
    expect(r429.detalhe).toMatch(/limite/);

    const r500 = interpretarCustoEntregaUber(500, {});
    expect(r500.ok).toBe(false);
    if (r500.ok) throw new Error("esperava ok:false");
    expect(r500.motivo).toBe("erro_upstream");
  });
});

describe("normalizarCodigoTaxaUber (T-F21-07: texto livre da Uber nunca atravessa)", () => {
  it("Teste 8: texto livre (nome de rua) nao aparece cru no resultado normalizado", () => {
    const r = interpretarCustoEntregaUber(200, {
      id: "del_1",
      status: "delivered",
      full_fee: {
        total: 2490,
        currency_code: "BRL",
        line_items: [{ fee_code: "Rua Augusta, 123 - apto 45", category: "DELIVERY", amount: 2490 }],
      },
    });

    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("esperava ok:true");
    const serializado = JSON.stringify(r);
    expect(serializado).not.toContain("Rua Augusta");
    expect(serializado).not.toContain("apto 45");
  });

  it("normalizarCodigoTaxaUber sobe para maiusculo, corta caracteres fora de A-Z/underscore e usa DESCONHECIDO quando vazio", () => {
    expect(normalizarCodigoTaxaUber("flat_fee")).toBe("FLAT_FEE");
    expect(normalizarCodigoTaxaUber("Rua Augusta, 123")).toBe("RUAAUGUSTA");
    expect(normalizarCodigoTaxaUber("123456")).toBe("DESCONHECIDO");
    expect(normalizarCodigoTaxaUber(null)).toBe("DESCONHECIDO");
  });
});

describe("deliveryIdValido (T-F21-09: montagem da URL com deliveryId)", () => {
  it("Teste 9: rejeita string vazia, com espaco, com barra, com '..' e com mais de 128 caracteres; aceita id valido", () => {
    expect(deliveryIdValido("")).toBe(false);
    expect(deliveryIdValido("del 1")).toBe(false);
    expect(deliveryIdValido("del/1")).toBe(false);
    expect(deliveryIdValido("../etc")).toBe(false);
    expect(deliveryIdValido("a".repeat(129))).toBe(false);
    expect(deliveryIdValido("del_9f3-AB")).toBe(true);
  });
});
