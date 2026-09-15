import { describe, it, expect } from "vitest";
import type { LinhaConsignado } from "@/lib/consignado-parse";
import {
  planejarImportacaoConsignado,
  type ClienteExistenteConsignado,
  type ContratoExistenteConsignado,
  type EmpresaExistenteConsignado,
} from "@/lib/consignado-import";

function linha(over: Partial<LinhaConsignado> = {}): LinhaConsignado {
  return {
    linha: 2,
    ifConcessoraCodigo: "001",
    ifConcessoraDescricao: "BRADESCO",
    contrato: "CTR-001",
    cpf: "52998224725",
    matricula: "1001",
    numeroInscricaoEmpregador: "01288370000139",
    nomeTrabalhador: "MARIA EVELINE SILVA",
    nomeEmpregador: "AMAZON FIVE LTDA",
    dataInicioContrato: "15/05/2026",
    dataFimContrato: "15/05/2032",
    competenciaInicioDesconto: "06/2026",
    competenciaFimDesconto: "05/2032",
    totalParcelas: 72,
    valorParcela: 150,
    valorEmprestimo: 8000,
    valorLiberado: 7900,
    qtdPagamentos: 3,
    qtdEscrituracoes: 3,
    categoriaTrabalhador: "101",
    competenciaArquivo: "09/2026",
    numeroInscricaoEstabelecimento: "01288370000139",
    dataAdmissao: "10/01/2020",
    ...over,
  };
}

const EMPRESA: EmpresaExistenteConsignado = {
  id: 3,
  nome: "AMAZON FIVE",
  cnpj: "01.288.370/0001-39",
};

describe("planejarImportacaoConsignado — upsert", () => {
  it("dois uploads do mesmo financeira+contrato viram 1 atualizacao; campos da segunda vencem", () => {
    const contratos: ContratoExistenteConsignado[] = [
      { id: 10, ifConcessoraCodigo: "001", contrato: "CTR-001" },
    ];
    const plano = planejarImportacaoConsignado({
      linhas: [linha({ valorParcela: 199.9, competenciaArquivo: "10/2026" })],
      clientes: [],
      empresas: [EMPRESA],
      contratos,
    });

    expect(plano.contratos).toHaveLength(1);
    expect(plano.contratos[0].acaoContrato).toBe("atualizar");
    expect(plano.contratos[0].linha.valorParcela).toBe(199.9);
    expect(plano.contratos[0].linha.competenciaArquivo).toBe("10/2026");
    expect(plano.resumo.contratosAtualizados).toBe(1);
    expect(plano.resumo.contratosNovos).toBe(0);
  });

  it("contrato presente so no primeiro arquivo nao entra no plano de apagar", () => {
    const contratos: ContratoExistenteConsignado[] = [
      { id: 10, ifConcessoraCodigo: "001", contrato: "CTR-001" },
      { id: 11, ifConcessoraCodigo: "104", contrato: "CEF-OLD" },
    ];
    const plano = planejarImportacaoConsignado({
      linhas: [linha()],
      clientes: [],
      empresas: [EMPRESA],
      contratos,
    });

    expect(plano.contratos.every((c) => c.linha.contrato !== "CEF-OLD")).toBe(true);
    expect(plano.apagarContratoIds).toEqual([]);
    expect(plano.resumo.contratosNovos).toBe(0);
    expect(plano.resumo.contratosAtualizados).toBe(1);
  });
});

describe("planejarImportacaoConsignado — casamento", () => {
  it("CPF conhecido casa o cliente e nao pede lead; nao marca overwrite de nome/renda/estagio", () => {
    const clientes: ClienteExistenteConsignado[] = [
      {
        id: 7,
        nome: "MARIA JA CADASTRADA",
        cpf: "52998224725",
        matricula: null,
        renda: 3000,
        empresa: "OUTRA",
        empresaParceiraId: 3,
        estagioCrm: "cliente",
        origem: "manual",
      },
    ];
    const plano = planejarImportacaoConsignado({
      linhas: [linha()],
      clientes,
      empresas: [EMPRESA],
      contratos: [],
    });

    expect(plano.contratos[0].cliente.acao).toBe("casar");
    expect(plano.contratos[0].cliente.clienteId).toBe(7);
    expect(plano.contratos[0].cliente.preencher.nome).toBeUndefined();
    expect(plano.contratos[0].cliente.preencher.renda).toBeUndefined();
    expect(plano.contratos[0].cliente.preencher.estagioCrm).toBeUndefined();
    expect(plano.contratos[0].cliente.preencher.matricula).toBe("1001");
    expect(plano.resumo.clientesCasados).toBe(1);
    expect(plano.resumo.leadsCriar).toBe(0);
  });

  it("dois clientes com o mesmo CPF usam o de menor id e avisam", () => {
    const clientes: ClienteExistenteConsignado[] = [
      {
        id: 20,
        nome: "MARIA B",
        cpf: "52998224725",
        matricula: null,
        renda: 1,
        empresa: null,
        empresaParceiraId: null,
        estagioCrm: "cliente",
        origem: "manual",
      },
      {
        id: 9,
        nome: "MARIA A",
        cpf: "52998224725",
        matricula: null,
        renda: 1,
        empresa: null,
        empresaParceiraId: null,
        estagioCrm: "cliente",
        origem: "manual",
      },
    ];
    const plano = planejarImportacaoConsignado({
      linhas: [linha()],
      clientes,
      empresas: [EMPRESA],
      contratos: [],
    });
    expect(plano.contratos[0].cliente.clienteId).toBe(9);
    expect(plano.contratos[0].cliente.avisos).toContain("cpf_duplicado");
  });

  it("CPF novo vira lead import_consignado sem renda", () => {
    const plano = planejarImportacaoConsignado({
      linhas: [linha({ cpf: "11144477735", nomeTrabalhador: "JOAO LEAD NOVO", contrato: "CEF-1" })],
      clientes: [],
      empresas: [EMPRESA],
      contratos: [],
    });

    expect(plano.contratos[0].cliente.acao).toBe("lead");
    expect(plano.contratos[0].cliente.lead).toMatchObject({
      origem: "import_consignado",
      estagioCrm: "novo_lead",
      renda: null,
      cpf: "11144477735",
    });
    expect(plano.resumo.leadsCriar).toBe(1);
  });

  it("cliente existente com CPF vazio e match por matricula+empresa preenche so o CPF", () => {
    const clientes: ClienteExistenteConsignado[] = [
      {
        id: 4,
        nome: "MARIA EVELINE SILVA",
        cpf: null,
        matricula: "1001",
        renda: 2500,
        empresa: "AMAZON FIVE",
        empresaParceiraId: 3,
        estagioCrm: "cliente",
        origem: "import_funcionarios",
      },
    ];
    const plano = planejarImportacaoConsignado({
      linhas: [linha({ cpf: "52998224725" })],
      clientes,
      empresas: [EMPRESA],
      contratos: [],
    });

    expect(plano.contratos[0].cliente.acao).toBe("casar");
    expect(plano.contratos[0].cliente.clienteId).toBe(4);
    expect(plano.contratos[0].cliente.preencher).toEqual({ cpf: "52998224725" });
  });

  it("CNPJ desconhecido deixa empresaParceiraId null", () => {
    const plano = planejarImportacaoConsignado({
      linhas: [linha()],
      clientes: [],
      empresas: [{ id: 1, nome: "OUTRA", cnpj: "00000000000000" }],
      contratos: [],
    });
    expect(plano.contratos[0].empresaParceiraId).toBeNull();
  });
});
