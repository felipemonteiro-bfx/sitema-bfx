import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Fase 16 — correcoes das telas financeiras.
 *
 * Achados 1, 2 e 4: `--success`, `--warning` e `--info` foram calibrados como
 * cor de PREENCHIMENTO e estavam sendo usados como cor de TEXTO sobre card
 * branco (2.97:1, 2.06:1 e 2.91:1 medidos; minimo 4.5:1). A correcao separa os
 * papeis criando `--success-text`, `--warning-text` e `--info-text`, sem mexer
 * no L dos tokens de preenchimento (`bg-success` e afins continuam com o
 * `--*-foreground` escuro por cima).
 *
 * Um token novo precisa existir em QUATRO pontos que tem de concordar:
 * `:root`, `.dark`, `@theme inline` e `tailwind.config.ts`. Faltando um, a
 * classe nao existe e falha em silencio — por isso os quatro sao verificados
 * aqui, um a um.
 *
 * O contraste em si e medido por `scripts/design-tokens/token-contrast.mjs`
 * (`npm run contraste:check`, roda no CI). Este arquivo cobre o que aquele
 * script nao ve: se as telas realmente passaram a usar o token novo, e os
 * demais achados de layout/tipografia da fase.
 *
 * Nota de seguranca (CLAUDE.md): nenhuma execucao de regex com estado aqui —
 * so `.split()`, `.startsWith()` e `.includes()`.
 */

const raiz = process.cwd();
const ler = (rel: string) => readFileSync(join(raiz, rel), "utf8");

const css = ler("src/app/globals.css");
const tailwindConfig = ler("tailwind.config.ts");

const TOKENS_TEXTO = ["success", "warning", "info"] as const;

/** Corpo do primeiro bloco top-level cujo seletor termina em `seletor`. */
function corpoDoBloco(fonte: string, seletor: string): string {
  const blocos: string[] = [];
  for (const bloco of fonte.split("}")) {
    const partes = bloco.split("{");
    if (partes.length < 2) continue;
    const nome =
      partes[0]
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .pop() || "";
    if (nome === seletor) blocos.push(partes.slice(1).join("{"));
  }
  return blocos.join("\n");
}

/**
 * `true` quando a fonte usa `text-<token>` como cor de texto — ou seja, a
 * ocorrencia NAO e continuada por `-` (o que a tornaria `text-success-text` ou
 * `text-success-foreground`, ambos legitimos).
 */
function usaTokenDePreenchimentoComoTexto(fonte: string, token: string): boolean {
  const partes = fonte.split(`text-${token}`);
  return partes.slice(1).some((resto) => !resto.startsWith("-"));
}

const TELAS_FINANCEIRAS = [
  "src/app/(app)/financeiro/page.tsx",
  "src/app/(app)/boletos/page.tsx",
  "src/app/(app)/prudent/page.tsx",
  "src/app/(app)/relatorios/page.tsx",
  "src/app/(app)/relatorios/mensais/page.tsx",
  "src/components/antecipacao-client.tsx",
  "src/components/historico-antecipacoes.tsx",
  "src/components/antecipacao-compradores.tsx",
  "src/components/commissions-dashboard-client.tsx",
  // Componentes compartilhados que renderizam os valores dessas telas:
  // CardStats desenha os KPIs de /boletos, Badge os status de /relatorios/mensais.
  "src/components/ui/card.tsx",
  "src/components/ui/badge.tsx",
];

describe("tokens de texto dedicados (achados 1, 2, 4)", () => {
  const raizCss = corpoDoBloco(css, ":root");
  const darkCss = corpoDoBloco(css, ".dark");
  const themeInline = corpoDoBloco(css, "@theme inline");

  for (const token of TOKENS_TEXTO) {
    it(`--${token}-text existe nos quatro pontos que precisam concordar`, () => {
      expect(raizCss.includes(`--${token}-text:`), ":root").toBe(true);
      expect(darkCss.includes(`--${token}-text:`), ".dark").toBe(true);
      expect(
        themeInline.includes(`--color-${token}-text: var(--${token}-text)`),
        "@theme inline",
      ).toBe(true);
      expect(tailwindConfig.includes(`"var(--${token}-text)"`), "tailwind.config.ts").toBe(true);
    });
  }

  it("os tokens de preenchimento nao foram escurecidos (bg-* continua legivel com --*-foreground)", () => {
    expect(css.includes("--success: oklch(0.65 0.18 145)")).toBe(true);
    expect(css.includes("--warning: oklch(0.77 0.15 85)")).toBe(true);
    expect(css.includes("--info: oklch(0.57 0.18 240)")).toBe(true);
  });

  for (const arquivo of TELAS_FINANCEIRAS) {
    it(`${arquivo} nao usa token de preenchimento como cor de texto`, () => {
      const fonte = ler(arquivo);
      for (const token of TOKENS_TEXTO) {
        expect(
          usaTokenDePreenchimentoComoTexto(fonte, token),
          `text-${token} deveria ser text-${token}-text`,
        ).toBe(false);
      }
    });
  }

  it("a pilula de parcela do /prudent usa o tint opaco, nao o composto bg-info/20 (achado 4)", () => {
    const fonte = ler("src/components/antecipacao-client.tsx");
    expect(fonte.includes("bg-info/20")).toBe(false);
  });

  /**
   * O modificador de opacidade anula o token: `text-info-text/80` vira
   * `color-mix(... 80%, transparent)` e composita contra o fundo. Medido sobre
   * o tint opaco: 4.59 -> 3.30 (info), 4.69 -> 3.27 (warning), 4.75 -> 3.40
   * (success). `TOKEN_PAIRS` compara token com token e nao enxerga isso, entao
   * o gate tem de ser aqui.
   */
  for (const arquivo of TELAS_FINANCEIRAS) {
    it(`${arquivo} nao enfraquece o token de texto com modificador de opacidade`, () => {
      const fonte = ler(arquivo);
      for (const token of TOKENS_TEXTO) {
        expect(
          fonte.includes(`text-${token}-text/`),
          `text-${token}-text/NN derruba o contraste abaixo de 4.5`,
        ).toBe(false);
      }
    });
  }
});

describe("achado 12 — abas inativas, e os rotulos sobre card elevado", () => {
  // 0.545 resolvia as abas (4.47 -> 4.62), mas o gate de runtime achou 22
  // rotulos de /venda-rapida ainda a 4.40: eles ficam sobre --card-elevated,
  // mais escuro que --card. 0.535 fecha os dois (4.60 sobre o elevado).
  it("--muted-foreground claro esta em 0.535", () => {
    expect(corpoDoBloco(css, ":root").includes("--muted-foreground: oklch(0.535 0 0)")).toBe(true);
  });
});

describe("achado 3 — rolagem horizontal em 390px", () => {
  // A contencao nasceu inline no query-tabs e depois foi extraida para o
  // ScrollableTabsList (que acrescentou fade e chevron). Verificar so o arquivo
  // que por acaso continha as classes quebra a cada refatoracao sem que nada
  // tenha regredido — foi o que aconteceu. O teste agora afirma a CADEIA: quem
  // contem de fato, e que o consumidor usa esse componente.
  it("o ScrollableTabsList contem a rolagem em si mesmo", () => {
    const fonte = ler("src/components/ui/tabs.tsx");
    expect(fonte.includes("overflow-x-auto")).toBe(true);
    expect(fonte.includes("max-w-full")).toBe(true);
  });

  it("o query-tabs usa o ScrollableTabsList, nao o TabsList cru", () => {
    const fonte = ler("src/components/query-tabs.tsx");
    expect(fonte.includes("<ScrollableTabsList>")).toBe(true);
  });
});

describe("achado 5 — botao Buscar da /boletos alinhado ao Input", () => {
  it("nao usa size sm na barra de busca", () => {
    const fonte = ler("src/app/(app)/boletos/page.tsx");
    const barra = fonte.split('<form method="GET"')[1].split("</form>")[0];
    expect(barra.includes('size: "sm"')).toBe(false);
  });
});

describe("achados 6, 7 e 11 — tabular-nums", () => {
  it("os KPIs de dinheiro da /financeiro usam tabular-nums", () => {
    const fonte = ler("src/app/(app)/financeiro/page.tsx");
    expect(fonte.includes('"text-2xl font-bold tabular-nums"')).toBe(true);
    expect(fonte.split("text-2xl font-semibold tabular-nums").length - 1).toBeGreaterThanOrEqual(4);
    expect(fonte.split("text-base font-semibold tabular-nums").length - 1).toBeGreaterThanOrEqual(3);
  });

  it("as colunas numericas de /relatorios/mensais usam tabular-nums", () => {
    const fonte = ler("src/app/(app)/relatorios/mensais/page.tsx");
    expect(fonte.includes('className="text-right tabular-nums"')).toBe(true);
    expect(fonte.split('className="text-right tabular-nums"').length - 1).toBeGreaterThanOrEqual(2);
  });

  it("a coluna Comissao (%) usa tabular-nums", () => {
    const fonte = ler("src/components/commissions-dashboard-client.tsx");
    expect(fonte.includes("{d.percentualComissao}%")).toBe(true);
    const celula = fonte.split("{d.percentualComissao}%")[0].split("<TableCell").pop() || "";
    expect(celula.includes("tabular-nums")).toBe(true);
  });
});

describe("achado 8 — cards irmaos do topo do /prudent", () => {
  it("o card de antecipacao usa a mesma variante do card de historico", () => {
    expect(ler("src/app/(app)/prudent/page.tsx").includes('variant="elevated"')).toBe(false);
  });
});

describe("achado 9 — breadcrumbs", () => {
  it("/boletos tem breadcrumbs", () => {
    expect(ler("src/app/(app)/boletos/page.tsx").includes("breadcrumbs={[")).toBe(true);
  });
  it("/prudent tem breadcrumbs", () => {
    expect(ler("src/app/(app)/prudent/page.tsx").includes("breadcrumbs={[")).toBe(true);
  });
});

describe("achado 10 — acentos em /relatorios", () => {
  it("titulo, descricao e breadcrumb acentuados", () => {
    const fonte = ler("src/app/(app)/relatorios/page.tsx");
    expect(fonte.includes("Relatorios")).toBe(false);
    expect(fonte.includes("relatorios de vendas")).toBe(false);
    expect(fonte.includes("Inadimplencia")).toBe(false);
  });
});

describe("achado 13 — estados vazios da /financeiro", () => {
  it("as tres celulas colSpan tem respiro vertical", () => {
    const fonte = ler("src/app/(app)/financeiro/page.tsx");
    const celulas = fonte.split("<TableCell colSpan=").slice(1);
    expect(celulas).toHaveLength(3);
    for (const celula of celulas) {
      expect(celula.split(">")[0].includes("py-8")).toBe(true);
    }
  });

  it("o texto segue a convencao 'Nenhum...' das outras rotas", () => {
    const fonte = ler("src/app/(app)/financeiro/page.tsx");
    expect(fonte.includes("Sem dados.")).toBe(false);
    expect(fonte.includes("Sem produtos cadastrados.")).toBe(false);
  });
});
