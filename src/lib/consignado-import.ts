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
        /** Identidade do lead no arquivo: linhas com a mesma chave criam um lead só. */
        chave: string;
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

type LeadConsignado = Extract<PlanoContratoConsignado["cliente"], { acao: "lead" }>["lead"];

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

/**
 * CPF identifica o trabalhador; sem CPF, matrícula dentro do empregador — a empresa
 * parceira quando casou, senão o CNPJ que veio na linha. Sem o CNPJ, a mesma matrícula
 * em dois empregadores não cadastrados viraria um lead só.
 */
function chaveLead(linha: LinhaConsignado, empresaParceiraId: number | null): string {
  if (linha.cpf) return `cpf:${linha.cpf}`;
  const empregador =
    empresaParceiraId != null
      ? String(empresaParceiraId)
      : `cnpj:${linha.numeroInscricaoEstabelecimento ?? linha.numeroInscricaoEmpregador ?? ""}`;
  return `mat:${linha.matricula ?? ""}|${empregador}`;
}

/**
 * Chave de unicidade do nome igual à do banco: há um índice único em
 * `f_unaccent(upper(nome))`, então "JOSÉ" e "JOSE" colidem mesmo sendo textos diferentes.
 */
function chaveNome(nome: string): string {
  return nome
    .normalize("NFD")
    .split("")
    .filter((c) => c < "̀" || c > "ͯ")
    .join("")
    .toLocaleUpperCase("pt-BR");
}

function erroNomeDuplicado(): Error {
  return Object.assign(new Error("nome duplicado sem CPF para desambiguar"), { motivo: "nome_duplicado" });
}

/**
 * `Cliente.nome` é único. O nome do lead não pode repetir um cliente cadastrado nem
 * outro lead do mesmo arquivo — sem isso o segundo `create` quebra no meio da gravação.
 */
function nomeDoLead(
  linha: LinhaConsignado,
  nomesClientes: Set<string>,
  nomesReservados: Set<string>,
): string {
  const base = normalizarNomeClienteImport(linha.nomeTrabalhador) || "SEM NOME";
  const ocupado = (nome: string) => {
    const chave = chaveNome(nome);
    return nomesReservados.has(chave) || nomesClientes.has(chave);
  };
  if (!ocupado(base)) return base;
  if (!linha.cpf || linha.cpf.length < 4) throw erroNomeDuplicado();
  const comSufixo = `${base} (${linha.cpf.slice(-4)})`;
  if (ocupado(comSufixo)) throw erroNomeDuplicado();
  return comSufixo;
}

const DESCRICAO_MOTIVO: Record<string, string> = {
  sem_financeira: "Sem o código da financeira (ifConcessora.codigo).",
  sem_contrato: "Sem o número do contrato.",
  sem_cpf_nem_matricula: "Sem CPF e sem matrícula: não dá para identificar o trabalhador.",
  valor_parcela_invalido: "Valor da parcela vazio ou não numérico.",
  competencia_invalida: "Competência de desconto fora do formato MM/AAAA.",
  nome_duplicado: "Nome já usado por outro cadastro ou trabalhador do arquivo, e não deu para diferenciar pelo CPF.",
  erro: "Não foi possível processar a linha.",
};

export function descreverMotivoConsignado(motivo: string): string {
  return DESCRICAO_MOTIVO[motivo] ?? `Linha recusada: ${motivo}.`;
}

export function descreverAvisoConsignado(aviso: {
  linha: number;
  motivo: string;
  substituidaPor?: number;
}): string {
  if (aviso.motivo === "duplicata_substituida") {
    return `Linha ${aviso.linha} substituída pela linha ${aviso.substituidaPor} (mesmo contrato na mesma financeira).`;
  }
  if (aviso.motivo === "cpf_duplicado") {
    return `Linha ${aviso.linha}: o CPF está em mais de um cadastro; o contrato foi ligado ao mais antigo.`;
  }
  return `Linha ${aviso.linha}: ${aviso.motivo}.`;
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
  const leadsPorChave = new Map<string, LeadConsignado>();
  const nomesReservados = new Set<string>();
  const nomesClientes = new Set(input.clientes.map((c) => chaveNome(c.nome)));

  for (const linha of input.linhas) {
    const empresaParceiraId = casarEmpresa(linha, input.empresas);
    const existenteContrato = porChave.get(`${linha.ifConcessoraCodigo}\0${linha.contrato}`);
    try {
      const match = casarCliente(linha, input.clientes, empresaParceiraId);
      let cliente: PlanoContratoConsignado["cliente"];
      if (match) {
        cliente = {
          acao: "casar",
          clienteId: match.cliente.id,
          preencher: preencherVazios(match.cliente, linha, empresaParceiraId),
          avisos: match.avisos,
        };
      } else {
        const chave = chaveLead(linha, empresaParceiraId);
        let lead = leadsPorChave.get(chave);
        if (!lead) {
          lead = {
            nome: nomeDoLead(linha, nomesClientes, nomesReservados),
            cpf: linha.cpf,
            matricula: linha.matricula,
            empresa: linha.nomeEmpregador,
            empresaParceiraId,
            origem: ORIGEM_IMPORT_CONSIGNADO,
            estagioCrm: ESTAGIOS_CRM.NOVO_LEAD,
            renda: null,
          };
          leadsPorChave.set(chave, lead);
          nomesReservados.add(chaveNome(lead.nome));
        }
        cliente = { acao: "lead", chave, lead, avisos: [] };
      }
      if (cliente.acao === "casar") {
        casados.add(cliente.clienteId);
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
      leadsCriar: leadsPorChave.size,
      erros: erros.length,
    },
  };
}
