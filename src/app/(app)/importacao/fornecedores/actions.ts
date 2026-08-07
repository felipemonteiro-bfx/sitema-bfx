"use server";

import { revalidarFornecedor } from "@/lib/revalidacao";
import { prisma } from "@/lib/db";
import { requireAdminOrThrow } from "@/lib/guards";
import { createAuditLog } from "@/lib/audit";
import {
  parseCsvFornecedores,
  planejarImportacaoFornecedores,
  type ErroImportacao,
  type PlanoImportacao,
} from "@/lib/fornecedor-import";

/**
 * Dry-run: analisa o texto bruto do CSV e devolve o plano de importacao
 * (criar/reativar/ignorar/erros) sem nenhuma escrita no banco. A unica
 * chamada de Prisma desta funcao e uma leitura de fornecedores (inclusive
 * soft-deletados, para o plano poder reativa-los).
 */
export async function analisarImportacaoFornecedores(texto: string): Promise<PlanoImportacao> {
  await requireAdminOrThrow();

  const existentes = await prisma.fornecedor.findMany({
    select: { id: true, nome: true, deletedAt: true },
  });

  const { linhas, erros: errosDeParse } = parseCsvFornecedores(texto);
  const plano = planejarImportacaoFornecedores(linhas, existentes);

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

export type ResultadoCommit = {
  criados: number;
  reativados: number;
  ignorados: number;
  erros: ErroImportacao[];
};

/**
 * Aplica a importacao. Recebe apenas o TEXTO BRUTO do arquivo (nunca um plano
 * pronto vindo do navegador, T-06-05): le os fornecedores existentes,
 * recalcula parseCsvFornecedores + planejarImportacaoFornecedores no
 * servidor, e so entao aplica a transacao. Itens de `ignorar` nao geram
 * nenhuma escrita — e isso que torna a segunda execucao do mesmo arquivo
 * inofensiva (D-01).
 */
export async function confirmarImportacaoFornecedores(texto: string): Promise<ResultadoCommit> {
  await requireAdminOrThrow();

  const existentes = await prisma.fornecedor.findMany({
    select: { id: true, nome: true, deletedAt: true },
  });

  const { linhas, erros: errosDeParse } = parseCsvFornecedores(texto);
  const plano = planejarImportacaoFornecedores(linhas, existentes);

  await prisma.$transaction(async (tx) => {
    for (const item of plano.criar) {
      await tx.fornecedor.create({ data: { nome: item.nome, telefone: item.telefone } });
    }
    for (const item of plano.reativar) {
      await tx.fornecedor.update({
        where: { id: item.id as number },
        data: { deletedAt: null, telefone: item.telefone },
      });
    }
  });

  const resultado = {
    criados: plano.criar.length,
    reativados: plano.reativar.length,
    ignorados: plano.ignorar.length,
    erros: [...errosDeParse, ...plano.erros],
  };

  await createAuditLog("fornecedor:import", {
    criados: resultado.criados,
    reativados: resultado.reativados,
    ignorados: resultado.ignorados,
  });

  revalidarFornecedor();

  return resultado;
}
