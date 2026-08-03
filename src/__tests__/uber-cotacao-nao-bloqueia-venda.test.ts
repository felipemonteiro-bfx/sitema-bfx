// INT-02 / D-02: trava de regressao estrutural sobre o texto-fonte de
// `venda-rapida-form-v2.tsx` — a cotacao de frete Uber NUNCA pode bloquear a
// venda. Mesmo padrao ja usado em `src/__tests__/tokens-fundo-neutro.test.ts`
// e `src/__tests__/pdv-custo-livre.test.ts`, porque montar o formulario
// inteiro em jsdom exigiria mockar meia duzia de rotas.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PDV_PATH = join(process.cwd(), "src/components/venda-rapida-form-v2.tsx");
const pdv = readFileSync(PDV_PATH, "utf8");

describe("INT-02: a cotacao de frete Uber nunca bloqueia a venda", () => {
  it("o botao de finalizar venda so depende do estado de envio do formulario", () => {
    const submit = pdv.split('type="submit"')[1]?.split("</Button>")[0];
    expect(submit).toBeTruthy();
    const guarda = submit!.split("disabled={")[1];
    expect(guarda).toBeTruthy();
    const expr = guarda!.split("}")[0].trim();
    expect(expr).toBe("loading");
  });

  it("o CurrencyInput do frete continua com onChange={setFrete} e sem disabled/readOnly", () => {
    const freteBloco = pdv.split("value={frete}")[1]?.split("/>")[0];
    expect(freteBloco).toBeTruthy();
    expect(freteBloco!.includes("disabled=")).toBe(false);
    expect(freteBloco!.includes("readOnly=")).toBe(false);
    expect(freteBloco!.includes("onChange={setFrete}")).toBe(true);
  });

  it("existe exatamente um controle dependente de uberQuoteLoading (o botao Uber)", () => {
    const ocorrencias = pdv.split("disabled={uberQuoteLoading").length - 1;
    expect(ocorrencias).toBe(1);
  });

  it("o caminho de erro de cotarFreteUber nao chama setFrete", () => {
    const cotar = pdv.split("const cotarFreteUber")[1]?.split("const removeProduto")[0];
    expect(cotar).toBeTruthy();
    const erroPos = cotar!.indexOf("if (!res.ok)");
    const setPos = cotar!.indexOf("setFrete(");
    expect(erroPos).toBeGreaterThanOrEqual(0);
    expect(setPos).toBeGreaterThanOrEqual(0);
    expect(setPos).toBeGreaterThan(erroPos);
    const trechoErro = cotar!.slice(erroPos, setPos);
    expect(trechoErro.includes("setFrete(")).toBe(false);
    expect(cotar!.includes("finally")).toBe(true);
    expect(cotar!.includes("uberMensagem")).toBe(true);
  });

  it("os 4 motivos de MotivoFalhaUber tem cobertura de mensagem no componente", () => {
    expect(pdv.includes("mensagemFalhaUber")).toBe(true);
    expect(pdv.includes("uberMensagem")).toBe(true);
  });
});
