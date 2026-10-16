import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Venda Rápida no visual Vantage (design-system/VANTAGE-PADROES.md). Lê a fonte
// das peças que SÓ esta tela usa e fixa o padrão: painel neutro, rótulo em frase
// normal, sem sombra pesada, sem gradiente, sem tint de estado em contêiner.
const ARQUIVOS = [
  "src/app/(app)/venda-rapida/page.tsx",
  "src/app/(app)/venda-rapida/loading.tsx",
  "src/components/venda-rapida-form-v2.tsx",
  "src/components/link-assinatura-button.tsx",
  "src/components/recibo-download-link.tsx",
  "src/components/bfx-intelligence-panel.tsx",
  "src/components/cadastrar-cliente-rapido-dialog.tsx",
  "src/components/resumo-venda-panel.tsx",
];

// Tira os comentários: eles explicam o que ERA e podem citar as classes antigas.
function codigo(arquivo: string): string {
  const bruto = readFileSync(join(process.cwd(), arquivo), "utf8");
  const semBloco = bruto
    .split("/*")
    .map((p, i) => (i === 0 ? p : p.split("*/").slice(1).join("*/")))
    .join("");
  return semBloco
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");
}

function ocorrencias(fonte: string, re: RegExp): number {
  return fonte.split(re).length - 1;
}

describe.each(ARQUIVOS)("Vantage em %s", (arquivo) => {
  const fonte = codigo(arquivo);

  it("sem caixa-alta nem tracking aberto", () => {
    expect(ocorrencias(fonte, /\buppercase\b/)).toBe(0);
    expect(ocorrencias(fonte, /tracking-(wide|wider|widest)\b/)).toBe(0);
  });

  it("sem raio cru xl/2xl/3xl", () => {
    expect(ocorrencias(fonte, /rounded-(xl|2xl|3xl)\b/)).toBe(0);
  });

  it("sem sombra pesada nem gradiente", () => {
    expect(ocorrencias(fonte, /\bshadow-(md|lg|xl|2xl|\[)/)).toBe(0);
    expect(ocorrencias(fonte, /\bbg-gradient|\bfrom-[a-z]|\bto-transparent/)).toBe(0);
  });

  it("sem tint nem borda de estado em contêiner (só Badge)", () => {
    const ofensas = fonte
      .split("\n")
      .filter((l) => !/Badge/.test(l))
      .filter((l) =>
        /(bg-(success|warning|error|info)(-bg|\/\d+)|border-(success|warning|error|info)\b)/.test(l),
      );
    expect(ofensas).toEqual([]);
  });
});
