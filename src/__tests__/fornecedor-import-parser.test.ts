import { describe, it, expect } from "vitest";
import {
  parseCsvFornecedores,
  planejarImportacaoFornecedores,
  type FornecedorExistente,
} from "@/lib/fornecedor-import";

describe("parseCsvFornecedores", () => {
  it("Teste 1: cabecalho nome;telefone + 2 linhas de dados vira 2 linhas normalizadas, numero de linha base 1 contando o cabecalho, 0 erros", () => {
    const csv = "nome;telefone\nAcme Distribuidora;92999990000\nbeta comercio;\n";
    const resultado = parseCsvFornecedores(csv);

    expect(resultado.erros).toHaveLength(0);
    expect(resultado.linhas).toHaveLength(2);
    expect(resultado.linhas[0]).toEqual({
      linha: 2,
      nome: "ACME DISTRIBUIDORA",
      telefone: "92999990000",
    });
    expect(resultado.linhas[1]).toEqual({
      linha: 3,
      nome: "BETA COMERCIO",
      telefone: null,
    });
  });
});

describe("planejarImportacaoFornecedores", () => {
  const csv = "nome;telefone\nAcme Distribuidora;92999990000\nbeta comercio;\n";
  const { linhas } = parseCsvFornecedores(csv);

  it("Teste 2: banco vazio classifica tudo em criar e resumo bate com o tamanho dos baldes", () => {
    const plano = planejarImportacaoFornecedores(linhas, []);

    expect(plano.criar).toHaveLength(2);
    expect(plano.reativar).toHaveLength(0);
    expect(plano.ignorar).toHaveLength(0);
    expect(plano.erros).toHaveLength(0);
    expect(plano.resumo).toEqual({ total: 2, criar: 2, reativar: 0, ignorar: 0, erros: 0 });
  });

  it("Teste 3: existente ativo de mesmo nome cai em ignorar (idempotencia)", () => {
    const existentes: FornecedorExistente[] = [
      { id: 7, nome: "ACME DISTRIBUIDORA", deletedAt: null },
    ];
    const plano = planejarImportacaoFornecedores(linhas, existentes);

    expect(plano.ignorar).toHaveLength(1);
    expect(plano.ignorar[0].id).toBe(7);
  });

  it("Teste 4: existente soft-deletado de mesmo nome cai em reativar carregando o id (D-03)", () => {
    const existentes: FornecedorExistente[] = [
      { id: 9, nome: "BETA COMERCIO", deletedAt: "2026-08-01T00:00:00.000Z" },
    ];
    const plano = planejarImportacaoFornecedores(linhas, existentes);

    expect(plano.reativar).toHaveLength(1);
    expect(plano.reativar[0].id).toBe(9);
  });

  it("Teste 5: resumo.total e sempre a soma de criar + reativar + ignorar + erros", () => {
    const existentes: FornecedorExistente[] = [
      { id: 7, nome: "ACME DISTRIBUIDORA", deletedAt: null },
      { id: 9, nome: "BETA COMERCIO", deletedAt: "2026-08-01T00:00:00.000Z" },
    ];
    const plano = planejarImportacaoFornecedores(linhas, existentes);

    const soma = plano.criar.length + plano.reativar.length + plano.ignorar.length + plano.erros.length;
    expect(plano.resumo.total).toBe(soma);
  });
});
