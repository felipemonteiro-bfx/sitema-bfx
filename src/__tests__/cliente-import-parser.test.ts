import { describe, it, expect } from "vitest";
import {
  parseCsvClientes,
  planejarImportacaoClientes,
  chaveDoCliente,
  type ClienteExistente,
} from "@/lib/cliente-import";

describe("parseCsvClientes", () => {
  it("Teste 1: cabecalho nome;cpf;telefone;matricula;email + 2 linhas vira 2 linhas normalizadas, numero de linha base 1 contando o cabecalho, 0 erros", () => {
    const csv =
      "nome;cpf;telefone;matricula;email\n" +
      "Maria da Silva;123.456.789-09;92999990000;12345;maria@exemplo.com\n" +
      "joao  souza;;;;\n";
    const resultado = parseCsvClientes(csv);

    expect(resultado.erros).toHaveLength(0);
    expect(resultado.linhas).toHaveLength(2);
    expect(resultado.linhas[0]).toEqual({
      linha: 2,
      nome: "MARIA DA SILVA",
      cpf: "12345678909",
      telefone: "92999990000",
      matricula: "12345",
      email: "maria@exemplo.com",
    });
    expect(resultado.linhas[1]).toEqual({
      linha: 3,
      nome: "JOAO SOUZA",
      cpf: null,
      telefone: null,
      matricula: null,
      email: null,
    });
  });
});

describe("chaveDoCliente (D-04)", () => {
  it("Teste 2: devolve tipo cpf quando ha CPF (so digitos) e tipo nome quando a celula de CPF vem vazia", () => {
    const comCpf = chaveDoCliente({ nome: "MARIA DA SILVA", cpf: "12345678909" });
    expect(comCpf).toEqual({ tipo: "cpf", valor: "12345678909" });

    const semCpf = chaveDoCliente({ nome: "JOAO SOUZA", cpf: null });
    expect(semCpf).toEqual({ tipo: "nome", valor: "JOAO SOUZA" });
  });
});

describe("planejarImportacaoClientes", () => {
  const csv =
    "nome;cpf;telefone;matricula;email\n" +
    "Maria da Silva;123.456.789-09;92999990000;12345;maria@exemplo.com\n" +
    "joao  souza;;;;\n";
  const { linhas } = parseCsvClientes(csv);

  it("Teste 3: existentes vazio classifica tudo em criar e resumo bate com o tamanho dos baldes", () => {
    const plano = planejarImportacaoClientes(linhas, [], 3);

    expect(plano.criar).toHaveLength(2);
    expect(plano.vincular).toHaveLength(0);
    expect(plano.ignorar).toHaveLength(0);
    expect(plano.erros).toHaveLength(0);
    expect(plano.resumo).toEqual({ total: 2, criar: 2, vincular: 0, ignorar: 0, erros: 0 });
  });

  it("Teste 4 (idempotencia por CPF): existente com o mesmo CPF ja vinculado a empresa escolhida cai em ignorar", () => {
    const existentes: ClienteExistente[] = [
      { id: 7, nome: "MARIA DA SILVA", cpf: "12345678909", empresaParceiraId: 3 },
    ];
    const plano = planejarImportacaoClientes(linhas, existentes, 3);

    const ignoradoMaria = plano.ignorar.find((i) => i.id === 7);
    expect(ignoradoMaria).toBeDefined();
    expect(ignoradoMaria?.motivo).toBe("ja_vinculado");
  });

  it("Teste 5 (D-05): existente com o mesmo CPF e empresaParceiraId nulo cai em vincular carregando o id", () => {
    const existentes: ClienteExistente[] = [
      { id: 7, nome: "MARIA DA SILVA", cpf: "12345678909", empresaParceiraId: null },
    ];
    const plano = planejarImportacaoClientes(linhas, existentes, 3);

    expect(plano.vincular).toHaveLength(1);
    expect(plano.vincular[0].id).toBe(7);
    expect(plano.vincular[0].motivo).toBe("sem_empresa");
  });

  it("Teste 6 (D-05, nao roubar): existente ja vinculado a outra empresa parceira cai em ignorar, nunca em vincular", () => {
    const existentes: ClienteExistente[] = [
      { id: 7, nome: "MARIA DA SILVA", cpf: "12345678909", empresaParceiraId: 99 },
    ];
    const plano = planejarImportacaoClientes(linhas, existentes, 3);

    expect(plano.vincular).toHaveLength(0);
    const ignoradoMaria = plano.ignorar.find((i) => i.id === 7);
    expect(ignoradoMaria).toBeDefined();
    expect(ignoradoMaria?.motivo).toBe("vinculado_a_outra_empresa");
  });

  it("Teste 7 (D-04, fallback): linha sem CPF casa por nome normalizado com o existente correspondente", () => {
    const existentes: ClienteExistente[] = [
      { id: 9, nome: "JOAO SOUZA", cpf: null, empresaParceiraId: null },
    ];
    const plano = planejarImportacaoClientes(linhas, existentes, 3);

    expect(plano.vincular).toHaveLength(1);
    expect(plano.vincular[0].id).toBe(9);
  });

  it("Teste 8: resumo.total e a soma de criar + vincular + ignorar + erros", () => {
    const existentes: ClienteExistente[] = [
      { id: 7, nome: "MARIA DA SILVA", cpf: "12345678909", empresaParceiraId: 3 },
      { id: 9, nome: "JOAO SOUZA", cpf: null, empresaParceiraId: null },
    ];
    const plano = planejarImportacaoClientes(linhas, existentes, 3);

    const soma = plano.criar.length + plano.vincular.length + plano.ignorar.length + plano.erros.length;
    expect(plano.resumo.total).toBe(soma);
  });
});
