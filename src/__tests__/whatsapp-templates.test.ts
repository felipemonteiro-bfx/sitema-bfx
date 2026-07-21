import { describe, it, expect } from "vitest";
import { TEMPLATES, comFallback } from "@/lib/whatsapp-templates";

describe("TEMPLATES", () => {
  it("cobre os 18 templates transacionais", () => {
    expect(Object.keys(TEMPLATES).sort()).toEqual(
      [
        "agradecimento",
        "aniversario",
        "anoNovo",
        "boasVindas",
        "boleto",
        "diaCliente",
        "diaCriancas",
        "diaMulheres",
        "diaNamorados",
        "lembreteParcela",
        "natal",
        "nps",
        "parcelaVencida",
        "primeiraCompra",
        "reativacao",
        "recibo",
        "recompra",
        "relatorioEmpresa",
      ].sort()
    );
  });

  it("todos os nomes usam o prefixo bfx_", () => {
    for (const nome of Object.values(TEMPLATES)) {
      expect(nome.startsWith("bfx_")).toBe(true);
    }
  });

  it("nomes são únicos", () => {
    const nomes = Object.values(TEMPLATES);
    expect(new Set(nomes).size).toBe(nomes.length);
  });
});

describe("comFallback", () => {
  it("monta o template com idioma, params e fallbackText", () => {
    const t = comFallback(TEMPLATES.recibo, ["João", "http://x/r.pdf"], "Olá João, seu recibo: http://x/r.pdf");
    expect(t).toMatchObject({
      name: "bfx_recibo",
      bodyParams: ["João", "http://x/r.pdf"],
      fallbackText: "Olá João, seu recibo: http://x/r.pdf",
    });
    expect(t.language).toBeTruthy();
  });
});
