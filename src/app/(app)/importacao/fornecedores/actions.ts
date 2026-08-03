"use server";

import { prisma } from "@/lib/db";
import { requireAdminOrThrow } from "@/lib/guards";
import {
  parseCsvFornecedores,
  planejarImportacaoFornecedores,
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
