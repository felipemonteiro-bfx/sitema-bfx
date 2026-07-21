import { describe, it, expect } from "vitest";
import { vendaV2Schema } from "@/lib/validations/venda";

const base = {
  data: "2026-06-30",
  vendedor: "Jakeline",
  clienteId: 1,
  frete: 0,
  envio: 0,
  parcelas: 1,
  temNota: false,
  taxaNota: 5.97,
  produtos: [{ produtoNome: "blu", custoProduto: 0, valorVenda: 10, quantidade: 1, subtotal: 10 }],
};

describe("vendaV2Schema — valor de venda", () => {
  it("aceita venda com valor de venda positivo", () => {
    expect(vendaV2Schema.safeParse(base).success).toBe(true);
  });

  it("REJEITA produto com valorVenda 0 (evita venda R$ 0,00)", () => {
    const raw = { ...base, produtos: [{ produtoNome: "blu", custoProduto: 0, valorVenda: 0, quantidade: 1, subtotal: 0 }] };
    const r = vendaV2Schema.safeParse(raw);
    expect(r.success).toBe(false);
  });

  it("REJEITA subtotal 0 mesmo com valor unitário informado", () => {
    const raw = { ...base, produtos: [{ produtoNome: "blu", custoProduto: 0, valorVenda: 10, quantidade: 1, subtotal: 0 }] };
    expect(vendaV2Schema.safeParse(raw).success).toBe(false);
  });
});
