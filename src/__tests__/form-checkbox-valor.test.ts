import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkboxLigado, VALOR_CHECKBOX_LIGADO } from "@/lib/form-values";

/**
 * O `<Checkbox>` do Radix NAO participa de formulario nativo.
 *
 * Os 13 checkboxes de `/configuracoes` vivem dentro de `<form action={...}>`
 * e funcionavam por um detalhe do HTML: `<input type="checkbox" name="x">`
 * envia `"on"` quando marcado e NADA quando desmarcado. Os Server Actions
 * leem exatamente isso (`formData.get("x") === "on" ? 1 : 0`).
 *
 * Trocar por `<Checkbox>` sem repor um campo que envie valor faz o campo
 * sumir do `FormData` — e `=== "on"` vira `false` para SEMPRE. A configuracao
 * passa a salvar desmarcada em silencio: nenhum erro, nenhum toast, so o dado
 * errado. Este arquivo tranca as duas pontas do contrato:
 *
 *   1. o valor que o campo oculto emite quando marcado;
 *   2. como o Server Action interpreta ausencia / "on" / variantes.
 *
 * O vitest roda em `environment: node` e so inclui `src/__tests__/**\/*.test.ts`,
 * entao o componente React nao e testavel aqui — por isso a interpretacao do
 * valor mora em `src/lib/form-values.ts`, fora do componente.
 *
 * Nota de seguranca (CLAUDE.md): nenhuma execucao de regex com estado aqui.
 */

const raiz = process.cwd();
const ler = (rel: string) => readFileSync(join(raiz, rel), "utf8");

describe("checkboxLigado — interpretacao do valor enviado", () => {
  it('trata "on" como ligado (o que o checkbox nativo sempre enviou)', () => {
    expect(checkboxLigado("on")).toBe(true);
  });

  it("trata ausencia como desligado (checkbox nativo desmarcado nao envia nada)", () => {
    expect(checkboxLigado(null)).toBe(false);
    expect(checkboxLigado(undefined)).toBe(false);
  });

  it('trata string vazia como desligado — e o que o campo oculto emite desmarcado', () => {
    // O campo oculto sempre existe no FormData (diferente do nativo, que
    // some). Desmarcado ele manda "", e "" !== "on" ja daria 0 — mas a regra
    // fica explicita para nao depender de coincidencia.
    expect(checkboxLigado("")).toBe(false);
  });

  it('aceita "true" e "1" como ligado', () => {
    // Defesa: se algum call site futuro emitir outra convencao, o Server
    // Action nao volta a gravar 0 em silencio.
    expect(checkboxLigado("true")).toBe(true);
    expect(checkboxLigado("1")).toBe(true);
  });

  it('trata "off", "false" e "0" como desligado', () => {
    expect(checkboxLigado("off")).toBe(false);
    expect(checkboxLigado("false")).toBe(false);
    expect(checkboxLigado("0")).toBe(false);
  });

  it("ignora caixa e espacos em volta", () => {
    expect(checkboxLigado(" On ")).toBe(true);
    expect(checkboxLigado("TRUE")).toBe(true);
  });

  it("trata File (upload) como desligado, nunca como truthy", () => {
    // `FormData.get` devolve `FormDataEntryValue` — string OU File. Sem este
    // caso um File cairia num `Boolean(valor)` e gravaria 1.
    const arquivo = new File(["x"], "x.txt");
    expect(checkboxLigado(arquivo)).toBe(false);
  });

  it("o valor emitido pelo campo oculto e aceito pelo leitor", () => {
    // A garantia que fecha o ciclo: o que o componente escreve e o que o
    // Server Action le. Se alguem mudar um lado, este teste quebra.
    expect(checkboxLigado(VALOR_CHECKBOX_LIGADO)).toBe(true);
    expect(VALOR_CHECKBOX_LIGADO).toBe("on");
  });
});

describe("os formularios nativos nao perderam o envio do valor", () => {
  const ARQUIVOS = [
    "src/app/(app)/configuracoes/page.tsx",
    "src/components/edit-venda-form-client.tsx",
  ];

  it.each(ARQUIVOS)("%s nao tem mais checkbox nativo", (rel) => {
    expect(ler(rel).includes('type="checkbox"')).toBe(false);
  });

  it.each(ARQUIVOS)("%s usa o FormCheckbox, que emite o campo oculto", (rel) => {
    expect(ler(rel).includes("FormCheckbox")).toBe(true);
  });

  it("o FormCheckbox emite um input hidden com o mesmo `name`", () => {
    // Mesma solucao do FormSelect: o controle do Radix e visual, quem
    // participa do FormData e o campo oculto ao lado.
    const fonte = ler("src/components/form-checkbox.tsx");
    expect(fonte.includes('type="hidden"')).toBe(true);
    expect(fonte.includes("name={name}")).toBe(true);
  });

  it("todo Server Action de checkbox le pelo helper, nao por comparacao solta", () => {
    // `=== "on"` espalhado por 13 linhas e exatamente o que quebra em
    // silencio quando o componente muda de convencao.
    const page = ler("src/app/(app)/configuracoes/page.tsx");
    const actions = ler("src/app/(app)/historico/actions.ts");
    expect(page.includes('=== "on"')).toBe(false);
    expect(actions.includes('=== "on"')).toBe(false);
    expect(page.includes("checkboxLigado(")).toBe(true);
    expect(actions.includes("checkboxLigado(")).toBe(true);
  });

  it("os 13 campos de /configuracoes continuam sendo lidos, um a um", () => {
    // Blindagem contra a falha silenciosa: se um `name` sumir do JSX na
    // migracao, o Server Action passa a gravar 0 para sempre e nada acusa.
    const page = ler("src/app/(app)/configuracoes/page.tsx");
    const campos = [
      "whatsappFallbackEvolution",
      "whatsappAutoEnabled",
      "whatsappAutoRecibo",
      "whatsappAutoBoleto",
      "whatsappAutoLembrete",
      "whatsappAutoInadimplencia",
      "whatsappAutoReativacao",
      "whatsappAutoAniversario",
      "whatsappAutoBoasVindas",
      "whatsappAutoAgradecimento",
      "whatsappAutoNPS",
      "whatsappPreAtendimento",
      "uberEnabled",
    ];
    expect(campos).toHaveLength(13);
    for (const campo of campos) {
      // uma vez no JSX (name=) e uma vez no Server Action (checkboxLigado)
      expect(page.includes(`name="${campo}"`), `${campo} sem name no JSX`).toBe(true);
      expect(
        page.includes(`checkboxLigado(formData.get("${campo}"))`),
        `${campo} nao e lido pelo Server Action`
      ).toBe(true);
    }
  });

  it("os 3 campos de edit-venda continuam sendo lidos", () => {
    const form = ler("src/components/edit-venda-form-client.tsx");
    const actions = ler("src/app/(app)/historico/actions.ts");
    for (const campo of ["temNota", "descontoEmFolha", "boleto"]) {
      expect(form.includes(`name="${campo}"`), `${campo} sem name no JSX`).toBe(true);
      expect(
        actions.includes(`checkboxLigado(formData.get("${campo}"))`),
        `${campo} nao e lido pelo Server Action`
      ).toBe(true);
    }
  });
});

describe("os checkboxes fora de formulario nativo migraram sem campo oculto", () => {
  // Estes dois sao controlados por estado React e enviados por fetch/JSON —
  // nao passam por FormData. Usar o FormCheckbox aqui adicionaria um campo
  // oculto sem dono.
  it.each([
    "src/components/empresas-tab-client.tsx",
    "src/components/importacao-client.tsx",
  ])("%s usa o Checkbox do shadcn direto", (rel) => {
    const fonte = ler(rel);
    expect(fonte.includes('type="checkbox"')).toBe(false);
    expect(fonte.includes("<Checkbox")).toBe(true);
    expect(fonte.includes("FormCheckbox")).toBe(false);
  });

  it("o onCheckedChange dos call sites migrados trata os TRES estados", () => {
    // `checked` e `true | false | "indeterminate"`. Um
    // `onCheckedChange={(c) => set(c)}` cru injetaria a string no estado —
    // e `"indeterminate"` e truthy, entao a linha ficaria marcada para sempre.
    // Os call sites que ja existiam delegam para handlers tipados
    // `(checked: boolean | "indeterminate")`; os migrados agora normalizam
    // com `=== true` no proprio JSX.
    expect(
      ler("src/components/empresas-tab-client.tsx").includes(
        "onCheckedChange={() => toggleVinculo(e.id)}"
      )
    ).toBe(true);
    expect(
      ler("src/components/importacao-client.tsx").includes(
        "updateCell(row.id, 'antecipada', checked === true)"
      )
    ).toBe(true);
  });

  it("nenhum handler de selecao em massa perdeu o tipo dos 3 estados", () => {
    const fonte = ler("src/components/empresas-tab-client.tsx");
    expect(fonte.includes('checked: boolean | "indeterminate"')).toBe(true);
  });
});
