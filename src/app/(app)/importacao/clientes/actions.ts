"use server";

import { revalidarCliente } from "@/lib/revalidacao";
import { prisma } from "@/lib/db";
import { requireAdminOrThrow } from "@/lib/guards";
import { createAuditLog } from "@/lib/audit";
import { ESTAGIOS_CRM } from "@/lib/crm";
import {
  parseCsvClientes,
  planejarImportacaoClientes,
  type ErroImportacaoCliente,
  type PlanoImportacaoClientes,
} from "@/lib/cliente-import";

/**
 * Dry-run: analisa o texto bruto do CSV contra a empresa parceira escolhida e
 * devolve o plano de importacao (criar/vincular/ignorar/erros) sem nenhuma
 * escrita no banco. As unicas chamadas de Prisma desta funcao sao leituras:
 * resolver a empresa pelo id (o nome nunca vem do navegador, T-09-07) e
 * listar os clientes existentes numa unica consulta (sem N+1).
 */
export async function analisarImportacaoClientes(
  texto: string,
  empresaParceiraId: number
): Promise<PlanoImportacaoClientes> {
  await requireAdminOrThrow();

  const empresa = await prisma.empresaParceira.findUnique({
    where: { id: empresaParceiraId },
    select: { id: true, nome: true },
  });

  if (!empresa) {
    return {
      criar: [],
      vincular: [],
      ignorar: [],
      erros: [{ linha: 0, motivo: "empresa_invalida", conteudo: "" }],
      resumo: { total: 1, criar: 0, vincular: 0, ignorar: 0, erros: 1 },
    };
  }

  const existentes = await prisma.cliente.findMany({
    select: { id: true, nome: true, cpf: true, empresaParceiraId: true },
  });

  const { linhas, erros: errosDeParse } = parseCsvClientes(texto);
  const plano = planejarImportacaoClientes(linhas, existentes, empresaParceiraId);

  return {
    ...plano,
    erros: [...errosDeParse, ...plano.erros],
    resumo: {
      ...plano.resumo,
      erros: plano.resumo.erros + errosDeParse.length,
      total: plano.resumo.total + errosDeParse.length,
    },
  };
}

export type ResultadoCommitClientes = {
  criados: number;
  vinculados: number;
  ignorados: number;
  erros: ErroImportacaoCliente[];
};

/**
 * Aplica a importacao. Recebe apenas o TEXTO BRUTO do arquivo e o id da
 * empresa (nunca um plano pronto vindo do navegador, T-09-06): resolve a
 * empresa pelo id no servidor (T-09-07), le os clientes existentes,
 * recalcula parseCsvClientes + planejarImportacaoClientes contra essa
 * leitura fresca, e so entao aplica a transacao. Itens de `ignorar` nao
 * geram nenhuma escrita — e isso que torna a segunda execucao do mesmo
 * arquivo inofensiva (INT-03, criterio central).
 */
export async function confirmarImportacaoClientes(
  texto: string,
  empresaParceiraId: number
): Promise<ResultadoCommitClientes> {
  await requireAdminOrThrow();

  const empresa = await prisma.empresaParceira.findUnique({
    where: { id: empresaParceiraId },
    select: { id: true, nome: true },
  });

  if (!empresa) {
    return {
      criados: 0,
      vinculados: 0,
      ignorados: 0,
      erros: [{ linha: 0, motivo: "empresa_invalida", conteudo: "" }],
    };
  }

  const existentes = await prisma.cliente.findMany({
    select: { id: true, nome: true, cpf: true, empresaParceiraId: true },
  });

  const { linhas, erros: errosDeParse } = parseCsvClientes(texto);
  const plano = planejarImportacaoClientes(linhas, existentes, empresaParceiraId);

  let criados = 0;

  await prisma.$transaction(
    async (tx) => {
      if (plano.criar.length > 0) {
        const criacao = await tx.cliente.createMany({
          data: plano.criar.map((item) => ({
            nome: item.nome,
            cpf: item.cpf,
            telefone: item.telefone,
            matricula: item.matricula,
            email: item.email,
            tipo: "PF",
            empresa: empresa.nome,
            empresaParceiraId,
            estagioCrm: ESTAGIOS_CRM.NOVO_LEAD,
            origem: "import_funcionarios",
          })),
          skipDuplicates: true,
        });
        criados = criacao.count;
      }

      for (const item of plano.vincular) {
        await tx.cliente.update({
          where: { id: item.id as number },
          data: {
            empresaParceiraId,
            empresa: empresa.nome,
            matricula: item.matricula ?? undefined,
            telefone: item.telefone ?? undefined,
          },
        });
      }
    },
    { timeout: 30_000 }
  );

  const resultado: ResultadoCommitClientes = {
    criados,
    vinculados: plano.vincular.length,
    ignorados: plano.ignorar.length,
    erros: [...errosDeParse, ...plano.erros],
  };

  await createAuditLog("cliente:import", {
    empresaParceiraId,
    criados: resultado.criados,
    vinculados: resultado.vinculados,
    ignorados: resultado.ignorados,
  });

  revalidarCliente();

  return resultado;
}
