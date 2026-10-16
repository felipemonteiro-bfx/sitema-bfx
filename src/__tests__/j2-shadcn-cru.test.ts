import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// Redesign Vantage, J2: HTML cru dá lugar aos componentes da ui nos arquivos
// abaixo. O teste lê a fonte (sem comentários) e procura as tags cruas.
const RAIZ = path.resolve(__dirname, "../..");
const ARQUIVOS = [
  "src/components/importacao-client.tsx",
  "src/components/antecipacao-client.tsx",
  "src/components/antecipacao-compradores.tsx",
  "src/components/planilha-controle-popover.tsx",
  "src/components/planilha-folha-popover.tsx",
  "src/components/parcelas-venda-popover.tsx",
  "src/components/parcelas-lote-fila.tsx",
  "src/components/edit-venda-form-client.tsx",
  "src/components/edit-venda-historico-form.tsx",
  "src/components/edit-venda-com-parcelas.tsx",
  "src/components/produto-item-form.tsx",
  "src/components/venda-rapida-form-v2.tsx",
  "src/components/recibo-download-link.tsx",
  "src/components/historico-vendas-cards.tsx",
  "src/components/intervalo-meses-picker.tsx",
  "src/app/(app)/dashboard/page.tsx",
  "src/app/(app)/relatorios/mensais/page.tsx",
];

function fonte(rel: string): string {
  return readFileSync(path.join(RAIZ, rel), "utf8");
}

function semComentarios(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Devolve o texto de cada tag `<nome ...>` (até o `>` que fecha a tag, fora de chaves). */
function tags(src: string, nome: string): string[] {
  const achadas: string[] = [];
  const pedacos = src.split(`<${nome}`);
  for (let i = 1; i < pedacos.length; i++) {
    const resto = pedacos[i];
    const prox = resto[0];
    if (prox !== " " && prox !== "\n" && prox !== ">" && prox !== "/" && prox !== "\t") continue;
    let prof = 0;
    let fim = resto.length;
    for (let j = 0; j < resto.length; j++) {
      const c = resto[j];
      if (c === "{") prof++;
      else if (c === "}") prof--;
      else if (c === ">" && prof === 0 && resto[j - 1] !== "=") {
        fim = j;
        break;
      }
    }
    achadas.push(resto.slice(0, fim));
  }
  return achadas;
}

describe("J2: sem HTML cru nos arquivos migrados", () => {
  for (const rel of ARQUIVOS) {
    const limpo = semComentarios(fonte(rel));

    it(`${rel}: sem select, label, table, hr, textarea crus`, () => {
      for (const nome of ["select", "label", "table", "hr", "textarea"]) {
        expect(tags(limpo, nome), `<${nome}> cru em ${rel}`).toEqual([]);
      }
    });

    it(`${rel}: <button> só com buttonVariants`, () => {
      for (const tag of tags(limpo, "button")) {
        expect(tag, `<button> cru em ${rel}`).toContain("buttonVariants");
      }
    });

    it(`${rel}: <input> só hidden, file ou exceção documentada`, () => {
      const bruto = fonte(rel);
      for (const tag of tags(limpo, "input")) {
        if (tag.includes('type="hidden"') || tag.includes('type="file"')) continue;
        // Células da planilha editável de importacao-client: exceção legítima
        // (skill shadcn-bfx), com a mesma pele de célula densa.
        expect(rel).toBe("src/components/importacao-client.tsx");
        expect(tag).toContain("w-full border-none bg-transparent");
      }
      if (rel === "src/components/importacao-client.tsx") {
        expect(bruto).toContain("EXCEÇÃO LEGÍTIMA");
      }
    });
  }
});

describe("J2: Selects da importação", () => {
  const src = fonte("src/components/importacao-client.tsx");
  it("usam o Select da ui, com opção vazia reposta", () => {
    expect(src).toContain('from "@/components/ui/select"');
    expect(src).toContain("SelectItem");
  });
  it("select de empresa continua desabilitado durante loading/saving", () => {
    const tag = tags(semComentarios(src), "Select")[0];
    expect(tag).toContain("disabled={loading || saving}");
  });
});
