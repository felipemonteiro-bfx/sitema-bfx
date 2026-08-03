import { describe, it, expect } from "vitest";
import { montarEmpresaOptions } from "@/lib/empresa-options";

/**
 * DAT-03 / D-06 (plano 06-03): trava a volta do hardcode de empresas na
 * Exportacao Rapida de /relatorios. Modulo puro (zero imports), sem mocks.
 */
describe("montarEmpresaOptions — Exportacao Rapida sai do hardcode (D-06, DAT-03)", () => {
  it("Teste 1: sem fornecedores, devolve os nomes das empresas na ordem em que chegaram", () => {
    const empresas = [{ nome: "SOFT LIVE" }, { nome: "MIRAX SEGURANÇA" }, { nome: "EQUILIBRIUM" }];

    expect(montarEmpresaOptions(empresas, [])).toEqual(["SOFT LIVE", "MIRAX SEGURANÇA", "EQUILIBRIUM"]);
  });

  it("Teste 2 (regra de D-06): empresa cujo nome coincide com um fornecedor e excluida, ignorando caixa e espacos nas pontas", () => {
    const empresas = [{ nome: "SOFT LIVE" }, { nome: "AMAZON FIVE" }];
    const fornecedores = [{ nome: "  amazon five  " }];

    expect(montarEmpresaOptions(empresas, fornecedores)).toEqual(["SOFT LIVE"]);
  });

  it("Teste 3: lista de empresas vazia devolve [] — nenhum nome aparece sem ter vindo da entrada", () => {
    expect(montarEmpresaOptions([], [])).toEqual([]);
    expect(montarEmpresaOptions([], [{ nome: "QUALQUER FORNECEDOR" }])).toEqual([]);
  });

  it("Teste 4: nomes duplicados diferindo so na caixa aparecem uma unica vez, mantendo a primeira ocorrencia", () => {
    const empresas = [{ nome: "SOFT LIVE" }, { nome: "soft live" }, { nome: "Soft Live" }];

    expect(montarEmpresaOptions(empresas, [])).toEqual(["SOFT LIVE"]);
  });

  it("Teste 5: nomes vazios ou so com espaco sao descartados", () => {
    const empresas = [{ nome: "SOFT LIVE" }, { nome: "" }, { nome: "   " }];

    expect(montarEmpresaOptions(empresas, [])).toEqual(["SOFT LIVE"]);
  });
});
