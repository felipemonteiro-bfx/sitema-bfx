import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkboxLigado, checkboxComoNumero, VALOR_CHECKBOX_LIGADO } from "@/lib/form-values";

/**
 * 18 checkboxes nativos viraram `<Checkbox>` do shadcn.
 *
 * A premissa inicial desta migracao estava ERRADA e vale registrar, porque ela
 * quase produziu a falha que tentava evitar: partiu-se do principio de que o
 * `<Checkbox>` do Radix (um `<button role="checkbox">`) nao participa de
 * `FormData`, e que por isso os 16 que vivem em `<form action={serverAction}>`
 * precisariam de um `<input type="hidden">` de apoio.
 *
 * O Radix 1.3.3 renderiza um `CheckboxBubbleInput` — `<input type="checkbox"
 * aria-hidden name value form required disabled>` — sempre que o controle esta
 * dentro de um `<form>`, com `value` default `"on"`. Passar `name` ao
 * `<Checkbox>` preserva a semantica nativa EXATAMENTE: `"on"` marcado, ausente
 * desmarcado. O campo oculto era redundante e ainda PIORAVA a semantica
 * (mandava `""` em vez de nada, quebrando qualquer leitor futuro que use
 * `formData.has()`), alem de nao repassar `disabled`/`required`.
 *
 * O que sobrou de util foi a leitura centralizada: os mesmos `name`
 * (`temNota`, `descontoEmFolha`, `boleto`) eram lidos com `=== "on"` em
 * /configuracoes e /historico e com `=== "true"` em /venda-rapida. Mover um
 * checkbox de uma tela para a outra gravaria `false` em silencio.
 *
 * O vitest roda em `environment: node` e so inclui `src/__tests__/**\/*.test.ts`,
 * entao componente React nao e testavel — por isso a interpretacao do valor
 * mora em `src/lib/form-values.ts`.
 *
 * Nota de seguranca (CLAUDE.md): nenhuma execucao de regex com estado aqui.
 */

const raiz = process.cwd();
const ler = (rel: string) => readFileSync(join(raiz, rel), "utf8");

describe("checkboxLigado — interpretacao do valor enviado", () => {
  it('trata "on" como ligado (o que checkbox nativo e Radix enviam)', () => {
    expect(checkboxLigado("on")).toBe(true);
  });

  it("trata ausencia como desligado (checkbox desmarcado nao envia nada)", () => {
    expect(checkboxLigado(null)).toBe(false);
    expect(checkboxLigado(undefined)).toBe(false);
  });

  it("trata string vazia como desligado", () => {
    expect(checkboxLigado("")).toBe(false);
  });

  it('aceita "true" e "1" como ligado — a convencao da venda rapida', () => {
    // /venda-rapida monta o FormData a mao com `String(boolean)`. Sem isto, um
    // checkbox movido para aquela tela gravaria o oposto do que o usuario viu.
    expect(checkboxLigado("true")).toBe(true);
    expect(checkboxLigado("1")).toBe(true);
  });

  it('trata "off", "false" e "0" como desligado', () => {
    // `"false"` e string NAO-VAZIA: num `Boolean(valor)` seria `true`.
    expect(checkboxLigado("off")).toBe(false);
    expect(checkboxLigado("false")).toBe(false);
    expect(checkboxLigado("0")).toBe(false);
  });

  it("ignora caixa e espacos em volta", () => {
    expect(checkboxLigado(" On ")).toBe(true);
    expect(checkboxLigado("TRUE")).toBe(true);
  });

  it("trata File (upload) como desligado, nunca como truthy", () => {
    // `FormData.get` devolve `FormDataEntryValue` — string OU File.
    expect(checkboxLigado(new File(["x"], "x.txt"))).toBe(false);
  });

  it("checkboxComoNumero devolve 0/1 para as colunas numericas", () => {
    expect(checkboxComoNumero("on")).toBe(1);
    expect(checkboxComoNumero(null)).toBe(0);
    expect(checkboxComoNumero("false")).toBe(0);
  });

  it("o valor que um checkbox marcado envia e aceito pelo leitor", () => {
    expect(checkboxLigado(VALOR_CHECKBOX_LIGADO)).toBe(true);
    expect(VALOR_CHECKBOX_LIGADO).toBe("on");
  });
});

describe("os formularios nativos continuam enviando o valor", () => {
  const ARQUIVOS = [
    "src/app/(app)/configuracoes/page.tsx",
    "src/components/edit-venda-form-client.tsx",
  ];

  it.each(ARQUIVOS)("%s nao tem mais checkbox nativo", (rel) => {
    expect(ler(rel).includes('type="checkbox"')).toBe(false);
  });

  it.each(ARQUIVOS)("%s usa o <Checkbox> do shadcn", (rel) => {
    expect(ler(rel).includes("<Checkbox")).toBe(true);
  });

  it("nao existe mais um wrapper com campo oculto — o Radix ja envia sozinho", () => {
    // Se alguem recriar o `<FormCheckbox>`, o campo oculto passa a conviver com
    // o bubble input do Radix e o `FormData` ganha DOIS valores para o mesmo
    // `name`.
    let existe = true;
    try {
      ler("src/components/form-checkbox.tsx");
    } catch {
      existe = false;
    }
    expect(existe).toBe(false);
  });

  it("todo checkbox de formulario nativo carrega `name`", () => {
    // Sem `name`, o Radix ate renderiza o bubble input, mas ele nao e
    // submetido — e o Server Action grava 0 para sempre, em silencio.
    const page = ler("src/app/(app)/configuracoes/page.tsx");
    const blocos = page.split("<Checkbox").slice(1);
    expect(blocos).toHaveLength(13);
    for (const bloco of blocos) {
      expect(bloco.split("/>")[0].includes("name=")).toBe(true);
    }
  });

  it("todo Server Action de checkbox le pelo helper, nao por comparacao solta", () => {
    for (const rel of [
      "src/app/(app)/configuracoes/page.tsx",
      "src/app/(app)/historico/actions.ts",
      "src/app/(app)/venda-rapida/actions.ts",
    ]) {
      const fonte = ler(rel);
      expect(fonte.includes('=== "on"'), `${rel} ainda compara com "on"`).toBe(false);
      expect(fonte.includes('=== "true"'), `${rel} ainda compara com "true"`).toBe(false);
      expect(
        fonte.includes("checkboxLigado(") || fonte.includes("checkboxComoNumero("),
        `${rel} nao usa o helper`
      ).toBe(true);
    }
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
      expect(page.includes(`name="${campo}"`), `${campo} sem name no JSX`).toBe(true);
      expect(
        page.includes(`checkboxComoNumero(formData.get("${campo}"))`),
        `${campo} nao e lido pelo Server Action`
      ).toBe(true);
    }
  });

  it("os 3 campos legados de venda sao lidos pelo helper nos dois caminhos", () => {
    const actions = ler("src/app/(app)/historico/actions.ts");
    const vendaRapida = ler("src/app/(app)/venda-rapida/actions.ts");
    for (const campo of ["temNota", "descontoEmFolha", "boleto"]) {
      expect(
        actions.includes(`checkboxLigado(formData.get("${campo}"))`),
        `${campo} nao e lido em historico/actions`
      ).toBe(true);
      expect(
        vendaRapida.includes(`checkboxLigado(formData.get("${campo}"))`),
        `${campo} nao e lido em venda-rapida/actions`
      ).toBe(true);
    }
  });

  it("o formulario de venda que esta em producao usa <Checkbox name>", () => {
    // `edit-venda-form-client.tsx` nao e renderizado por nenhuma rota; quem o
    // /historico monta e `edit-venda-historico-form.tsx`. Ele ja usava
    // `<Checkbox name="temNota">` dentro de `<form>` + `new FormData(...)` —
    // e e a prova viva de que o Radix participa do envio.
    const vivo = ler("src/components/edit-venda-historico-form.tsx");
    expect(vivo.includes('<Checkbox name="temNota"')).toBe(true);
    expect(vivo.includes("new FormData(")).toBe(true);
  });
});

describe("os checkboxes fora de formulario nativo", () => {
  // Estes dois sao controlados por estado React e enviados por fetch/JSON.
  it.each([
    "src/components/empresas-tab-client.tsx",
    "src/components/importacao-client.tsx",
  ])("%s usa o <Checkbox> do shadcn", (rel) => {
    const fonte = ler(rel);
    expect(fonte.includes('type="checkbox"')).toBe(false);
    expect(fonte.includes("<Checkbox")).toBe(true);
  });

  it("o onCheckedChange dos call sites migrados trata os TRES estados", () => {
    // `checked` e `true | false | "indeterminate"`, e `"indeterminate"` e
    // truthy: um `onCheckedChange={(c) => set(c)}` cru deixaria a linha
    // marcada para sempre.
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
    expect(
      ler("src/components/empresas-tab-client.tsx").includes('checked: boolean | "indeterminate"')
    ).toBe(true);
  });

  it("os controles sem <label htmlFor> tem nome acessivel", () => {
    // Um `<button role="checkbox">` dentro de `<label>` sem `htmlFor` depende
    // de rotulacao implicita, que o suporte de leitor de tela cobre pior do que
    // no `<input>`. `aria-label` resolve sem depender disso.
    expect(ler("src/components/empresas-tab-client.tsx").includes("aria-label={`Vincular")).toBe(
      true
    );
    expect(
      ler("src/components/importacao-client.tsx").includes('aria-label="Parcela antecipada"')
    ).toBe(true);
  });

  it("o checkbox da planilha densa mantem o tamanho reduzido", () => {
    // O `<Checkbox>` e `h-4 w-4` fixo; a celula da planilha usava `h-3 w-3`.
    expect(ler("src/components/importacao-client.tsx").includes('className="h-3 w-3"')).toBe(true);
  });
});
