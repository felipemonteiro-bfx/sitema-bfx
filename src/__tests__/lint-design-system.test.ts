// Politica do design system (@shadcn/lint): o que o chamador pode passar por className e o que
// entra por prop/variante. Fixa duas coisas:
//  1. a configuracao: as seis regras em "error" e o unico bloco "warn" e o do escopo de outras
//     tarefas (marcado "temporario"), para a severidade nao voltar a "warn" sem ninguem ver;
//  2. as variantes dos componentes de src/components/ui que substituem as classes repetidas.
// Nenhuma execucao de regex com estado (CLAUDE.md): so includes/split.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { labelVariants } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button-variants";
import { cardTitleVariants } from "@/components/ui/card";
import { tableCellVariants, tableHeadVariants, tableVariants } from "@/components/ui/table";
import { inputVariants } from "@/components/ui/input";
import { badgeVariants } from "@/components/ui/badge";

const raiz = join(__dirname, "..", "..");
const ler = (rel: string) => readFileSync(join(raiz, rel), "utf8");

describe("configuracao do @shadcn/lint", () => {
  const config = ler("eslint.config.mjs");

  it("as seis regras valem como error por padrao", () => {
    for (const regra of ["unknown", "raw", "arbitrary", "inline", "static", "restyle"]) {
      expect(config.includes(`severidade.${regra} ?? "error"`), regra).toBe(true);
    }
  });

  it("o unico rebaixamento para warn e o bloco temporario do escopo de outras tarefas", () => {
    expect(config.includes("temporario: tarefas N/L em andamento")).toBe(true);
    const bloco = config.split("temporario: tarefas N/L em andamento")[1]?.split("globalIgnores")[0] ?? "";
    expect(bloco.includes("crm/atendimento")).toBe(true);
    expect(bloco.includes("(janela)")).toBe(true);
    expect(bloco.includes("loading.tsx")).toBe(true);
    // fora desse bloco ninguem escreve "warn" para uma regra shadcn
    const resto = config.split("temporario: tarefas N/L em andamento")[0];
    expect(resto.includes('?? "warn"')).toBe(false);
  });

  it("src/components/ui fica fora de no-restyle, no-arbitrary-values e require-static-classes", () => {
    const bloco = config.split('files: ["src/components/ui/**/*.{ts,tsx}"]')[1]?.split("}")[0] ?? "";
    expect(bloco.includes('"shadcn/no-restyle": "off"')).toBe(true);
    expect(bloco.includes('"shadcn/no-arbitrary-values": "off"')).toBe(true);
    expect(bloco.includes('"shadcn/require-static-classes": "off"')).toBe(true);
    expect(bloco.includes("no-raw-colors")).toBe(false);
    expect(bloco.includes("no-inline-styles")).toBe(false);
  });
});

describe("politica de design-system/lint-policy.mjs", () => {
  const politica = ler("design-system/lint-policy.mjs");

  it("o padrao e layout; arbitrario so de layout", () => {
    expect(politica.includes('const BASE = ["layout", ...MARCADORES]')).toBe(true);
    expect(politica.includes('allow: ["layout"]')).toBe(true);
  });

  it("Button nao recebe cor, forma nem tamanho do chamador (so layout e gap)", () => {
    const contrato = politica.split('pattern: "^Button$"')[1]?.split("}")[0] ?? "";
    expect(contrato.includes('"gap-*"')).toBe(true);
    for (const proibido of ["spacing", "typography", "color", "shape"]) {
      expect(contrato.includes(proibido), proibido).toBe(false);
    }
  });

  it("CardTitle aceita tipografia mas nao familia/peso (font-*)", () => {
    const contrato = politica.split("Card(Title|Description)")[1]?.split("}")[0] ?? "";
    expect(contrato.includes('"typography"')).toBe(true);
    expect(contrato.includes('deny: ["font-*"]')).toBe(true);
  });
});

describe("variantes que substituem classes repetidas no className", () => {
  it("Label: tom, tamanho e linhas de opcao", () => {
    expect(labelVariants()).toContain("text-muted-foreground");
    expect(labelVariants()).not.toContain("uppercase");
    expect(labelVariants({ variant: "erro" })).toContain("text-error-text");
    expect(labelVariants({ variant: "foreground" })).toContain("text-foreground");
    expect(labelVariants({ size: "sm" })).toContain("text-xs");
    expect(labelVariants({ variant: "opcao" })).toContain("font-normal");
    expect(labelVariants({ variant: "parcela" })).toContain("data-[marcada=true]:border-primary");
  });

  it("Button: variantes discretas, de erro e de controle; tamanhos compactos; forma pill", () => {
    expect(buttonVariants({ variant: "discreto" })).toContain("text-muted-foreground");
    expect(buttonVariants({ variant: "discretoPlano" })).toContain("hover:bg-transparent");
    expect(buttonVariants({ variant: "sutilErro" })).toContain("text-error-text");
    expect(buttonVariants({ variant: "outlineErro" })).toContain("hover:bg-error-bg");
    expect(buttonVariants({ variant: "controle" })).toContain("bg-controle");
    expect(buttonVariants({ variant: "controleAtivo" })).toContain("bg-success-bg");
    expect(buttonVariants({ variant: "seletor" })).toContain("data-[erro=true]:border-error");
    expect(buttonVariants({ size: "xs" })).toContain("h-7");
    expect(buttonVariants({ size: "iconXs" })).toContain("w-7");
    expect(buttonVariants({ size: "inlineXs" })).toContain("p-0");
    expect(buttonVariants({ size: "cta" })).toContain("px-12");
    expect(buttonVariants({ forma: "pill" })).toContain("rounded-full");
    expect(buttonVariants()).not.toContain("rounded-full");
  });

  it("CardTitle: display (padrao) e secao", () => {
    expect(cardTitleVariants()).toContain("font-display");
    const secao = cardTitleVariants({ variant: "secao" });
    expect(secao).toContain("font-sans");
    expect(secao).toContain("tracking-normal");
  });

  it("Table: celula por tom/peso/tamanho/mono e cabecalho por tamanho/tom", () => {
    expect(tableCellVariants({ tom: "erro" })).toContain("text-error-text");
    expect(tableCellVariants({ peso: "forte" })).toContain("font-semibold");
    expect(tableCellVariants({ tamanho: "xs" })).toContain("text-xs");
    expect(tableCellVariants({ mono: true })).toContain("font-mono");
    expect(tableCellVariants({ truncar: true })).toContain("truncate");
    expect(tableCellVariants({ destaque: "base" })).toContain("rounded-b-interno");
    expect(tableHeadVariants({ tamanho: "sm" })).toContain("text-sm");
    expect(tableHeadVariants({ destaque: "topo" })).toContain("rounded-t-interno");
    expect(tableVariants({ separado: true })).toContain("border-separate");
    expect(tableVariants({ mono: true })).toContain("tabular-nums");
  });

  it("Input e Badge: estado, caixa-alta, mono e numerico por prop", () => {
    expect(inputVariants({ caixaAlta: true })).toContain("uppercase");
    expect(inputVariants({ mono: true })).toContain("font-mono");
    expect(inputVariants({ state: "leitura" })).toContain("bg-muted");
    expect(inputVariants({ state: "nu" })).toContain("border-0");
    expect(inputVariants({ inputSize: "lg" })).toContain("h-12");
    expect(badgeVariants({ numerico: true })).toContain("tabular-nums");
    expect(badgeVariants({ variant: "discreto" })).toContain("text-muted-foreground");
  });
});

describe("nenhuma tela volta a repetir o que virou variante", () => {
  const CHAMADORES = [
    "src/components/historico-vendas-cards.tsx",
    "src/app/(app)/venda-rapida/page.tsx",
    "src/components/edit-venda-form-client.tsx",
    "src/components/edit-venda-historico-form.tsx",
  ];

  it("ReciboDownloadLink nao recebe buttonVariants() montado em className", () => {
    for (const arquivo of CHAMADORES) {
      const usos = ler(arquivo).split("<ReciboDownloadLink").slice(1);
      expect(usos.length, arquivo).toBeGreaterThan(0);
      for (const uso of usos) {
        expect(uso.split("/>")[0].includes("buttonVariants"), arquivo).toBe(false);
      }
    }
  });

  it("os gatilhos de FormSelect e do olho nao montam a pele por className", () => {
    expect(ler("src/components/form-select.tsx").includes('variant="seletor"')).toBe(true);
    expect(ler("src/components/valores-toggle.tsx").includes('"controleAtivo"')).toBe(true);
  });

  it("ReciboDownloadLink recebe variant/size, nao className de aparencia", () => {
    const fonte = ler("src/components/recibo-download-link.tsx");
    expect(fonte.includes('variant = "discretoPlano"')).toBe(true);
    expect(fonte.includes("hover:bg-transparent")).toBe(false);
  });
});
