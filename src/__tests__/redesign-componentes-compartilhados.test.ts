// Tarefa E1 do redesign Vantage: as ~70 telas herdam o visual novo pelos
// componentes compartilhados. Estes testes fixam a linguagem visual nos
// componentes (e nao pagina a pagina): raios por degrau, ausencia de sombra
// decorativa, segmentado, campos de 44px e o slot `selo` do PageHeader.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

const raiz = join(__dirname, "..", "..");
const ler = (rel: string) => readFileSync(join(raiz, rel), "utf8");

describe("Card", () => {
  const card = ler("src/components/ui/card.tsx");
  const cardVariants = card.split("const cardVariants")[1].split("export interface CardProps")[0];

  it("usa rounded-painel e borda decorativa do painel", () => {
    expect(cardVariants.includes("rounded-painel")).toBe(true);
    expect(cardVariants.includes("border-painel-borda")).toBe(true);
    expect(cardVariants.includes("rounded-2xl")).toBe(false);
  });

  it("nao tem sombra nas variantes (sem shadow-)", () => {
    expect(cardVariants.includes("shadow-")).toBe(false);
  });

  it("variante elevated e o card interno: bg-card-elevated rounded-interno", () => {
    const elevated = cardVariants.split("elevated:")[1].split("\n")[0];
    expect(elevated.includes("bg-card-elevated")).toBe(true);
    expect(elevated.includes("rounded-interno")).toBe(true);
  });

  it("CardTitle nao usa cor de marca", () => {
    const titulo = card.split("const CardTitle")[1].split("CardTitle.displayName")[0];
    expect(titulo.includes("text-primary")).toBe(false);
    expect(titulo.includes("text-marca")).toBe(false);
  });
});

describe("Button", () => {
  const botao = ler("src/components/ui/button-variants.ts");

  it("usa rounded-controle e foco em anel verde", () => {
    expect(botao.includes("rounded-controle")).toBe(true);
    expect(botao.includes("focus-visible:ring-ring")).toBe(true);
  });

  it("primario usa o hover opaco da marca e outline usa o controle", () => {
    expect(botao.includes("hover:bg-primary-hover")).toBe(true);
    expect(botao.includes("bg-controle")).toBe(true);
  });

  it("tamanhos default/lg/icon tem 44px; sm e iconSm ganham area de toque de 44px", () => {
    expect(botao.includes("h-11 px-4 py-2")).toBe(true);
    expect(botao.includes('icon: "h-11 w-11"')).toBe(true);
    // sm/iconSm mantem a densidade visual, mas a area clicavel chega a 44px
    expect(botao.includes("after:absolute")).toBe(true);
    expect(botao.includes("after:min-h-11")).toBe(true);
  });
});

describe("Badge", () => {
  const badge = ler("src/components/ui/badge.tsx");

  it("e uma pilula (rounded-full)", () => {
    expect(badge.includes("rounded-full")).toBe(true);
    expect(badge.includes("rounded-md")).toBe(false);
  });

  it("variante de marca usa o tint opaco da marca; infoSolid continua", () => {
    expect(badge.includes("bg-marca-tint")).toBe(true);
    expect(badge.includes("text-marca-tint-texto")).toBe(true);
    expect(badge.includes("infoSolid")).toBe(true);
  });
});

describe("Table", () => {
  const tabela = ler("src/components/ui/table.tsx");

  it("cabecalho sem caixa-alta, em text-muted-foreground font-medium", () => {
    const head = tabela.split("const TableHead = ")[1].split("TableHead.displayName")[0];
    expect(head.includes("uppercase")).toBe(false);
    expect(head.includes("font-medium")).toBe(true);
    expect(head.includes("text-muted-foreground")).toBe(true);
  });

  it("linhas separadas por border-divisoria e hover com token opaco", () => {
    expect(tabela.includes("border-divisoria")).toBe(true);
    const linha = tabela.split("const TableRow")[1].split("TableRow.displayName")[0];
    expect(linha.includes("hover:bg-poco")).toBe(true);
    expect(linha.includes("hover:bg-muted/")).toBe(false);
  });
});

describe("Tabs e ToggleGroup no padrao segmentado", () => {
  const tabs = ler("src/components/ui/tabs.tsx");
  const toggleGroup = ler("src/components/ui/toggle-group.tsx");

  it("trilho bg-controle com border-divisoria; item ativo bg-controle-ativo semibold", () => {
    const lista = tabs.split("const TabsList")[1].split("TabsList.displayName")[0];
    expect(lista.includes("bg-controle")).toBe(true);
    expect(lista.includes("border-divisoria")).toBe(true);
    const gatilho = tabs.split("const TabsTrigger")[1].split("TabsTrigger.displayName")[0];
    expect(gatilho.includes("data-[state=active]:bg-controle-ativo")).toBe(true);
    expect(gatilho.includes("data-[state=active]:font-semibold")).toBe(true);
    expect(gatilho.includes("shadow-")).toBe(false);
    expect(tabs.includes("--mov-segmentado")).toBe(true);
  });

  it("a pista de rolagem das abas acompanha o trilho (from-controle)", () => {
    expect(tabs.includes("from-controle")).toBe(true);
    expect(tabs.includes("from-muted ")).toBe(false);
  });

  it("ToggleGroup tem trilho segmentado e item ativo bg-controle-ativo", () => {
    expect(toggleGroup.includes("bg-controle")).toBe(true);
    expect(toggleGroup.includes("border-divisoria")).toBe(true);
    expect(toggleGroup.includes("data-[state=on]:bg-controle-ativo")).toBe(true);
    expect(toggleGroup.includes("--mov-segmentado")).toBe(true);
  });
});

describe("Superficies flutuantes", () => {
  for (const arquivo of ["dialog", "popover", "sheet", "dropdown-menu", "select"]) {
    it(`${arquivo}: border-painel-borda, raio de degrau e sombra por token`, () => {
      const fonte = ler(`src/components/ui/${arquivo}.tsx`);
      expect(fonte.includes("border-painel-borda"), "border-painel-borda").toBe(true);
      expect(
        /rounded-(painel|interno|[a-z]-painel)/.test(fonte),
        "raio",
      ).toBe(true);
      // sombra so via token (--shadow-*), nunca a utilitaria crua sozinha
      expect(fonte.includes("shadow-[var(--shadow-"), "sombra por token").toBe(true);
    });
  }

  it("dialog e sheet usam bg-popover (nao bg-background)", () => {
    expect(ler("src/components/ui/dialog.tsx").includes("bg-popover")).toBe(true);
    expect(ler("src/components/ui/sheet.tsx").includes("bg-popover")).toBe(true);
  });

  it("dialog tem rounded-painel", () => {
    expect(ler("src/components/ui/dialog.tsx").includes("rounded-painel")).toBe(true);
  });
});

describe("Campos", () => {
  for (const arquivo of ["input", "select", "textarea"]) {
    it(`${arquivo}: rounded-controle bg-controle border-input`, () => {
      const fonte = ler(`src/components/ui/${arquivo}.tsx`);
      expect(fonte.includes("rounded-controle")).toBe(true);
      expect(fonte.includes("bg-controle")).toBe(true);
      expect(fonte.includes("border-input")).toBe(true);
      expect(fonte.includes("bg-background/70")).toBe(false);
    });
  }

  it("Input e Select (trigger) tem 44px no tamanho padrao", () => {
    expect(ler("src/components/ui/input.tsx").includes('default: "h-11 px-3 text-sm"')).toBe(true);
    expect(ler("src/components/ui/select.tsx").includes("h-11 w-full")).toBe(true);
  });

  it("Textarea tem min-h de pelo menos 44px", () => {
    expect(ler("src/components/ui/textarea.tsx").includes("min-h-[80px]")).toBe(true);
  });
});

describe("PageHeader", () => {
  const html = async (props: Record<string, unknown>) => {
    const { PageHeader } = await import("@/components/page-header");
    return renderToStaticMarkup(createElement(PageHeader, { title: "Financeiro", ...props }));
  };

  it("renderiza o slot selo ao lado do titulo", async () => {
    const saida = await html({ selo: createElement("span", null, "Mes em andamento") });
    expect(saida.includes("Mes em andamento")).toBe(true);
  });

  it("nao renderiza selo quando ausente", async () => {
    const saida = await html({});
    expect(saida.includes("Mes em andamento")).toBe(false);
  });

  it("a trilha separa os niveis com '/'", async () => {
    const saida = await html({
      breadcrumbs: [{ label: "Cadastros", href: "/cadastros" }, { label: "Clientes" }],
    });
    expect(saida.includes(">/<")).toBe(true);
    expect(saida.includes("lucide-chevron-right")).toBe(false);
  });

  it("h1 em text-titulo font-display text-foreground e mantem o flex-wrap", async () => {
    const saida = await html({ actions: createElement("button", null, "Novo") });
    expect(saida.includes("text-titulo")).toBe(true);
    expect(saida.includes("font-display")).toBe(true);
    expect(saida.includes("text-foreground")).toBe(true);
    expect(saida.includes("flex flex-wrap items-center justify-between gap-4")).toBe(true);
    expect(saida.includes("Novo")).toBe(true);
  });
});
