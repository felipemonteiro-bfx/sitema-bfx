// Tarefa H3 do redesign Vantage: Financeiro & DRE, Relatórios (com e-mails e mensais)
// e Minhas Comissões. Só visual: o teste lê a fonte e fixa as regras de
// design/VANTAGE-PADROES.md. Nenhum cálculo, filtro ou action é coberto aqui.
//
// Nota de segurança (CLAUDE.md): sem execução de regex com estado; só split/includes.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = join(__dirname, "..", "..");
const ler = (rel: string) => readFileSync(join(raiz, rel), "utf8");

const ARQUIVOS = [
  "src/app/(app)/financeiro/page.tsx",
  "src/app/(app)/financeiro/loading.tsx",
  "src/app/(app)/relatorios/page.tsx",
  "src/app/(app)/relatorios/loading.tsx",
  "src/app/(app)/relatorios/mensais/page.tsx",
  "src/app/(app)/relatorios/mensais/loading.tsx",
  "src/app/(app)/relatorios/emails/page.tsx",
  "src/app/(app)/comissoes/page.tsx",
  "src/app/(app)/comissoes/loading.tsx",
  "src/components/commissions-dashboard-client.tsx",
  "src/components/email-envio-detalhe.tsx",
  "src/components/emails-filtros.tsx",
  "src/components/finance-charts.tsx",
  "src/components/month-filter.tsx",
  "src/components/report-buttons-client.tsx",
] as const;

/** Tokens de classe que começam com `prefixo` (ex.: "rounded-"), lidos por split. */
function tokensCom(fonte: string, prefixo: string): string[] {
  return fonte
    .split(prefixo)
    .slice(1)
    .map((resto) => prefixo + (resto.split(/[\s"'`}]/)[0] ?? ""));
}

describe.each(ARQUIVOS)("%s segue o padrão Vantage", (arquivo) => {
  const fonte = ler(arquivo);

  it("sem caixa-alta nem tracking aberto", () => {
    expect(fonte.includes("uppercase")).toBe(false);
    expect(fonte.includes("tracking-wide")).toBe(false);
  });

  it("sem rounded cru (xl/2xl/3xl/lg/md): só os raios por degrau", () => {
    const proibidos = tokensCom(fonte, "rounded-").filter((t) =>
      ["rounded-xl", "rounded-2xl", "rounded-3xl", "rounded-lg", "rounded-md"].includes(t.split("[")[0]),
    );
    expect(proibidos).toEqual([]);
  });

  it("sem sombra pesada nem gradiente", () => {
    for (const s of ["shadow-md", "shadow-lg", "shadow-xl", "shadow-2xl", "bg-gradient", "linearGradient", "boxShadow"]) {
      expect(fonte.includes(s), s).toBe(false);
    }
  });

  it("tint de estado só em Badge: nenhum fundo/borda de estado em classe solta", () => {
    for (const sem of ["success", "warning", "destructive", "error", "info"]) {
      expect(fonte.includes(`bg-${sem}`), `bg-${sem}`).toBe(false);
      expect(fonte.includes(`border-${sem}`), `border-${sem}`).toBe(false);
    }
  });

  it("sem verde/amarelo no texto e sem título verde", () => {
    expect(fonte.includes("text-success-text")).toBe(false);
    expect(fonte.includes("text-warning-text")).toBe(false);
    expect(tokensCom(fonte, "text-primary").filter((t) => t === "text-primary")).toEqual([]);
  });

  it("sem opacidade em texto (text-x/70)", () => {
    const comOpacidade = tokensCom(fonte, "text-").filter((t) => t.includes("/") && !t.includes("["));
    expect(comOpacidade).toEqual([]);
  });

  it("vermelho no texto só para negativo, erro ou ação de excluir", () => {
    for (const linha of fonte.split("\n")) {
      if (!linha.includes("text-error-text")) continue;
      const ok =
        linha.includes("< 0") ||
        linha.includes("erro") ||
        linha.includes("Erro") ||
        linha.includes("buttonVariants");
      expect(ok, linha.trim()).toBe(true);
    }
  });
});

describe("Financeiro & DRE", () => {
  const fonte = ler("src/app/(app)/financeiro/page.tsx");

  it("os KPIs usam KpiCard e o valor não é pintado", () => {
    expect(fonte.includes('from "@/components/kpi-card"')).toBe(true);
    expect(fonte.includes("<KpiCard")).toBe(true);
    expect(fonte.includes("<CardStats")).toBe(false);
  });

  it("estoque imobilizado vira card interno neutro com Badge 'não deduzido do lucro'", () => {
    expect(fonte.includes("não deduzido do lucro")).toBe(true);
    const trecho = fonte.split("não deduzido do lucro")[0].split("Capital em estoque").pop() ?? "";
    expect(trecho.includes("<Badge")).toBe(true);
  });

  it("a composição dos custos usa cards internos (bg-card-elevated rounded-interno)", () => {
    expect(fonte.includes("bg-card-elevated")).toBe(true);
    expect(fonte.includes("rounded-interno")).toBe(true);
  });

  it("valores em Geist Mono (font-mono, já tabular) nos cards internos", () => {
    expect(fonte.includes("text-base font-semibold font-mono text-foreground")).toBe(true);
  });
});

describe("gráficos do fluxo de caixa", () => {
  const fonte = ler("src/components/finance-charts.tsx");

  it("usam o poço, os tokens de hachura/trilha e eixo em mono", () => {
    expect(fonte.includes("bg-poco")).toBe(true);
    // Hachura por utilitaria nomeada (`bg-hachura`, em globals.css, lê --hachura-*)
    // e por classes de preenchimento do <pattern> SVG; a trilha vem do token.
    expect(fonte.includes("bg-hachura")).toBe(true);
    expect(fonte.includes("fill-hachura-traco")).toBe(true);
    expect(fonte.includes("--grafico-trilha")).toBe(true);
    expect(fonte.includes("fontFamily")).toBe(true);
  });

  it("sem cor Tailwind/oklch crua e sem azul de info", () => {
    expect(fonte.includes("var(--info)")).toBe(false);
    expect(fonte.includes("var(--error)")).toBe(false);
    expect(fonte.includes("var(--success)")).toBe(false);
  });
});

describe("Minhas Comissões", () => {
  const fonte = ler("src/components/commissions-dashboard-client.tsx");

  it("usa KpiCard e o gráfico não depende de hsl(var(--...)) (os tokens são oklch)", () => {
    expect(fonte.includes("<KpiCard")).toBe(true);
    expect(fonte.includes("hsl(var(")).toBe(false);
  });
});
