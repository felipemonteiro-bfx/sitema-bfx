import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Fase 17 — correcoes das telas de CRM e IA (`17-ACHADOS.md` / `17-SPEC-CORRECOES.md`).
 *
 * A fase 16 criou `--success-text`, `--warning-text` e `--info-text` e migrou as
 * telas financeiras. Este arquivo cobre o que ficou de fora: `--error-text`, os
 * 6 call sites crus de `/crm`, o rotulo de provedor da `/inteligencia` (dado
 * errado, nao estetica) e os achados de layout/contraste da tela de chat.
 *
 * O contraste numerico dos tokens e medido por
 * `scripts/design-tokens/token-contrast.mjs` (`npm run contraste:check`, roda no
 * CI). Aqui verifica-se o que aquele script nao ve: se o token existe nos quatro
 * pontos que precisam concordar, se o par foi registrado em `TOKEN_PAIRS` (token
 * sem par nao e policiado) e se as telas realmente passaram a usar o token.
 *
 * Nota de seguranca (CLAUDE.md): nenhuma execucao de regex com estado aqui — so
 * `.split()`, `.startsWith()` e `.includes()`.
 */

const raiz = process.cwd();
const ler = (rel: string) => readFileSync(join(raiz, rel), "utf8");

const css = ler("src/app/globals.css");
const tailwindConfig = ler("tailwind.config.ts");

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
 * `true` quando a fonte usa `text-<token>` / `bg-<token>` como cor chapada — a
 * ocorrencia NAO e continuada por `-` (o que a tornaria `-text`, `-bg` ou
 * `-foreground`, todos legitimos).
 */
function usaTokenCru(fonte: string, prefixo: string, token: string): boolean {
  const partes = fonte.split(`${prefixo}-${token}`);
  return partes.slice(1).some((resto) => !resto.startsWith("-"));
}

const TELAS_CRM = [
  "src/app/(app)/crm/page.tsx",
  "src/app/(app)/crm/campanhas/page.tsx",
  "src/app/(app)/crm/fidelidade/page.tsx",
  "src/app/(app)/crm/importar-leads/page.tsx",
  "src/components/ui/badge.tsx",
];

const TOKENS_SEMANTICOS = ["success", "warning", "info", "error"] as const;

// ---------------------------------------------------------------------------
// Achado 3 — `--error-text` nao existe
// ---------------------------------------------------------------------------

describe("achado 3 — variante de texto do vermelho", () => {
  const raizCss = corpoDoBloco(css, ":root");
  const darkCss = corpoDoBloco(css, ".dark");
  const themeInline = corpoDoBloco(css, "@theme inline");

  it("--error-text existe nos quatro pontos que precisam concordar", () => {
    expect(raizCss.includes("--error-text:"), ":root").toBe(true);
    expect(darkCss.includes("--error-text:"), ".dark").toBe(true);
    expect(
      themeInline.includes("--color-error-text: var(--error-text)"),
      "@theme inline",
    ).toBe(true);
    expect(tailwindConfig.includes('"var(--error-text)"'), "tailwind.config.ts").toBe(true);
  });

  it("o token de preenchimento --error nao foi escurecido", () => {
    expect(raizCss.includes("--error: oklch(0.57 0.24 25)")).toBe(true);
    expect(darkCss.includes("--error: oklch(0.70 0.24 25)")).toBe(true);
  });

  it("os pares de --error-text foram registrados em TOKEN_PAIRS", () => {
    const script = ler("scripts/design-tokens/token-contrast.mjs");
    expect(
      script.includes('foreground: "error-text", background: "card"'),
      "error-text/card",
    ).toBe(true);
    expect(
      script.includes('foreground: "error-text", background: "error-bg"'),
      "error-text/error-bg",
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Achado 2 — 6 call sites crus nas telas de CRM
// ---------------------------------------------------------------------------

describe("achado 2 — telas de CRM usam a variante de texto", () => {
  for (const arquivo of TELAS_CRM) {
    it(`${arquivo} nao usa token de preenchimento como cor de texto`, () => {
      const fonte = ler(arquivo);
      for (const token of TOKENS_SEMANTICOS) {
        expect(
          usaTokenCru(fonte, "text", token),
          `text-${token} deveria ser text-${token}-text`,
        ).toBe(false);
      }
    });

    it(`${arquivo} nao enfraquece o token de texto com modificador de opacidade`, () => {
      const fonte = ler(arquivo);
      for (const token of TOKENS_SEMANTICOS) {
        expect(
          fonte.includes(`text-${token}-text/`),
          `text-${token}-text/NN derruba o contraste abaixo de 4.5`,
        ).toBe(false);
      }
    });
  }

  it("os callouts usam o tint opaco bg-*-bg, nao o composto bg-*/10", () => {
    for (const arquivo of [
      "src/app/(app)/crm/campanhas/page.tsx",
      "src/app/(app)/crm/importar-leads/page.tsx",
    ]) {
      const fonte = ler(arquivo);
      for (const token of TOKENS_SEMANTICOS) {
        expect(fonte.includes(`bg-${token}/`), `${arquivo}: bg-${token}/NN`).toBe(false);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Dado errado — provedor da /inteligencia
// ---------------------------------------------------------------------------

describe("dado errado — o provedor da resposta e persistido, nao chutado", () => {
  const pagina = ler("src/app/(app)/inteligencia/page.tsx");
  const cliente = ler("src/components/intelligence-chat-client.tsx");
  const schema = ler("prisma/schema.prisma");

  it("AiMensagem tem coluna provider", () => {
    const modelo = schema.split("model AiMensagem {")[1].split("}")[0];
    expect(modelo.includes("provider")).toBe(true);
  });

  it("existe migracao SQL escrita a mao para a coluna", () => {
    const dirs = readdirSync(join(raiz, "prisma/migrations"));
    const alvo = dirs.filter((d) => d.includes("ai_mensagem_provider"));
    expect(alvo.length, "pasta de migracao ai_mensagem_provider").toBe(1);
    const sql = ler(`prisma/migrations/${alvo[0]}/migration.sql`);
    expect(sql.includes("ai_mensagens")).toBe(true);
    expect(sql.includes("provider")).toBe(true);
    // Idempotente: o container aplica no deploy e pode reaplicar.
    expect(sql.includes("IF NOT EXISTS")).toBe(true);
  });

  it("a pagina nao rotula mais toda resposta como gemini", () => {
    expect(pagina.includes('provider: "gemini"')).toBe(false);
    expect(cliente.includes('const provider = "gemini"')).toBe(false);
  });

  it("a escrita da mensagem grava o provedor usado", () => {
    const escrita = pagina.split("prisma.aiMensagem.create(")[1] ?? "";
    expect(escrita.split("})")[0].includes("provider")).toBe(true);
  });

  it("linha antiga sem provedor nao vira 'gemini' — a pilula some", () => {
    // O fallback aceito e null/undefined, nunca um nome de provedor inventado.
    expect(pagina.includes('provider ?? "gemini"')).toBe(false);
    expect(cliente.includes("m.provider &&")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Achados 1, 4, 5, 6, 7, 8, 9, 10
// ---------------------------------------------------------------------------

describe("achado 1 — rolagem horizontal do /crm/fidelidade em 390px", () => {
  it("o card da tabela e min-w-0 dentro do grid", () => {
    const fonte = ler("src/app/(app)/crm/fidelidade/page.tsx");
    const grid = fonte.split('<div className="grid gap-6 lg:grid-cols-2">')[1] ?? "";
    expect(grid.split("<CardHeader")[0].includes("min-w-0")).toBe(true);
  });
});

describe("achado 4 — /inteligencia sem heading", () => {
  const fonte = ler("src/app/(app)/inteligencia/page.tsx");

  it("usa PageHeader como as outras 20 rotas", () => {
    expect(fonte.includes('from "@/components/page-header"')).toBe(true);
    expect(fonte.includes("<PageHeader")).toBe(true);
  });

  it("tem breadcrumb", () => {
    expect(fonte.includes("breadcrumbs={[")).toBe(true);
  });

  it("o titulo deixou de ser um CardTitle de 30px", () => {
    expect(fonte.includes('CardTitle className="text-2xl font-semibold sm:text-3xl"')).toBe(false);
  });
});

describe("achado 5 — FormSelect e botao desalinhados no /crm", () => {
  it("o wrapper do FormSelect nao impoe altura fixa maior que o gatilho", () => {
    const fonte = ler("src/components/form-select.tsx");
    expect(fonte.includes("min-h-10")).toBe(false);
  });

  it("os selects da tabela do /crm tem a altura e o raio de size=sm", () => {
    const fonte = ler("src/app/(app)/crm/page.tsx");
    const tabela = fonte.split("<TableBody>").pop() ?? "";
    const classes = tabela
      .split("className=\"h-")
      .slice(1)
      .map((s) => s.split('"')[0]);
    expect(classes.length, "selects na tabela").toBeGreaterThanOrEqual(2);
    for (const c of classes) {
      expect(c.startsWith("9 "), `altura h-${c}`).toBe(true);
      expect(c.includes("rounded-md"), `raio em h-${c}`).toBe(true);
    }
  });
});

describe("achado 6 — /inteligencia em 390px", () => {
  it("o card reduz o padding lateral em telas estreitas", () => {
    const fonte = ler("src/app/(app)/inteligencia/page.tsx");
    expect(fonte.includes("p-4 sm:p-6")).toBe(true);
  });

  it("a bolha ocupa a largura toda no mobile", () => {
    const fonte = ler("src/components/intelligence-chat-client.tsx");
    expect(fonte.includes("max-w-[92%]")).toBe(false);
    expect(fonte.includes("max-w-full")).toBe(true);
  });
});

describe("achado 7 — corpo da tabela markdown no tema claro", () => {
  it("a celula de dado usa text-foreground, nao muted-foreground", () => {
    const fonte = ler("src/components/intelligence-chat-client.tsx");
    const celula = fonte.split("<td")[1]?.split(">")[0] ?? "";
    expect(celula.includes("text-muted-foreground")).toBe(false);
    expect(celula.includes("text-foreground")).toBe(true);
  });
});

describe("achado 8 — markup interno vazando na tela", () => {
  it("a renderizacao filtra <tool_call> e <function=...>", () => {
    const fonte = ler("src/components/intelligence-chat-client.tsx");
    expect(fonte.includes("stripToolMarkup")).toBe(true);
    expect(fonte.includes("<tool_call>")).toBe(true);
  });
});

describe("achado 9 — rotulos do chat no tema claro", () => {
  const fonte = ler("src/components/intelligence-chat-client.tsx");

  it("Voce e Assistente usam text-foreground", () => {
    for (const rotulo of ["Você", "Assistente"]) {
      const antes = fonte.split(`>${rotulo}<`)[0].split("<div className=").pop() ?? "";
      expect(antes.includes("text-muted-foreground"), rotulo).toBe(false);
    }
  });

  it("a pilula do provedor sai do bg-muted", () => {
    expect(fonte.includes("rounded-full bg-muted px-2")).toBe(false);
  });
});

describe("achado 10 — acento no breadcrumb raiz", () => {
  it("PageHeader diz Início, igual a sidebar", () => {
    const fonte = ler("src/components/page-header.tsx");
    expect(fonte.includes(">Inicio<")).toBe(false);
    expect(fonte.includes(">Início<")).toBe(true);
  });
});
