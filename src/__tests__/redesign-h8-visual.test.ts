// Tarefa H8 do redesign Vantage: FormSelect, CardStats, GerarBoletoButton, QueryTabs, o Skeleton
// e todos os loading.tsx. Fixa, lendo o fonte, o que design-system/VANTAGE-PADROES.md exige:
// sem caixa-alta, sem tint de estado em contêiner, raios por token, sem sombra pesada, sem
// gradiente nem shimmer colorido. Só visual: nenhum comportamento é testado aqui.
// Nenhuma execução de regex com estado (CLAUDE.md): só includes/split.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = join(__dirname, "..", "..");
const ler = (rel: string) => readFileSync(join(raiz, rel), "utf8");

function achar(dir: string, saida: string[] = []): string[] {
  for (const nome of readdirSync(join(raiz, dir))) {
    const rel = `${dir}/${nome}`;
    if (statSync(join(raiz, rel)).isDirectory()) achar(rel, saida);
    else if (nome === "loading.tsx") saida.push(rel);
  }
  return saida;
}

/** Só o CardStats do card.tsx: as outras partes do Card não são desta tarefa. */
function trechoCardStats(): string {
  const fonte = ler("src/components/ui/card.tsx");
  const inicio = fonte.indexOf("type TrendDirection");
  const fim = fonte.indexOf("CardStats.displayName");
  return fonte.slice(inicio, fim);
}

const FONTES: Record<string, string> = {
  "form-select.tsx": ler("src/components/form-select.tsx"),
  "gerar-boleto-button.tsx": ler("src/components/gerar-boleto-button.tsx"),
  "query-tabs.tsx": ler("src/components/query-tabs.tsx"),
  "ui/skeleton.tsx": ler("src/components/ui/skeleton.tsx"),
  "CardStats (ui/card.tsx)": trechoCardStats(),
};
for (const loading of achar("src/app")) FONTES[loading] = ler(loading);

describe("H8 — padrões do Vantage nos componentes compartilhados e nos esqueletos", () => {
  it("encontra os 24 loading.tsx (19 + atendimento, janela, obrigações, relacionamento e importar leads, tarefa L)", () => {
    expect(achar("src/app").length).toBe(24);
  });

  for (const [nome, fonte] of Object.entries(FONTES)) {
    describe(nome, () => {
      it("sem caixa-alta nem tracking-wide", () => {
        expect(fonte.includes("uppercase"), "uppercase").toBe(false);
        expect(fonte.includes("tracking-wide"), "tracking-wide").toBe(false);
      });

      it("sem rounded-xl/2xl/3xl cru", () => {
        for (const raio of ["rounded-xl", "rounded-2xl", "rounded-3xl"]) {
          expect(fonte.includes(raio), raio).toBe(false);
        }
      });

      it("sem sombra pesada, gradiente nem shimmer", () => {
        for (const ruim of ["shadow-md", "shadow-lg", "shadow-xl", "shadow-2xl", "gradient", "shimmer", "skeleton-base"]) {
          expect(fonte.includes(ruim), ruim).toBe(false);
        }
      });

      it("sem tint de estado em contêiner (borda/fundo colorido)", () => {
        for (const estado of ["success", "warning", "error", "info"]) {
          expect(fonte.includes(`border-${estado}`), `border-${estado}`).toBe(false);
          expect(fonte.includes(`bg-${estado}/`), `bg-${estado}/`).toBe(false);
        }
      });
    });
  }

  describe("FormSelect igual ao Select da ui", () => {
    const fonte = FONTES["form-select.tsx"];
    it("gatilho com rounded-controle, bg-controle, border-input e 44px", () => {
      // A pele do gatilho mora na variante `seletor` do Button (button-variants.ts).
      expect(fonte.includes('variant="seletor"')).toBe(true);
      const variantes = ler("src/components/ui/button-variants.ts");
      const seletor = variantes.split("\n").find((l) => l.includes("rounded-controle border border-input bg-controle") && l.includes("h-11")) || "";
      for (const classe of ["rounded-controle", "bg-controle", "border-input", "h-11"]) {
        expect(seletor.includes(classe), classe).toBe(true);
      }
      expect(seletor.includes("border-2"), "border-2").toBe(false);
      expect(fonte.includes("border-2"), "border-2").toBe(false);
    });
    it("sem opacidade em texto", () => {
      expect(fonte.includes("opacity-70"), "opacity-70").toBe(false);
      expect(fonte.includes("muted-foreground/70"), "muted-foreground/70").toBe(false);
    });
  });

  describe("CardStats alinhado ao KpiCard", () => {
    const fonte = FONTES["CardStats (ui/card.tsx)"];
    it("card interno neutro, valor mono em foreground", () => {
      // variant="elevated" = card interno (bg-card-elevated rounded-interno) no Card.
      expect(fonte.includes('variant="elevated"')).toBe(true);
      expect(fonte.includes("font-mono")).toBe(true);
    });
    it("sem escala no hover", () => {
      expect(fonte.includes("hover:scale")).toBe(false);
    });
  });

  describe("esqueletos", () => {
    it("o Skeleton respeita reduced-motion", () => {
      expect(FONTES["ui/skeleton.tsx"].includes("motion-reduce:animate-none")).toBe(true);
    });
    it("há um esqueleto de cabeçalho no layout novo (SkeletonCabecalho)", () => {
      expect(FONTES["ui/skeleton.tsx"].includes("export function SkeletonCabecalho")).toBe(true);
    });
  });
});
