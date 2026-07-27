import { describe, it, expect } from "vitest";
import { importacaoPayloadSchema } from "@/lib/validations/importacao";

const linha = {
  cliente: "João da Silva",
  produto: "Notebook",
  valor: "3200",
  dataVenda: "2026-02-01",
  parcelas: "6",
};

describe("importacaoPayloadSchema — empresa dos clientes importados", () => {
  it("aceita o formato novo e devolve a empresa escolhida", () => {
    const r = importacaoPayloadSchema.safeParse({ empresaParceiraId: 3, rows: [linha] });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.empresaParceiraId).toBe(3);
    expect(r.data.rows).toHaveLength(1);
  });

  it("aceita empresaParceiraId como string (vem do <select>)", () => {
    const r = importacaoPayloadSchema.safeParse({ empresaParceiraId: "3", rows: [linha] });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.empresaParceiraId).toBe(3);
  });

  it("aceita o formato antigo (array puro) sem empresa", () => {
    const r = importacaoPayloadSchema.safeParse([linha]);
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.empresaParceiraId).toBeNull();
    expect(r.data.rows).toHaveLength(1);
  });

  it.each([null, undefined, "", "0", "abc", -1, 1.5])(
    "normaliza empresaParceiraId invalido (%s) para null em vez de quebrar",
    (v) => {
      const r = importacaoPayloadSchema.safeParse({ empresaParceiraId: v, rows: [linha] });
      expect(r.success).toBe(true);
      if (!r.success) return;
      expect(r.data.empresaParceiraId).toBeNull();
    }
  );

  it("rejeita linha sem cliente", () => {
    const r = importacaoPayloadSchema.safeParse({ empresaParceiraId: 3, rows: [{ ...linha, cliente: "" }] });
    expect(r.success).toBe(false);
  });
});
