import { describe, it, expect } from "vitest";
import {
  parseCsvClientes,
  planejarImportacaoClientes,
  normalizarNomeClienteImport,
  LIMITE_LINHAS_IMPORT_CLIENTES,
  type ClienteExistente,
} from "@/lib/cliente-import";
import { normalizarNomeCliente } from "@/lib/cliente-rapido";

describe("parseCsvClientes — robustez (Task 3)", () => {
  it("Teste 1: linha com nome vazio vira erro com motivo nome_vazio e nao lanca excecao; demais linhas seguem", () => {
    const csv = "nome;cpf\n;12345678909\nAcme Pessoa;\n";
    const resultado = parseCsvClientes(csv);

    expect(resultado.erros).toHaveLength(1);
    expect(resultado.erros[0].motivo).toBe("nome_vazio");
    expect(resultado.linhas).toHaveLength(1);
    expect(resultado.linhas[0].nome).toBe("ACME PESSOA");
  });

  it("Teste 2: CPF com quantidade de digitos diferente de 11 vira erro com motivo cpf_invalido", () => {
    const csv = "nome;cpf\nMaria;123\n";
    const resultado = parseCsvClientes(csv);

    expect(resultado.erros).toHaveLength(1);
    expect(resultado.erros[0].motivo).toBe("cpf_invalido");
    expect(resultado.linhas).toHaveLength(0);
  });

  it("Teste 6: linhas em branco e linhas so com separadores sao descartadas em silencio", () => {
    const csv = "nome;cpf\n\n;;\nAcme Pessoa;\n";
    const resultado = parseCsvClientes(csv);

    expect(resultado.linhas).toHaveLength(1);
    expect(resultado.erros).toHaveLength(0);
  });

  it("Teste 7: virgula sem cabecalho, BOM no inicio e aspas com separador interno", () => {
    const semCabecalho = parseCsvClientes("Acme Pessoa,123\nBeta Pessoa,456\n");
    expect(semCabecalho.linhas).toHaveLength(2);
    expect(semCabecalho.linhas[0].nome).toBe("ACME PESSOA");

    const comBom = parseCsvClientes("﻿Acme Pessoa,\n");
    expect(comBom.linhas[0].nome).toBe("ACME PESSOA");

    const comAspas = parseCsvClientes('"SILVA, MARIA";98765432100\n');
    expect(comAspas.linhas[0].nome).toBe("SILVA, MARIA");
  });

  it("Teste 8: arquivo acima de LIMITE_LINHAS_IMPORT_CLIENTES devolve um erro unico com motivo limite_excedido e nenhuma linha", () => {
    const csv = Array.from(
      { length: LIMITE_LINHAS_IMPORT_CLIENTES + 5 },
      (_, i) => `Pessoa ${i};`
    ).join("\n");
    const resultado = parseCsvClientes(csv);

    expect(resultado.linhas).toHaveLength(0);
    expect(resultado.erros).toHaveLength(1);
    expect(resultado.erros[0].motivo).toBe("limite_excedido");
  });
});

describe("planejarImportacaoClientes — colisao de nome (Task 3)", () => {
  it("Teste 3: CPF novo cujo nome normalizado ja existe no banco com outro CPF cai em ignorar (nome_ja_usado_por_outro_cpf), nunca em criar", () => {
    const { linhas } = parseCsvClientes("nome;cpf\nMaria da Silva;98765432100\n");
    const existentes: ClienteExistente[] = [
      { id: 7, nome: "MARIA DA SILVA", cpf: "12345678909", empresaParceiraId: null },
    ];
    const plano = planejarImportacaoClientes(linhas, existentes, 3);

    expect(plano.criar).toHaveLength(0);
    expect(plano.ignorar).toHaveLength(1);
    expect(plano.ignorar[0].motivo).toBe("nome_ja_usado_por_outro_cpf");
  });

  it("Teste 4: a mesma colisao dentro do proprio arquivo gera um criar e um ignorar, nao dois criar", () => {
    const { linhas } = parseCsvClientes(
      "nome;cpf\nMaria da Silva;98765432100\nMARIA DA SILVA;11122233344\n"
    );
    const plano = planejarImportacaoClientes(linhas, [], 3);

    expect(plano.criar).toHaveLength(1);
    expect(plano.ignorar).toHaveLength(1);
  });

  it("Teste 5 (dedupe por chave): mesma pessoa repetida no arquivo (mesmo CPF) gera um criar e um ignorar com motivo duplicado_no_arquivo", () => {
    const { linhas } = parseCsvClientes(
      "nome;cpf\nMaria;98765432100\nmaria;987.654.321-00\n"
    );
    const plano = planejarImportacaoClientes(linhas, [], 3);

    expect(plano.criar).toHaveLength(1);
    expect(plano.ignorar).toHaveLength(1);
    expect(plano.ignorar[0].motivo).toBe("duplicado_no_arquivo");
  });
});

describe("normalizarNomeClienteImport — invariante da duplicacao (Teste 9)", () => {
  it("concorda byte a byte com normalizarNomeCliente para uma lista de entradas variadas", () => {
    const amostras: unknown[] = [
      "  joao  da   silva ",
      "JOSE",
      "Ana Paula",
      null,
      "",
      "  ",
      "Ândre Brum",
    ];

    for (const amostra of amostras) {
      expect(normalizarNomeClienteImport(amostra)).toBe(normalizarNomeCliente(amostra));
    }
  });
});
