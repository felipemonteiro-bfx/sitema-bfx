import { normalizarNomeClienteImport } from "@/lib/cliente-import";
import type { LinhaConsignado } from "@/lib/consignado-parse";
import { ESTAGIOS_CRM } from "@/lib/crm";

export const ORIGEM_IMPORT_CONSIGNADO = "import_consignado" as const;

export type ClienteExistenteConsignado = {
  id: number;
  nome: string;
  cpf: string | null;
  matricula: string | null;
  renda: number | null;
  empresa: string | null;
  empresaParceiraId: number | null;
  estagioCrm: string | null;
  origem: string | null;
};

export type ContratoExistenteConsignado = {
  id: number;
  ifConcessoraCodigo: string;
  contrato: string;
};

export type EmpresaExistenteConsignado = {
  id: number;
  nome: string;
  cnpj: string | null;
};

export type PreencherCliente = {
  cpf?: string;
  matricula?: string;
  empresa?: string;
  empresaParceiraId?: number;
  nome?: string;
  renda?: number;
  estagioCrm?: string;
};

export type PlanoContratoConsignado = {
  linha: LinhaConsignado;
  acaoContrato: "criar" | "atualizar";
  contratoId?: number;
  empresaParceiraId: number | null;
  cliente:
    | {
        acao: "casar";
        clienteId: number;
        preencher: PreencherCliente;
        avisos: string[];
      }
    | {
        acao: "lead";
        lead: {
          nome: string;
          cpf: string | null;
          matricula: string | null;
          empresa: string | null;
          empresaParceiraId: number | null;
          origem: typeof ORIGEM_IMPORT_CONSIGNADO;
          estagioCrm: typeof ESTAGIOS_CRM.NOVO_LEAD;
          renda: null;
        };
        avisos: string[];
      };
};

export type PlanoImportacaoConsignado = {
  contratos: PlanoContratoConsignado[];
  apagarContratoIds: number[];
  avisos: { linha: number; motivo: string }[];
  erros: { linha: number; motivo: string; conteudo: string }[];
  resumo: {
    contratosNovos: number;
    contratosAtualizados: number;
    clientesCasados: number;
    leadsCriar: number;
    erros: number;
  };
};

function soDigitos(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const d = valor
    .split("")
    .filter((c) => c >= "0" && c <= "9")
    .join("");
  return d.length > 0 ? d : null;
}

function casarEmpresa(
  linha: LinhaConsignado,
  empresas: EmpresaExistenteConsignado[],
): number | null {
  const alvo =
    soDigitos(linha.numeroInscricaoEstabelecimento) ?? soDigitos(linha.numeroInscricaoEmpregador);
  if (!alvo) return null;
  const achada = empresas.find((e) => soDigitos(e.cnpj) === alvo);
  return achada?.id ?? null;
}

function casarCliente(
  linha: LinhaConsignado,
  clientes: ClienteExistenteConsignado[],
  empresaParceiraId: number | null,
): { cliente: ClienteExistenteConsignado; avisos: string[] } | null {
  const cpf = linha.cpf;
  if (cpf) {
    const mesmos = clientes.filter((c) => soDigitos(c.cpf) === cpf).sort((a, b) => a.id - b.id);
    if (mesmos.length > 0) {
      return {
        cliente: mesmos[0],
        avisos: mesmos.length > 1 ? ["cpf_duplicado"] : [],
      };
    }
  }
  if (linha.matricula && empresaParceiraId != null) {
    const porMat = clientes
      .filter((c) => c.matricula === linha.matricula && c.empresaParceiraId === empresaParceiraId)
      .sort((a, b) => a.id - b.id);
    if (porMat.length > 0) return { cliente: porMat[0], avisos: [] };
  }
  return null;
}

function preencherVazios(
  existente: ClienteExistenteConsignado,
  linha: LinhaConsignado,
  empresaParceiraId: number | null,
): PreencherCliente {
  const preencher: PreencherCliente = {};
  if (!existente.cpf && linha.cpf) preencher.cpf = linha.cpf;
  if (!existente.matricula && linha.matricula) preencher.matricula = linha.matricula;
  if (!existente.empresa && linha.nomeEmpregador) preencher.empresa = linha.nomeEmpregador;
  if (!existente.empresaParceiraId && empresaParceiraId) preencher.empresaParceiraId = empresaParceiraId;
  return preencher;
}

function nomeDoLead(linha: LinhaConsignado, clientes: ClienteExistenteConsignado[]): string {
  const base = normalizarNomeClienteImport(linha.nomeTrabalhador) || "SEM NOME";
  const colide = clientes.some((c) => c.nome === base);
  if (!colide) return base;
  if (linha.cpf && linha.cpf.length >= 4) return `${base} (${linha.cpf.slice(-4)})`;
  throw Object.assign(new Error("nome duplicado sem CPF para desambiguar"), { motivo: "nome_duplicado" });
}

export function planejarImportacaoConsignado(input: {
  linhas: LinhaConsignado[];
  clientes: ClienteExistenteConsignado[];
  empresas: EmpresaExistenteConsignado[];
  contratos: ContratoExistenteConsignado[];
}): PlanoImportacaoConsignado {
  const porChave = new Map(
    input.contratos.map((c) => [`${c.ifConcessoraCodigo}\0${c.contrato}`, c] as const),
  );
  const contratos: PlanoContratoConsignado[] = [];
  const erros: PlanoImportacaoConsignado["erros"] = [];
  const avisos: PlanoImportacaoConsignado["avisos"] = [];
  const casados = new Set<number>();
  const leadsCpf = new Set<string>();
  let leadsSemCpf = 0;

  for (const linha of input.linhas) {
    const empresaParceiraId = casarEmpresa(linha, input.empresas);
    const existenteContrato = porChave.get(`${linha.ifConcessoraCodigo}\0${linha.contrato}`);
    try {
      const match = casarCliente(linha, input.clientes, empresaParceiraId);
      const cliente: PlanoContratoConsignado["cliente"] = match
        ? {
            acao: "casar" as const,
            clienteId: match.cliente.id,
            preencher: preencherVazios(match.cliente, linha, empresaParceiraId),
            avisos: match.avisos,
          }
        : {
            acao: "lead" as const,
            lead: {
              nome: nomeDoLead(linha, input.clientes),
              cpf: linha.cpf,
              matricula: linha.matricula,
              empresa: linha.nomeEmpregador,
              empresaParceiraId,
              origem: ORIGEM_IMPORT_CONSIGNADO,
              estagioCrm: ESTAGIOS_CRM.NOVO_LEAD,
              renda: null,
            },
            avisos: [] as string[],
          };
      if (cliente.acao === "casar") casados.add(cliente.clienteId);
      else if (cliente.lead.cpf) leadsCpf.add(cliente.lead.cpf);
      else leadsSemCpf += 1;
      if (cliente.acao === "casar") {
        for (const a of cliente.avisos) avisos.push({ linha: linha.linha, motivo: a });
      }
      contratos.push({
        linha,
        acaoContrato: existenteContrato ? "atualizar" : "criar",
        contratoId: existenteContrato?.id,
        empresaParceiraId,
        cliente,
      });
    } catch (e) {
      const motivo = (e as { motivo?: string }).motivo ?? "erro";
      erros.push({ linha: linha.linha, motivo, conteudo: linha.nomeTrabalhador });
    }
  }

  return {
    contratos,
    apagarContratoIds: [],
    avisos,
    erros,
    resumo: {
      contratosNovos: contratos.filter((c) => c.acaoContrato === "criar").length,
      contratosAtualizados: contratos.filter((c) => c.acaoContrato === "atualizar").length,
      clientesCasados: casados.size,
      leadsCriar: leadsCpf.size + leadsSemCpf,
      erros: erros.length,
    },
  };
}
