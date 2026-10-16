// Tarefa H5 do redesign Vantage: Importação (todas as abas), BFX Intelligence e as telas
// do CRM fora do atendimento. Fixa, lendo o fonte, o que o design-system/VANTAGE-PADROES.md
// exige: sem caixa-alta, tint de estado só em Badge/Alert, raios por token, sem sombra
// pesada nem gradiente. Só visual: nenhuma regra de importação, campanha ou IA é testada aqui.
// Nenhuma execução de regex com estado (CLAUDE.md): só includes/split.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = join(__dirname, "..", "..");
const ler = (rel: string) => readFileSync(join(raiz, rel), "utf8");

const ARQUIVOS = [
  "src/app/(app)/crm/page.tsx",
  "src/app/(app)/crm/campanhas/page.tsx",
  "src/app/(app)/crm/fidelidade/page.tsx",
  "src/app/(app)/crm/relacionamento/page.tsx",
  "src/app/(app)/crm/importar-leads/page.tsx",
  "src/app/(app)/crm/atendimento/ficha/page.tsx",
  "src/app/(app)/crm/nav-areas-crm.tsx",
  "src/app/(app)/importacao/nav-importacao.tsx",
  "src/components/nav-segmentada.tsx",
  "src/app/(app)/importacao/page.tsx",
  "src/app/(app)/importacao/clientes/page.tsx",
  "src/app/(app)/importacao/fornecedores/page.tsx",
  "src/app/(app)/importacao/consignado/page.tsx",
  "src/app/(app)/inteligencia/page.tsx",
  "src/components/campanha-template-picker.tsx",
  "src/components/delete-campanha-button.tsx",
  "src/components/importacao-client.tsx",
  "src/components/importacao-clientes-client.tsx",
  "src/components/importacao-consignado-client.tsx",
  "src/components/importacao-ui.tsx",
  "src/components/importacao-fornecedores-client.tsx",
  "src/components/intelligence-chat-client.tsx",
  "src/components/intelligence-chat-composer.tsx",
  "src/components/chat-prompt-input.tsx",
  "src/components/rotulo-campo.tsx",
];

describe("H5 — padrões do Vantage nas telas de Importação, Intelligence e CRM", () => {
  for (const arquivo of ARQUIVOS) {
    describe(arquivo, () => {
      const fonte = ler(arquivo);

      it("sem caixa-alta nem tracking-wide em rótulo, cabeçalho ou KPI", () => {
        expect(fonte.includes("uppercase"), "uppercase").toBe(false);
        expect(fonte.includes("tracking-wide"), "tracking-wide").toBe(false);
      });

      it("sem raio cru rounded-xl/2xl/3xl (usa rounded-painel/interno/controle)", () => {
        for (const raio of ["rounded-xl", "rounded-2xl", "rounded-3xl"]) {
          expect(fonte.includes(raio), raio).toBe(false);
        }
      });

      it("sem sombra pesada nem gradiente", () => {
        for (const s of ["shadow-md", "shadow-lg", "shadow-xl", "shadow-2xl", "gradient"]) {
          expect(fonte.includes(s), s).toBe(false);
        }
      });

      it("tint de estado (info/sucesso/aviso) só via Badge ou Alert, nunca em classe crua", () => {
        for (const estado of ["info", "success", "warning"]) {
          for (const classe of [`bg-${estado}-bg`, `text-${estado}-text`, `border-${estado}`, `bg-${estado}/`]) {
            expect(fonte.includes(classe), classe).toBe(false);
          }
        }
      });

      it("sem opacidade em texto nem cor crua de texto", () => {
        for (const c of ["text-muted-foreground/", "text-foreground/", "text-primary/", "text-white"]) {
          expect(fonte.includes(c), c).toBe(false);
        }
      });
    });
  }
});

describe("H5 — estrutura compartilhada", () => {
  it("o rótulo de campo é frase normal (o Label da ui ja nasce assim)", () => {
    const f = ler("src/components/rotulo-campo.tsx");
    expect(f.includes("<Label")).toBe(true);
    expect(f.includes("uppercase")).toBe(false);
    const base = ler("src/components/ui/label.tsx");
    expect(base.includes("uppercase")).toBe(false);
    expect(base.includes("text-muted-foreground")).toBe(true);
  });

  it("a navegação de áreas do CRM tem as 5 áreas e usa o segmentado com aria-current", () => {
    const f = ler("src/app/(app)/crm/nav-areas-crm.tsx");
    for (const rota of ["/crm/atendimento", '"/crm"', "/crm/relacionamento", "/crm/campanhas", "/crm/fidelidade"]) {
      expect(f.includes(rota), rota).toBe(true);
    }
    expect(f.includes('rotulo="Áreas do CRM"')).toBe(true);
    expect(ler("src/components/nav-segmentada.tsx").includes("aria-current")).toBe(true);
  });

  it("as quatro importações compartilham o segmentado no cabeçalho", () => {
    expect(ler("src/app/(app)/importacao/nav-importacao.tsx").includes("/importacao/consignado")).toBe(true);
    for (const tela of [
      "src/app/(app)/importacao/page.tsx",
      "src/app/(app)/importacao/clientes/page.tsx",
      "src/app/(app)/importacao/fornecedores/page.tsx",
      "src/app/(app)/importacao/consignado/page.tsx",
    ]) {
      expect(ler(tela).includes("<NavImportacao"), tela).toBe(true);
    }
  });

  it("cada tela do CRM monta o cabeçalho com a navegação de áreas", () => {
    for (const tela of [
      "src/app/(app)/crm/page.tsx",
      "src/app/(app)/crm/campanhas/page.tsx",
      "src/app/(app)/crm/fidelidade/page.tsx",
      "src/app/(app)/crm/relacionamento/page.tsx",
      "src/app/(app)/crm/importar-leads/page.tsx",
    ]) {
      expect(ler(tela).includes("<NavAreasCrm"), tela).toBe(true);
    }
  });

  it("KPIs do CRM e do Relacionamento usam o KpiCard", () => {
    expect(ler("src/app/(app)/crm/page.tsx").includes("<KpiCard")).toBe(true);
    expect(ler("src/app/(app)/crm/relacionamento/page.tsx").includes("<KpiCard")).toBe(true);
  });

  it("Relacionamento e a tabela markdown do chat usam o Table da ui, não <table> cru", () => {
    expect(ler("src/app/(app)/crm/relacionamento/page.tsx").includes("<table")).toBe(false);
    expect(ler("src/components/intelligence-chat-client.tsx").includes("<table")).toBe(false);
  });

  it("formulários do CRM e da importação usam RotuloCampo, não <label> cru", () => {
    for (const tela of [
      "src/app/(app)/crm/page.tsx",
      "src/app/(app)/crm/campanhas/page.tsx",
      "src/app/(app)/crm/importar-leads/page.tsx",
      "src/components/importacao-client.tsx",
      "src/components/importacao-clientes-client.tsx",
    ]) {
      expect(ler(tela).includes("<label"), tela).toBe(false);
    }
  });

  it("o chat usa a linguagem do atendimento: usuário em tint da marca, IA neutra", () => {
    const f = ler("src/components/intelligence-chat-client.tsx");
    expect(f.includes("bg-marca-tint")).toBe(true);
    expect(f.includes("bg-popover")).toBe(true);
  });

  it("a importação mostra status de linha/resultado em Badge", () => {
    for (const tela of [
      "src/components/importacao-clientes-client.tsx",
      "src/components/importacao-fornecedores-client.tsx",
      "src/components/importacao-consignado-client.tsx",
    ]) {
      expect(ler(tela).includes("<Badge"), tela).toBe(true);
    }
  });
});
