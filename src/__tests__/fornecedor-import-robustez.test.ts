import { describe, it, expect } from "vitest";
import {
  parseCsvFornecedores,
  planejarImportacaoFornecedores,
  LIMITE_LINHAS_IMPORT,
} from "@/lib/fornecedor-import";

describe("parseCsvFornecedores — robustez (Task 3)", () => {
  it("Teste 1: linha com nome vazio vira erro com motivo nome_vazio e nao lanca excecao; demais linhas seguem", () => {
    const csv = "nome;telefone\n;92999990000\nAcme;123\n";
    const resultado = parseCsvFornecedores(csv);

    expect(resultado.erros).toHaveLength(1);
    expect(resultado.erros[0].motivo).toBe("nome_vazio");
    expect(resultado.linhas).toHaveLength(1);
    expect(resultado.linhas[0].nome).toBe("ACME");
  });

  it("Teste 2: linhas em branco e linhas so com separadores sao descartadas em silencio", () => {
    const csv = "nome;telefone\n\n;;\nAcme;1\n";
    const resultado = parseCsvFornecedores(csv);

    expect(resultado.linhas).toHaveLength(1);
    expect(resultado.erros).toHaveLength(0);
  });

  it("Teste 3 (dedupe dentro do arquivo): mesmo nome repetido produz 1 em criar e 1 em ignorar com motivo duplicado_no_arquivo", () => {
    const csv = "Acme,1\nACME ,2\n";
    const { linhas } = parseCsvFornecedores(csv);
    const plano = planejarImportacaoFornecedores(linhas, []);

    expect(plano.criar).toHaveLength(1);
    expect(plano.ignorar).toHaveLength(1);
    expect(plano.ignorar[0].motivo).toBe("duplicado_no_arquivo");
  });

  it("Teste 4: virgula como separador, sem cabecalho, e parseado corretamente", () => {
    const csv = "Acme,123\nBeta,456\n";
    const resultado = parseCsvFornecedores(csv);

    expect(resultado.linhas).toHaveLength(2);
    expect(resultado.linhas[0].nome).toBe("ACME");
    expect(resultado.linhas[0].telefone).toBe("123");
  });

  it("Teste 5: BOM no inicio nao contamina o primeiro nome", () => {
    const csv = "﻿Acme;1\n";
    const resultado = parseCsvFornecedores(csv);

    expect(resultado.linhas[0].nome).toBe("ACME");
  });

  it("Teste 6: aspas envolvendo a celula sao removidas e a virgula interna preservada quando o separador e ponto-e-virgula", () => {
    const csv = '"ACME, LTDA";123\n';
    const resultado = parseCsvFornecedores(csv);

    expect(resultado.linhas[0].nome).toBe("ACME, LTDA");
  });

  it("Teste 7: arquivo acima de LIMITE_LINHAS_IMPORT devolve um erro unico de limite_excedido e nenhuma linha", () => {
    const csv = Array.from({ length: LIMITE_LINHAS_IMPORT + 5 }, (_, i) => `F${i};1`).join("\n");
    const resultado = parseCsvFornecedores(csv);

    expect(resultado.linhas).toHaveLength(0);
    expect(resultado.erros).toHaveLength(1);
    expect(resultado.erros[0].motivo).toBe("limite_excedido");
  });
});
