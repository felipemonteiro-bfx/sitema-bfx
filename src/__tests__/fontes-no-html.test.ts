import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// `--font-mono`/`--font-sans`/`--font-display` são montadas no `:root` (o <html>) a partir das
// variáveis do next/font. Se as classes `.variable` ficarem no <body>, essas variáveis não existem
// no <html>, a declaração fica inválida e `.tabular-nums` cai na fonte padrão em vez da Geist Mono.
const layout = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");

describe("variáveis das fontes no <html>", () => {
  it("aplica as três .variable no <html>, não no <body>", () => {
    const html = layout.split("<html")[1]?.split(">")[0] ?? "";
    const body = layout.split("<body")[1]?.split(">")[0] ?? "";
    for (const fonte of ["manrope.variable", "spaceGrotesk.variable", "geistMono.variable"]) {
      expect(html).toContain(fonte);
      expect(body).not.toContain(fonte);
    }
  });
});
