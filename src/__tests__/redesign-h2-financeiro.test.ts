// Tarefa H2 do redesign Vantage: Prudent (Antecipação), Fechamento, Boletos e Obrigações no
// visual aprovado. Lê a FONTE das telas e trava as regras de design-system/VANTAGE-PADROES.md
// que as quatro ainda quebravam: caixa-alta, tint de estado em contêiner, raio/sombra crus.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = join(__dirname, "..", "..");

function tsxDe(dir: string): string[] {
  const abs = join(raiz, dir);
  return readdirSync(abs).flatMap((nome) => {
    const rel = join(dir, nome);
    if (statSync(join(raiz, rel)).isDirectory()) return tsxDe(rel);
    return rel.endsWith(".tsx") ? [rel] : [];
  });
}

const componentes = [
  "aguardando-rh-client",
  "antecipacao-client",
  "antecipacao-compradores",
  "boletos-filtros",
  "fechamento-detalhe-client",
  "fechamento-gerar-button",
  "fechamento-pix",
  "historico-antecipacoes",
  "intervalo-meses-picker",
  "obrigacoes-client",
  "obrigacoes-grafico",
  "parcelas-lote-fila",
  "parcelas-venda-popover",
  "planilha-controle-popover",
  "planilha-folha-popover",
  "produtos-venda-popover",
].map((c) => `src/components/${c}.tsx`);

const arquivos = [
  ...["prudent", "fechamento", "boletos", "obrigacoes"].flatMap((d) => tsxDe(`src/app/(app)/${d}`)),
  ...componentes,
];

const fonte = (rel: string) => readFileSync(join(raiz, rel), "utf8");

// Tint de estado só vale em Badge, em alerta real (role status/alert, <Alert>) ou em ponto indicador.
const TINT = /(bg|border)-(success|warning|info|error)(-bg)?(?![-\w])/;
const LIBERADO = /<Badge|<Alert|role="(status|alert)"|indicador|size-2\b|h-2 w-2|h-1\.5 w-1\.5/;

describe("H2: telas financeiras no padrão Vantage", () => {
  it("cobre os arquivos esperados", () => {
    expect(arquivos.length).toBeGreaterThan(18);
  });

  for (const rel of arquivos) {
    describe(rel, () => {
      const linhas = fonte(rel).split("\n");
      const ofensas = (teste: (l: string) => boolean) =>
        linhas
          .map((l, i) => ({ l, n: i + 1 }))
          .filter(({ l }) => !l.trim().startsWith("//") && teste(l))
          .map(({ n, l }) => `${n}: ${l.trim()}`);

      it("sem caixa-alta nem tracking-wide", () => {
        expect(ofensas((l) => /\buppercase\b|tracking-(wide|wider|widest)\b/.test(l))).toEqual([]);
      });
      it("sem raio xl/2xl/3xl cru", () => {
        expect(ofensas((l) => /rounded-(xl|2xl|3xl)\b/.test(l))).toEqual([]);
      });
      it("sem sombra pesada nem gradiente", () => {
        expect(ofensas((l) => /shadow-(md|lg|xl|2xl)\b|shadow-\[var\(--shadow-(md|lg|xl)\)\]|gradient/.test(l))).toEqual([]);
      });
      it("tint de estado só em Badge, alerta ou ponto (nunca em card/seção)", () => {
        expect(ofensas((l) => TINT.test(l) && !LIBERADO.test(l))).toEqual([]);
      });
    });
  }
});
