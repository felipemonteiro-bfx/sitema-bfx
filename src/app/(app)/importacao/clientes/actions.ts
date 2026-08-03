"use server";

import { prisma } from "@/lib/db";
import { requireAdminOrThrow } from "@/lib/guards";
import {
  parseCsvClientes,
  planejarImportacaoClientes,
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
