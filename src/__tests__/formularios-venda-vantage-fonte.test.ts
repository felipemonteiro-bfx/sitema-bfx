import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Formulários de venda compartilhados (Venda Rápida + edição) no visual Vantage
// (design-system/VANTAGE-PADROES.md). Lê a fonte e fixa o padrão: cards internos
// neutros, rótulo em frase normal, sem sombra pesada/gradiente, tint de estado só
// em Badge ou alerta real.
const ARQUIVOS = [
  "src/components/produto-item-form.tsx",
  "src/components/parcelas-vencimento-form.tsx",
  "src/components/data-desconto-unica.tsx",
  "src/components/edit-venda-form-client.tsx",
  "src/components/edit-venda-historico-form.tsx",
  "src/components/edit-venda-com-parcelas.tsx",
  "src/components/edit-venda-itens-client.tsx",
  "src/components/edit-venda-sheet-wrapper.tsx",
  "src/components/edit-parcelas-section.tsx",
  "src/components/parcelas-venda-popover.tsx",
  "src/components/produtos-venda-popover.tsx",
  "src/components/recebimento-parcelas.tsx",
  "src/components/form-secao-titulo.tsx",
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

  it("sem tint nem borda de estado em contêiner (só Badge e Alert)", () => {
    const ofensas = fonte
      .split("\n")
      .filter((l) => !/Badge/.test(l))
      // Contorno vermelho de CAMPO inválido (`erro && "border-error"`) é erro real, não card.
      .filter((l) => !/erro && "border-error"/.test(l))
      .filter((l) =>
        /(bg-(success|warning|error|info)(-bg|\/\d+)|border-(success|warning|error|info)\b)/.test(l),
      );
    expect(ofensas).toEqual([]);
  });

  it("sem tint de marca em fundo ou borda de card (bg-primary/N, border-primary/N)", () => {
    expect(ocorrencias(fonte, /\b(bg|border)-primary\/\d+/)).toBe(0);
  });
});
