// Teste-gate (D-05): le o fonte de `edit-venda-historico-form.tsx` com `readFileSync` e
// afirma o texto esperado sem executar o componente. Mesmo formato de
// `tokens-fundo-neutro.test.ts` — so `.includes()`, nunca o metodo de execucao de regex
// sobre objeto RegExp (bloqueado pelo hook de seguranca do CLAUDE.md).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE_PATH = join(process.cwd(), "src/components/edit-venda-historico-form.tsx");
const source = readFileSync(SOURCE_PATH, "utf8");

describe("edit-venda-historico-form.tsx — UX do formulario de edicao (D-05)", () => {
  it("rotulo do submit esta acentuado: 'Salvar alterações'", () => {
    expect(source.includes("Salvar alterações")).toBe(true);
  });

  it("nao contem mais a grafia sem acento 'Salvar alteracoes'", () => {
    expect(source.includes("Salvar alteracoes")).toBe(false);
  });

  it("formulario agrupado em secoes via FormSecaoTitulo", () => {
    expect(source.includes("FormSecaoTitulo")).toBe(true);
  });

  it("nenhuma cor crua entre colchetes no Tailwind para fundo (bg-[)", () => {
    expect(source.includes("bg-[")).toBe(false);
  });

  it("nenhuma cor crua entre colchetes no Tailwind para texto (text-[)", () => {
    expect(source.includes("text-[")).toBe(false);
  });

  it("nenhuma cor crua entre colchetes no Tailwind para borda (border-[)", () => {
    expect(source.includes("border-[")).toBe(false);
  });
});
