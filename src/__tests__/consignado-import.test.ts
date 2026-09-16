import { describe, it, expect } from "vitest";
import type { LinhaConsignado } from "@/lib/consignado-parse";
import {
  descreverAvisoConsignado,
  descreverMotivoConsignado,
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

    const casado = plano.contratos[0].cliente;
    expect(casado.acao).toBe("casar");
    if (casado.acao !== "casar") throw new Error("esperado casar");
    expect(casado.clienteId).toBe(7);
    expect(casado.preencher.nome).toBeUndefined();
    expect(casado.preencher.renda).toBeUndefined();
    expect(casado.preencher.estagioCrm).toBeUndefined();
    expect(casado.preencher.matricula).toBe("1001");
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
    const casado = plano.contratos[0].cliente;
    if (casado.acao !== "casar") throw new Error("esperado casar");
    expect(casado.clienteId).toBe(9);
    expect(casado.avisos).toContain("cpf_duplicado");
  });

  it("CPF novo vira lead import_consignado sem renda", () => {
    const plano = planejarImportacaoConsignado({
      linhas: [linha({ cpf: "11144477735", nomeTrabalhador: "JOAO LEAD NOVO", contrato: "CEF-1" })],
      clientes: [],
      empresas: [EMPRESA],
      contratos: [],
    });

    const lead = plano.contratos[0].cliente;
    expect(lead.acao).toBe("lead");
    if (lead.acao !== "lead") throw new Error("esperado lead");
    expect(lead.lead).toMatchObject({
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

    const casado = plano.contratos[0].cliente;
    expect(casado.acao).toBe("casar");
    if (casado.acao !== "casar") throw new Error("esperado casar");
    expect(casado.clienteId).toBe(4);
    expect(casado.preencher).toEqual({ cpf: "52998224725" });
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

describe("planejarImportacaoConsignado — nome de lead dentro do mesmo arquivo", () => {
  it("dois CPFs novos com o mesmo nome: o segundo lead recebe sufixo com os 4 ultimos digitos", () => {
    const plano = planejarImportacaoConsignado({
      linhas: [
        linha({ linha: 2, cpf: "11144477735", nomeTrabalhador: "JOSE DA SILVA", contrato: "A-1" }),
        linha({ linha: 3, cpf: "52998224725", nomeTrabalhador: "JOSE DA SILVA", contrato: "A-2" }),
      ],
      clientes: [],
      empresas: [EMPRESA],
      contratos: [],
    });

    const nomes = plano.contratos.map((c) => (c.cliente.acao === "lead" ? c.cliente.lead.nome : null));
    expect(nomes).toEqual(["JOSE DA SILVA", "JOSE DA SILVA (4725)"]);
    expect(plano.erros).toEqual([]);
    expect(plano.resumo.leadsCriar).toBe(2);
  });

  it("o mesmo CPF novo em dois contratos e um lead so, com o mesmo nome e a mesma chave", () => {
    const plano = planejarImportacaoConsignado({
      linhas: [
        linha({ linha: 2, cpf: "11144477735", nomeTrabalhador: "ANA NOVA", contrato: "B-1" }),
        linha({ linha: 3, cpf: "11144477735", nomeTrabalhador: "ANA NOVA", contrato: "B-2" }),
      ],
      clientes: [],
      empresas: [EMPRESA],
      contratos: [],
    });

    const [a, b] = plano.contratos.map((c) => c.cliente);
    if (a.acao !== "lead" || b.acao !== "lead") throw new Error("esperado lead");
    expect(a.lead.nome).toBe("ANA NOVA");
    expect(b.lead.nome).toBe("ANA NOVA");
    expect(a.chave).toBe("cpf:11144477735");
    expect(a.chave).toBe(b.chave);
    expect(plano.resumo.leadsCriar).toBe(1);
  });

  it("sem CPF, com nome ja reservado por outro trabalhador do arquivo, a linha vira erro nome_duplicado", () => {
    const plano = planejarImportacaoConsignado({
      linhas: [
        linha({ linha: 2, cpf: "11144477735", matricula: "10", nomeTrabalhador: "PEDRO SOUZA", contrato: "C-1" }),
        linha({ linha: 3, cpf: null, matricula: "20", nomeTrabalhador: "PEDRO SOUZA", contrato: "C-2" }),
      ],
      clientes: [],
      empresas: [EMPRESA],
      contratos: [],
    });

    expect(plano.contratos).toHaveLength(1);
    expect(plano.erros).toEqual([{ linha: 3, motivo: "nome_duplicado", conteudo: "PEDRO SOUZA" }]);
  });

  it("sem CPF, a mesma matricula na mesma empresa em dois contratos e um lead so", () => {
    const plano = planejarImportacaoConsignado({
      linhas: [
        linha({ linha: 2, cpf: null, matricula: "77", nomeTrabalhador: "RITA SEM CPF", contrato: "D-1" }),
        linha({ linha: 3, cpf: null, matricula: "77", nomeTrabalhador: "RITA SEM CPF", contrato: "D-2" }),
      ],
      clientes: [],
      empresas: [EMPRESA],
      contratos: [],
    });

    expect(plano.erros).toEqual([]);
    const [a, b] = plano.contratos.map((c) => c.cliente);
    if (a.acao !== "lead" || b.acao !== "lead") throw new Error("esperado lead");
    expect(a.chave).toBe("mat:77|3");
    expect(a.chave).toBe(b.chave);
    expect(plano.resumo.leadsCriar).toBe(1);
  });
});

describe("planejarImportacaoConsignado — nome unico ignora acento (indice f_unaccent(upper(nome)))", () => {
  it("cliente cadastrado JOSÉ e lead novo JOSE com CPF: o lead recebe sufixo", () => {
    const plano = planejarImportacaoConsignado({
      linhas: [linha({ cpf: "11144477735", nomeTrabalhador: "JOSE DA SILVA", contrato: "E-1" })],
      clientes: [
        {
          id: 30,
          nome: "JOSÉ DA SILVA",
          cpf: null,
          matricula: null,
          renda: null,
          empresa: null,
          empresaParceiraId: null,
          estagioCrm: "cliente",
          origem: "manual",
        },
      ],
      empresas: [EMPRESA],
      contratos: [],
    });

    const cliente = plano.contratos[0].cliente;
    if (cliente.acao !== "lead") throw new Error("esperado lead");
    expect(cliente.lead.nome).toBe("JOSE DA SILVA (7735)");
  });

  it("dois leads novos JOSÉ e JOSE com CPFs diferentes no mesmo arquivo: o segundo recebe sufixo", () => {
    const plano = planejarImportacaoConsignado({
      linhas: [
        linha({ linha: 2, cpf: "11144477735", nomeTrabalhador: "JOSÉ DA SILVA", contrato: "F-1" }),
        linha({ linha: 3, cpf: "52998224725", nomeTrabalhador: "jose da silva", contrato: "F-2" }),
      ],
      clientes: [],
      empresas: [EMPRESA],
      contratos: [],
    });

    const nomes = plano.contratos.map((c) => (c.cliente.acao === "lead" ? c.cliente.lead.nome : null));
    expect(nomes[0]).toBe("JOSÉ DA SILVA");
    expect(nomes[1]).toBe("JOSE DA SILVA (4725)");
  });
});

describe("planejarImportacaoConsignado — chave do lead sem CPF e sem empresa parceira", () => {
  it("mesma matricula em empregadores diferentes nao cadastrados vira dois leads", () => {
    const plano = planejarImportacaoConsignado({
      linhas: [
        linha({
          linha: 2,
          cpf: null,
          matricula: "77",
          nomeTrabalhador: "ANA EMPREGADOR A",
          contrato: "G-1",
          numeroInscricaoEstabelecimento: "11111111000111",
          numeroInscricaoEmpregador: "11111111",
        }),
        linha({
          linha: 3,
          cpf: null,
          matricula: "77",
          nomeTrabalhador: "BIA EMPREGADOR B",
          contrato: "G-2",
          numeroInscricaoEstabelecimento: "22222222000122",
          numeroInscricaoEmpregador: "22222222",
        }),
      ],
      clientes: [],
      empresas: [EMPRESA],
      contratos: [],
    });

    const [a, b] = plano.contratos.map((c) => c.cliente);
    if (a.acao !== "lead" || b.acao !== "lead") throw new Error("esperado lead");
    expect(a.chave).not.toBe(b.chave);
    expect(plano.resumo.leadsCriar).toBe(2);
  });
});

describe("descreverMotivoConsignado / descreverAvisoConsignado", () => {
  it("nome_duplicado nao afirma que falta CPF (tambem ocorre com CPF e sufixo ocupado)", () => {
    expect(descreverMotivoConsignado("nome_duplicado").includes("não tem CPF")).toBe(false);
  });

  it("todo codigo de erro conhecido vira frase, sem o codigo cru", () => {
    const codigos = [
      "sem_financeira",
      "sem_contrato",
      "sem_cpf_nem_matricula",
      "valor_parcela_invalido",
      "competencia_invalida",
      "nome_duplicado",
      "erro",
    ];
    for (const c of codigos) {
      const texto = descreverMotivoConsignado(c);
      expect(texto.length).toBeGreaterThan(10);
      expect(texto.includes("_")).toBe(false);
      expect(texto.includes(c)).toBe(false);
    }
  });

  it("codigo desconhecido nao some: aparece com contexto", () => {
    expect(descreverMotivoConsignado("algo_novo")).toContain("algo_novo");
  });

  it("aviso de duplicata cita as duas linhas; CPF duplicado cita a linha", () => {
    expect(
      descreverAvisoConsignado({ linha: 8, motivo: "duplicata_substituida", substituidaPor: 41 }),
    ).toBe("Linha 8 substituída pela linha 41 (mesmo contrato na mesma financeira).");
    const cpf = descreverAvisoConsignado({ linha: 5, motivo: "cpf_duplicado" });
    expect(cpf.startsWith("Linha 5:")).toBe(true);
    expect(cpf.includes("_")).toBe(false);
  });
});
