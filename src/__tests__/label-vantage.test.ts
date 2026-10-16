import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// O Label da `ui` é a origem da caixa-alta que aparecia em todas as telas
// (design-system/VANTAGE-PADROES.md: rótulo em frase normal, sem uppercase).
const fonte = readFileSync(join(process.cwd(), "src/components/ui/label.tsx"), "utf8");

describe("Label no padrão Vantage", () => {
  it("não força caixa-alta nem espaçamento largo", () => {
    expect(fonte).not.toMatch(/\buppercase\b/);
    expect(fonte).not.toMatch(/tracking-wider|tracking-wide\b/);
  });

  it("usa rótulo em text-sm, peso médio e cor muted", () => {
    expect(fonte).toMatch(/text-sm/);
    expect(fonte).toMatch(/font-medium/);
    expect(fonte).toMatch(/text-muted-foreground/);
  });
});
