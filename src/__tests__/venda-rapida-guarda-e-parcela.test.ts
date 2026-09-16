// Venda rapida: guarda de sessao nas actions e parcela unica entre card e confirmacao (2026-09-16).
// Ver docs/superpowers/specs/2026-09-16-e-consignado-correcoes-auditoria.md, itens 1 e 7.
//
// Le o fonte, no formato de `venda-rejeicao-observavel.test.ts`: a action importa Asaas,
// WhatsApp e e-mail, e executar exigiria mockar tudo so para provar a primeira linha.
// Sem o metodo de execucao de regex (hook de seguranca do CLAUDE.md): so `.split()`,
// `.includes()` e `.indexOf()`.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = process.cwd();
const ler = (rel: string) => readFileSync(join(raiz, rel), "utf8");

/** Corpo da funcao exportada ate a proxima `export`, sem linhas de comentario. */
function corpoDe(fonte: string, assinatura: string): string {
  const inicio = fonte.indexOf(assinatura);
  if (inicio < 0) throw new Error(`nao achei ${assinatura}`);
  const resto = fonte.slice(inicio + assinatura.length);
  const fim = resto.indexOf("\nexport ");
  const corpo = fim >= 0 ? resto.slice(0, fim) : resto;
  return corpo
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");
}

/**
 * Primeira instrucao do corpo: a assinatura termina na primeira linha que acaba em `{`
 * (vale para assinatura de uma linha e para a de varias linhas com tipo de retorno).
 */
function primeiraInstrucao(corpo: string): string {
  const linhas = corpo.split("\n").map((l) => l.trim());
  const abertura = linhas.findIndex((l) => l.endsWith("{"));
  return linhas.slice(abertura + 1).filter(Boolean)[0] ?? "";
}

describe("venda-rapida/actions — guarda de sessao", () => {
  const actions = ler("src/app/(app)/venda-rapida/actions.ts");

  it("importa a guarda", () => {
    expect(actions.includes('from "@/lib/guards"')).toBe(true);
  });

  it("criarVendaV2 exige sessao antes de qualquer outra coisa", () => {
    const corpo = corpoDe(actions, "export async function criarVendaV2(");
    expect(primeiraInstrucao(corpo)).toBe("await requireSessionOrThrow();");
  });

  it("criarVenda (legada) exige sessao antes de qualquer outra coisa", () => {
    const corpo = corpoDe(actions, "export async function criarVenda(");
    expect(primeiraInstrucao(corpo)).toBe("await requireSessionOrThrow();");
  });
});

describe("venda-rapida-form-v2 — card e confirmacao usam a mesma parcela", () => {
  const form = ler("src/components/venda-rapida-form-v2.tsx");

  it("parcela do card e da confirmacao saem da mesma funcao, que desconta desconto e pontos", () => {
    expect(form.includes("const valorParcela = parcelaDe(subtotalProdutos);")).toBe(true);
    expect(form.includes("const valorParcelaFiltrado = parcelaDe(subtotalFiltrado);")).toBe(true);
    const definicao = corpoDe(form, "const parcelaDe = ").split(";")[0];
    expect(definicao.includes("- desconto")).toBe(true);
    expect(definicao.includes("- descontoPontos")).toBe(true);
  });

  it("a conta antiga sem desconto sumiu do submit", () => {
    expect(form.includes("subtotalFiltrado + numFrete;")).toBe(false);
  });
});
