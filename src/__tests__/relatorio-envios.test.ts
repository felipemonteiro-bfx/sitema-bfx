import { describe, it, expect } from "vitest";
import { TEMPLATES } from "@/lib/whatsapp-templates";

// Garante que os nomes usados pelos call sites de relatório existem e são únicos.
describe("templates de relatório", () => {
  it("os 3 templates de relatório existem e relatorioEmpresa foi aposentado", () => {
    expect(TEMPLATES.relatorioVenda).toBe("bfx_relatorio_venda");
    expect(TEMPLATES.relatorioSemanal).toBe("bfx_relatorio_semanal");
    expect(TEMPLATES.relatorioMensal).toBe("bfx_relatorio_mensal");
    expect((TEMPLATES as Record<string, string>).relatorioEmpresa).toBeUndefined();
  });
});
