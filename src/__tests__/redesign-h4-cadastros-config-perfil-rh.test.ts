// Redesign H4: Cadastros, Configurações, Meu Perfil e Gestão de RH seguem os padrões Vantage
// (design-system/VANTAGE-PADROES.md). Teste de fonte: varre os arquivos dessas telas.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();
const PASTAS = ["cadastros", "configuracoes", "perfil", "gestao-rh"].map((p) =>
  join(RAIZ, "src/app/(app)", p),
);
const COMPONENTES = [
  "clientes-tab-client", "delete-user-button", "empresas-tab-client", "fornecedores-tab-client",
  "gestao-rh-tabs", "link-catalogo-button", "litellm-model-select", "logo-upload-form",
  "masked-input", "perfil-senha-form", "produto-form-client", "produtos-tab-client",
  "receipt-editor-client", "regras-empresa-section", "reset-senha-dialog", "settings-save-button",
  "webhook-asaas-card", "whatsapp-connect",
].map((c) => join(RAIZ, "src/components", `${c}.tsx`));

function tsx(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? tsx(p) : p.endsWith(".tsx") ? [p] : [];
  });
}
const ARQUIVOS = [...PASTAS.flatMap(tsx), ...COMPONENTES];

function violacoes(re: RegExp): string[] {
  const achados: string[] = [];
  for (const f of ARQUIVOS) {
    readFileSync(f, "utf8")
      .split("\n")
      .forEach((linha, i) => {
        if (re.test(linha)) achados.push(`${f.replace(RAIZ + "/", "")}:${i + 1}: ${linha.trim().slice(0, 600)}`);
      });
  }
  return achados;
}

describe("redesign H4 - padrões Vantage", () => {
  it("sem caixa-alta nem tracking-wide em rótulo, título ou cabeçalho", () => {
    // O uppercase em CAMPO de texto (`[&_input]:uppercase`, className="uppercase" num Input) só espelha a
    // normalização para maiúsculas que o dado já sofre ao salvar: é valor digitado, não rótulo.
    const ruins = violacoes(/\buppercase\b|tracking-(wide|wider|widest)/).filter(
      (l) => !/\[&_input\]:uppercase|<Input.*uppercase|className="uppercase"|cn\("uppercase"/.test(l),
    );
    expect(ruins).toEqual([]);
  });
  it("o Label da ui nasce em frase normal e nenhuma tela o põe em caixa-alta", () => {
    // Antes cada <Label> repetia `normal-case tracking-normal`; agora a base do Label ja e Vantage.
    const base = readFileSync(join(RAIZ, "src/components/ui/label.tsx"), "utf8");
    expect(base.includes("uppercase")).toBe(false);
    expect(base.includes("tracking-wide")).toBe(false);
    const ruins = violacoes(/<Label\b/).filter((l) => /uppercase|tracking-/.test(l));
    expect(ruins).toEqual([]);
  });
  it("título de painel não é verde", () => {
    expect(violacoes(/CardTitle className="text-primary"/)).toEqual([]);
  });
  it("sem rounded-xl/2xl/3xl cru", () => {
    expect(violacoes(/rounded-(xl|2xl|3xl)\b/)).toEqual([]);
  });
  it("sem sombra pesada nem gradiente", () => {
    expect(violacoes(/shadow-(md|lg|xl|2xl)\b|\bbg-gradient|gradient-to|page-title-gradient/)).toEqual([]);
  });
  it("tint de estado só em Badge/alerta, nunca em contêiner inteiro", () => {
    const ruins = violacoes(
      /<(div|section|Card|li|label)\b[^>]*(bg|border)-(info|success|warning|error|primary)/,
    ).filter((l) => !/role="(alert|status)"/.test(l));
    expect(ruins).toEqual([]);
  });
});
