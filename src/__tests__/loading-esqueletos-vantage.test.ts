// Tarefa L do redesign Vantage: cada `loading.tsx` tem de antecipar o layout real da tela
// (mesma ordem e quantidade de blocos), ser acessível e neutro. A fidelidade de altura é medida
// no navegador (CLS); aqui ficam as travas estruturais que não dependem de banco nem de browser.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

const raiz = join(__dirname, "..", "..");
const app = join(raiz, "src", "app");

function acharLoadings(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return acharLoadings(caminho);
    return nome === "loading.tsx" ? [caminho] : [];
  });
}

const loadings = acharLoadings(app);
const rel = (c: string) => relative(raiz, c);

// Rotas de `(app)` com layout muito diferente do esqueleto genérico: precisam de `loading.tsx` próprio.
const ROTAS_COM_LAYOUT_PROPRIO = [
  "src/app/(app)/crm/atendimento/loading.tsx",
  "src/app/(janela)/crm/atendimento/janela/loading.tsx",
  "src/app/(app)/venda-rapida/loading.tsx",
  "src/app/(app)/historico/loading.tsx",
  "src/app/(app)/dashboard/loading.tsx",
  "src/app/(app)/crm/loading.tsx",
  "src/app/(app)/crm/relacionamento/loading.tsx",
  "src/app/(app)/crm/importar-leads/loading.tsx",
  "src/app/(app)/obrigacoes/loading.tsx",
  "src/app/(app)/financeiro/loading.tsx",
  "src/app/(auth)/loading.tsx",
];

describe("loading.tsx das rotas", () => {
  it("existem esqueletos próprios para as rotas de layout próprio", () => {
    for (const r of ROTAS_COM_LAYOUT_PROPRIO) {
      expect(existsSync(join(raiz, r)), `falta ${r}`).toBe(true);
    }
  });

  it("encontra os loading.tsx esperados (sanidade do glob)", () => {
    expect(loadings.length).toBeGreaterThanOrEqual(24);
  });

  for (const caminho of loadings) {
    describe(rel(caminho), () => {
      it("renderiza uma região role=status, ocupada e com texto sr-only 'Carregando…'", async () => {
        const modulo = await import(caminho);
        const html = renderToStaticMarkup(createElement(modulo.default));
        expect(html).toMatch(/role="status"/);
        expect(html).toMatch(/aria-busy="true"/);
        expect(html).toMatch(/<span class="sr-only">Carregando…<\/span>/);
      });

      it("não usa gradiente, shimmer, raio cru grande nem cor crua", () => {
        const fonte = readFileSync(caminho, "utf8");
        expect(fonte).not.toMatch(/gradient|shimmer|rounded-(xl|2xl|3xl)\b/);
        expect(fonte).not.toMatch(/\b(bg|text|border)-(red|green|blue|yellow|gray|slate|zinc|white|black)-?\d*\b/);
      });
    });
  }
});

describe("skeleton.tsx", () => {
  const fonte = readFileSync(join(raiz, "src/components/ui/skeleton.tsx"), "utf8");

  it("é neutro: sem gradiente, sem shimmer e sem raio cru grande", () => {
    expect(fonte).not.toMatch(/gradient|shimmer/);
    expect(fonte).not.toMatch(/rounded-(xl|2xl|3xl)\b/);
  });

  it("o bloco pulsa só sem prefers-reduced-motion", () => {
    expect(fonte).toMatch(/animate-pulse[^"]*motion-reduce:animate-none/);
  });

  it("o bloco é escondido do leitor de tela (o anúncio é da região)", () => {
    expect(fonte).toMatch(/aria-hidden="true"/);
    expect(fonte).toMatch(/role="status"/);
    expect(fonte).toMatch(/sr-only/);
  });

  it("o esqueleto do atendimento tem as 3 colunas lista/conversa/contexto", () => {
    expect(fonte).toMatch(/lg:grid-cols-\[minmax\(15rem,20rem\)_minmax\(0,1fr\)_minmax\(16rem,20rem\)\]/);
  });
});
