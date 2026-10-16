import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

/**
 * O `cn()` usa tailwind-merge, que só conhece as utilitárias padrão do Tailwind. As do Vantage
 * (raios, escala de título/KPI, cores de superfície) são nossas: sem registro, o merge as trata
 * como grupo desconhecido ou, pior, `text-titulo` vira COR e derruba `text-foreground`.
 */
describe("cn() com as utilitárias do redesign Vantage", () => {
  it("raio do tema substitui o raio padrão (e vice-versa)", () => {
    expect(cn("rounded-lg", "rounded-painel")).toBe("rounded-painel");
    expect(cn("rounded-painel", "rounded-md")).toBe("rounded-md");
    expect(cn("rounded-shell", "rounded-controle")).toBe("rounded-controle");
  });

  it("text-titulo é tamanho: convive com a cor e substitui outro tamanho", () => {
    expect(cn("text-titulo", "text-foreground")).toBe("text-titulo text-foreground");
    expect(cn("text-sm", "text-titulo")).toBe("text-titulo");
    expect(cn("text-kpi", "text-xs")).toBe("text-xs");
    expect(cn("text-kpi", "text-primary")).toBe("text-kpi text-primary");
  });

  it("cores novas disputam o mesmo grupo das cores padrão", () => {
    expect(cn("bg-card", "bg-shell")).toBe("bg-shell");
    expect(cn("bg-controle", "bg-controle-ativo")).toBe("bg-controle-ativo");
    expect(cn("text-foreground", "text-texto-secundario")).toBe("text-texto-secundario");
    expect(cn("border-border", "border-painel-borda")).toBe("border-painel-borda");
  });

  it("não funde o que é de grupos diferentes", () => {
    expect(cn("bg-shell", "text-foreground", "border-divisoria")).toBe("bg-shell text-foreground border-divisoria");
    expect(cn("font-mono", "font-semibold")).toBe("font-mono font-semibold");
  });
});
