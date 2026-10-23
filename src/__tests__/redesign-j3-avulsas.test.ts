// Tarefa J3 do redesign Vantage: páginas avulsas (erro, 404, offline, assinatura) e componentes
// base trocam HTML cru por componentes shadcn/ui. Fixa, lendo o fonte:
//  - `<button` cru só onde há exceção comentada (marcador "exceção shadcn");
//  - nenhum `<hr`;
//  - telas avulsas sem gradiente, raio cru, sombra pesada, cor crua nem caixa-alta.
// Nenhuma execução de regex com estado (CLAUDE.md): só includes/split.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = join(__dirname, "..", "..");
const ler = (rel: string) => readFileSync(join(raiz, rel), "utf8");

const TELAS = [
  "src/app/error.tsx",
  "src/app/(app)/error.tsx",
  "src/app/not-found.tsx",
  "src/app/global-error.tsx",
  "src/app/offline/page.tsx",
  "src/app/assinatura/[token]/page.tsx",
];

const COM_BUTTON_PERMITIDO = [
  "src/components/form-select.tsx",
  "src/components/intelligence-chat-composer.tsx",
];

const TODOS = [
  ...TELAS,
  "src/components/form-select.tsx",
  "src/components/intelligence-chat-composer.tsx",
  "src/components/intelligence-chat-client.tsx",
];

const FAMILIAS = [
  "slate", "gray", "zinc", "neutral", "stone", "red", "orange", "amber", "yellow", "lime",
  "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia",
  "pink", "rose",
];

describe("J3 — <button> cru", () => {
  for (const rel of TODOS) {
    it(`${rel}: cada <button só existe com exceção comentada`, () => {
      const partes = ler(rel).split("<button");
      for (let i = 1; i < partes.length; i++) {
        const antes = partes.slice(0, i).join("<button");
        const janela = antes.slice(-900);
        expect(
          COM_BUTTON_PERMITIDO.includes(rel) && janela.includes("exceção shadcn"),
          `${rel}: <button #${i} sem comentário "exceção shadcn"`,
        ).toBe(true);
      }
    });
  }
});

describe("J3 — <hr", () => {
  for (const rel of TODOS) {
    it(`${rel}: nenhum <hr`, () => {
      expect(ler(rel).includes("<hr")).toBe(false);
    });
  }
  it("o chat usa Separator da ui para a régua do markdown", () => {
    const fonte = ler("src/components/intelligence-chat-client.tsx");
    expect(fonte.includes('from "@/components/ui/separator"')).toBe(true);
    expect(fonte.includes("<Separator")).toBe(true);
  });
});

describe("J3 — telas avulsas no visual Vantage", () => {
  for (const rel of TELAS) {
    it(`${rel}: sem gradiente, raio cru, sombra pesada, cor crua ou caixa-alta`, () => {
      const fonte = ler(rel);
      for (const proibido of [
        "gradient", "rounded-xl", "rounded-2xl", "rounded-lg", "rounded-md", "shadow-md",
        "shadow-lg", "shadow-xl", "shadow-2xl", "uppercase", "tracking-wide", "[#",
      ]) {
        expect(fonte.includes(proibido), `${rel} contém "${proibido}"`).toBe(false);
      }
      for (const f of FAMILIAS) {
        for (const prefixo of ["bg", "text", "border", "ring", "from", "to"]) {
          expect(fonte.includes(`${prefixo}-${f}-`), `${rel} contém ${prefixo}-${f}-`).toBe(false);
        }
      }
      expect(fonte.includes("text-white"), `${rel} contém text-white`).toBe(false);
    });
  }

  it("telas de erro e 404 usam painel (Card) neutro", () => {
    for (const rel of ["src/app/error.tsx", "src/app/(app)/error.tsx", "src/app/not-found.tsx"]) {
      expect(ler(rel).includes("@/components/ui/card"), rel).toBe(true);
    }
  });

  it("404 e erro global usam buttonVariants nos links, não classe à mão", () => {
    expect(ler("src/app/not-found.tsx").includes("buttonVariants")).toBe(true);
    expect(ler("src/app/global-error.tsx").includes("buttonVariants")).toBe(true);
  });

  it("global-error não tem '?' no lugar de acento", () => {
    expect(ler("src/app/global-error.tsx").includes("aplica??o")).toBe(false);
  });

  it("assinatura mantém fluxo: endpoints, textos legais e canvas", () => {
    const f = ler("src/app/assinatura/[token]/page.tsx");
    for (const trecho of [
      "/api/assinatura?token=",
      "/api/assinatura/${token}/recibo",
      "Assine com o dedo",
      "Enviar Assinado",
      "Toque aqui para assinar",
      "Parabéns pela compra!",
      'penColor="black"',
    ]) {
      expect(f.includes(trecho), trecho).toBe(true);
    }
  });
});
