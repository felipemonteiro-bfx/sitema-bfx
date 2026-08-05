import { describe, it, expect } from "vitest";
import { stripToolMarkup } from "@/lib/strip-tool-markup";

/**
 * Fase 17, achado 8 — markup interno de ferramenta vazando na tela.
 *
 * Teste de COMPORTAMENTO, nao de texto do arquivo: a primeira versao do filtro
 * passava no gate por grep e mesmo assim apagava conteudo legitimo. Os casos de
 * "nao pode apagar" abaixo sao regressoes reais apontadas na revisao.
 */

describe("stripToolMarkup — remove o markup", () => {
  it("apaga o caso visto em producao (abertura sem nenhum fechamento)", () => {
    expect(stripToolMarkup("<tool_call> <function=resumo_financeiro>")).toBe("");
  });

  it("apaga o bloco fechado inteiro, com o payload", () => {
    expect(stripToolMarkup("Ola.\n<tool_call>{...}</tool_call>\nTudo certo.")).toBe(
      "Ola.\n\nTudo certo.",
    );
  });

  it("apaga <function=…>…</function> no meio da frase", () => {
    expect(stripToolMarkup("Antes <function=f>args</function> depois")).toBe("Antes  depois");
  });

  it("apaga fechamento orfao de tool_call e de function", () => {
    expect(stripToolMarkup("Resultado ok </tool_call> continua")).toBe("Resultado ok  continua");
    expect(stripToolMarkup("</function> orfao")).toBe("orfao");
  });
});

describe("stripToolMarkup — nao pode apagar conteudo legitimo", () => {
  /**
   * `buildToolSummary` concatena as tabelas DEPOIS do texto do modelo
   * (`lib/ai.ts`). Uma abertura pendurada nao pode levar a tabela junto — era
   * exatamente o que a primeira versao fazia, trocando a tabela financeira pelo
   * aviso de "sem texto para exibir".
   */
  it("abertura sem fechamento preserva o que vem depois", () => {
    expect(stripToolMarkup("<tool_call>\n| Cliente | Valor |\n|---|---|\n| A | 10 |")).toBe(
      "| Cliente | Valor |\n|---|---|\n| A | 10 |",
    );
    expect(stripToolMarkup("<tool_call>{args}\nResposta de verdade.")).toBe(
      "{args}\nResposta de verdade.",
    );
  });

  it("nao casa com <functions> nem <function_name> (exige o sinal de igual)", () => {
    const comLista = "Antes <functions>lista</functions> depois do texto";
    expect(stripToolMarkup(comLista)).toBe(comLista);
    const comParametro = "O parametro <function_name> e obrigatorio.";
    expect(stripToolMarkup(comParametro)).toBe(comParametro);
  });

  it("preserva tabela markdown intacta", () => {
    const tabela = "Resumo:\n\n| Cliente | Valor |\n|---|---|\n| A | 10 |\n\nFim.";
    expect(stripToolMarkup(tabela)).toBe(tabela);
  });

  it("preserva sinal de maior-que e markdown comum", () => {
    expect(stripToolMarkup("Total: 5 > 3 e a > b")).toBe("Total: 5 > 3 e a > b");
    expect(stripToolMarkup("**Total**: R$ 1.000")).toBe("**Total**: R$ 1.000");
  });

  it("preserva o erro do provedor — e diagnostico, nao markup", () => {
    const erro =
      "Erro ao chamar LiteLLM: /chat/completions: Invalid model name passed in model=Qwen/...";
    expect(stripToolMarkup(erro)).toBe(erro);
  });

  it("preserva texto sem markup nenhum", () => {
    expect(stripToolMarkup("Texto normal sem markup")).toBe("Texto normal sem markup");
  });
});
