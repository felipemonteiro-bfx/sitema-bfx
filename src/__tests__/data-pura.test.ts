import { describe, it, expect } from "vitest";
import { formatarDataPura, formatarMesAnoPuro } from "@/lib/data-pura";

/**
 * Uma data de venda/vencimento e gravada com `new Date("YYYY-MM-DD")`, que por spec
 * do JS e meia-noite UTC. Formatar isso em America/Manaus (UTC-4) devolve 20h do dia
 * ANTERIOR — era por isso que a venda de 02/07 aparecia como 01/07 na tela.
 */
describe("formatarDataPura", () => {
  it("mostra o dia gravado, nao o anterior", () => {
    expect(formatarDataPura(new Date("2026-07-02"))).toBe("02/07/2026");
    expect(formatarDataPura(new Date("2026-06-18"))).toBe("18/06/2026");
  });

  it("nao volta um dia na virada do mes", () => {
    expect(formatarDataPura(new Date("2026-08-01"))).toBe("01/08/2026");
  });

  it("nao volta um dia na virada do ano", () => {
    expect(formatarDataPura(new Date("2026-01-01"))).toBe("01/01/2026");
  });

  it("aceita string ISO vinda serializada do servidor", () => {
    expect(formatarDataPura("2026-07-02T00:00:00.000Z")).toBe("02/07/2026");
  });

  it("aceita string date-only", () => {
    expect(formatarDataPura("2026-07-02")).toBe("02/07/2026");
  });

  it("data invalida devolve traco em vez de 'Invalid Date'", () => {
    expect(formatarDataPura("nao-e-data")).toBe("—");
    expect(formatarDataPura(null)).toBe("—");
    expect(formatarDataPura(undefined)).toBe("—");
  });
});

describe("formatarMesAnoPuro", () => {
  it("mostra o mes correto no primeiro dia", () => {
    // Em Manaus, 2026-08-01T00:00Z e' 31/07 20h — o mes exibido virava julho.
    expect(formatarMesAnoPuro(new Date("2026-08-01"))).toContain("ago");
  });

  it("mostra o mes correto no ultimo dia", () => {
    expect(formatarMesAnoPuro(new Date("2026-08-31"))).toContain("ago");
  });
});
