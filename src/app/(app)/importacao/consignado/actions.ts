"use server";

import { prisma } from "@/lib/db";
import { requireAdminOrThrow } from "@/lib/guards";
import { createAuditLog } from "@/lib/audit";
import { revalidarCliente } from "@/lib/revalidacao";
import {
  ArquivoConsignadoInvalido,
  parseArquivoConsignado,
  type ResultadoParseConsignado,
} from "@/lib/consignado-parse";
import {
  planejarImportacaoConsignado,
  type PlanoImportacaoConsignado,
} from "@/lib/consignado-import";
import { aplicarImportacaoConsignado } from "@/lib/consignado-db";

export type ResultadoAnaliseConsignado = PlanoImportacaoConsignado & {
  parse: { erros: ResultadoParseConsignado["erros"]; avisos: ResultadoParseConsignado["avisos"] };
};

export type ResultadoCommitConsignado = {
  contratos: number;
  clientesCasados: number;
  leadsCriar: number;
  erros: { linha: number; motivo: string; conteudo: string }[];
};

async function lerArquivo(formData: FormData) {
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    throw new ArquivoConsignadoInvalido("Selecione um arquivo .xlsx ou .csv.");
  }
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  return parseArquivoConsignado(arquivo.name, bytes);
}

async function montarPlano(parse: ResultadoParseConsignado): Promise<ResultadoAnaliseConsignado> {
  const [clientes, empresas, contratos] = await Promise.all([
    prisma.cliente.findMany({
      select: {
        id: true,
        nome: true,
        cpf: true,
        matricula: true,
        renda: true,
        empresa: true,
        empresaParceiraId: true,
        estagioCrm: true,
        origem: true,
      },
    }),
    prisma.empresaParceira.findMany({ select: { id: true, nome: true, cnpj: true } }),
    prisma.contratoConsignado.findMany({
      select: { id: true, ifConcessoraCodigo: true, contrato: true },
    }),
  ]);
  const plano = planejarImportacaoConsignado({
    linhas: parse.linhas,
    clientes,
    empresas,
    contratos,
  });
  return {
    ...plano,
    parse: { erros: parse.erros, avisos: parse.avisos },
    erros: [...parse.erros, ...plano.erros],
    resumo: { ...plano.resumo, erros: parse.erros.length + plano.resumo.erros },
  };
}

export async function analisarImportacaoConsignado(
  formData: FormData,
): Promise<ResultadoAnaliseConsignado | { erro: string }> {
  await requireAdminOrThrow();
  try {
    const parse = await lerArquivo(formData);
    return montarPlano(parse);
  } catch (e) {
    const msg = e instanceof ArquivoConsignadoInvalido ? e.message : "Falha ao ler o arquivo.";
    return { erro: msg };
  }
}

export async function confirmarImportacaoConsignado(
  formData: FormData,
): Promise<ResultadoCommitConsignado | { erro: string }> {
  await requireAdminOrThrow();
  try {
    const parse = await lerArquivo(formData);
    const plano = await montarPlano(parse);
    const resultado = await aplicarImportacaoConsignado(plano);
    await createAuditLog("consignado:import", {
      contratos: resultado.contratos,
      leads: resultado.leadsCriar,
    });
    revalidarCliente();
    return resultado;
  } catch (e) {
    const msg = e instanceof ArquivoConsignadoInvalido ? e.message : "Falha ao gravar a importação.";
    return { erro: msg };
  }
}
