// Tabela de linhas recusadas nas importacoes precisa rolar (2026-09-16).
// Ver docs/superpowers/specs/2026-09-16-e-consignado-correcoes-auditoria.md, 9.3.
//
// O `ScrollArea` do shadcn poe `max-h` no Root, mas o Viewport do Radix e `h-full`: com
// altura automatica ele cresce com o conteudo, o Root corta (overflow-hidden) e nao aparece
// barra. Linhas alem de 256px ficavam inalcancaveis. Le o fonte (so `.includes()`).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ler = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

const TELAS = [
  "src/components/importacao-consignado-client.tsx",
  "src/components/importacao-clientes-client.tsx",
  "src/components/importacao-fornecedores-client.tsx",
];

describe("importacoes — tabela de erros rolavel", () => {
  for (const tela of TELAS) {
    it(`${tela} nao usa ScrollArea com max-h e rola com overflow`, () => {
      const fonte = ler(tela);
      expect(fonte.includes("<ScrollArea")).toBe(false);
      expect(fonte.includes("max-h-64 overflow-y-auto")).toBe(true);
    });
  }
});
