import { prisma } from "@/lib/db";
import {
  calcularConsignadoDeRegistros,
  mesRefConsignado,
  montarPayloadLimite,
  planejarRecalculoConsignado,
  type ResultadoConsignado,
} from "@/lib/consignado";
import type { PlanoImportacaoConsignado } from "@/lib/consignado-import";
import type { LinhaConsignado } from "@/lib/consignado-parse";
import { regraDaEmpresaNaData } from "@/lib/regra-empresa-db";

export async function calcularConsignado(
  clienteId: number,
  mesRef?: Date,
): Promise<ResultadoConsignado & { renda: number | null; nome: string | null }> {
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { renda: true, nome: true },
  });
  const [contratos, vendas] = await Promise.all([
    prisma.contratoConsignado.findMany({ where: { clienteId } }),
    prisma.venda.findMany({ where: { clienteId } }),
  ]);
  const r = calcularConsignadoDeRegistros({
    renda: cliente?.renda ?? null,
    contratos,
    vendasFolha: vendas,
    mesRef,
  });
  return { ...r, renda: cliente?.renda ?? null, nome: cliente?.nome ?? null };
}

export async function recalcularConsignado(clienteId: number) {
  const agora = new Date();
  const r = await calcularConsignado(clienteId, agora);
  await prisma.cliente.update({
    where: { id: clienteId },
    data: { pctConsignado: r.pct, faixaConsignado: r.faixa, consignadoMesRef: mesRefConsignado(agora) },
  });
  return r;
}

/**
 * Recalcula depois de uma venda ou importação já gravada. Falha aqui não pode
 * desfazer nem reportar como falha a operação principal: o cache se corrige no
 * próximo `recalcularConsignadoPendentes`.
 */
export async function recalcularConsignadoSeguro(clienteId: number | null | undefined) {
  if (!clienteId) return;
  try {
    await recalcularConsignado(clienteId);
  } catch (e) {
    console.error("[consignado] Falha ao recalcular faixa:", e);
  }
}

const LOTE_RECALCULO = 1000;

/**
 * Recalcula quem nunca teve a faixa calculada ou foi calculado em outro mês — a %
 * depende do mês corrente (contrato que termina, parcela BFX que começa). Cobre os
 * clientes anteriores à feature e os criados por caminhos que não recalculam.
 * Chamado no render de /cadastros: o primeiro acesso do mês paga o custo.
 */
export async function recalcularConsignadoPendentes(agora: Date = new Date()): Promise<number> {
  const mesRef = mesRefConsignado(agora);
  const filtroPendente = { OR: [{ consignadoMesRef: null }, { consignadoMesRef: { not: mesRef } }] };
  const pendentes = await prisma.cliente.findMany({
    where: filtroPendente,
    select: { id: true, renda: true },
  });

  for (let i = 0; i < pendentes.length; i += LOTE_RECALCULO) {
    const lote = pendentes.slice(i, i + LOTE_RECALCULO);
    const ids = lote.map((c) => c.id);
    const [contratos, vendas] = await Promise.all([
      prisma.contratoConsignado.findMany({
        where: { clienteId: { in: ids } },
        select: {
          clienteId: true,
          ifConcessoraCodigo: true,
          contrato: true,
          valorParcela: true,
          competenciaInicioDesconto: true,
          competenciaFimDesconto: true,
        },
      }),
      prisma.venda.findMany({
        where: {
          clienteId: { in: ids },
          status: { notIn: ["cancelada", "estornada"] },
          OR: [{ descontoEmFolha: true }, { formaPagamento: "DESCONTO_FOLHA" }],
        },
        select: {
          clienteId: true,
          dataVenda: true,
          parcelas: true,
          valorParcela: true,
          status: true,
          descontoEmFolha: true,
          formaPagamento: true,
        },
      }),
    ]);

    const grupos = planejarRecalculoConsignado({ clientes: lote, contratos, vendas, mesRef: agora });
    for (const grupo of grupos) {
      await prisma.cliente.updateMany({
        // Repete o filtro de pendente: quem foi recalculado por uma venda entre a leitura
        // acima e esta gravação já está no mês atual e não pode voltar ao valor velho.
        where: { id: { in: grupo.ids }, ...filtroPendente },
        data: { pctConsignado: grupo.pct, faixaConsignado: grupo.faixa, consignadoMesRef: mesRef },
      });
    }
  }
  return pendentes.length;
}

function dadosContrato(
  linha: LinhaConsignado,
  clienteId: number,
  empresaParceiraId: number | null,
) {
  return {
    ifConcessoraCodigo: linha.ifConcessoraCodigo,
    contrato: linha.contrato,
    ifConcessoraDescricao: linha.ifConcessoraDescricao,
    cpf: linha.cpf ?? "",
    matricula: linha.matricula,
    nomeTrabalhador: linha.nomeTrabalhador,
    nomeEmpregador: linha.nomeEmpregador,
    numeroInscricaoEmpregador: linha.numeroInscricaoEmpregador,
    numeroInscricaoEstabelecimento: linha.numeroInscricaoEstabelecimento,
    competenciaInicioDesconto: linha.competenciaInicioDesconto,
    competenciaFimDesconto: linha.competenciaFimDesconto,
    valorParcela: linha.valorParcela,
    totalParcelas: linha.totalParcelas,
    valorEmprestimo: linha.valorEmprestimo,
    valorLiberado: linha.valorLiberado,
    dataInicioContrato: linha.dataInicioContrato,
    dataFimContrato: linha.dataFimContrato,
    dataAdmissao: linha.dataAdmissao,
    categoriaTrabalhador: linha.categoriaTrabalhador,
    competenciaArquivo: linha.competenciaArquivo,
    clienteId,
    empresaParceiraId,
  };
}

export async function aplicarImportacaoConsignado(plano: PlanoImportacaoConsignado) {
  // Tudo ou nada: uma falha no meio (ex.: nome único) não pode deixar metade dos
  // leads e contratos gravados. O timeout padrão (5 s) não cobre um arquivo grande.
  const clienteIds = await prisma.$transaction(
    async (tx) => {
      const tocados = new Set<number>();
      const leadPorChave = new Map<string, number>();

      for (const item of plano.contratos) {
        let clienteId: number;
        if (item.cliente.acao === "casar") {
          clienteId = item.cliente.clienteId;
          const preencher = item.cliente.preencher;
          if (Object.keys(preencher).length > 0) {
            await tx.cliente.update({ where: { id: clienteId }, data: preencher });
          }
        } else {
          const existente = leadPorChave.get(item.cliente.chave);
          if (existente != null) {
            clienteId = existente;
          } else {
            const criado = await tx.cliente.create({ data: item.cliente.lead });
            clienteId = criado.id;
            leadPorChave.set(item.cliente.chave, clienteId);
          }
        }
        tocados.add(clienteId);
        const data = dadosContrato(item.linha, clienteId, item.empresaParceiraId);
        await tx.contratoConsignado.upsert({
          where: {
            ifConcessoraCodigo_contrato: {
              ifConcessoraCodigo: item.linha.ifConcessoraCodigo,
              contrato: item.linha.contrato,
            },
          },
          create: data,
          update: data,
        });
      }
      return tocados;
    },
    { maxWait: 10_000, timeout: 120_000 },
  );

  for (const id of clienteIds) {
    await recalcularConsignadoSeguro(id);
  }

  return {
    contratos: plano.contratos.length,
    clientesCasados: plano.resumo.clientesCasados,
    leadsCriar: plano.resumo.leadsCriar,
    erros: plano.erros,
  };
}

export async function payloadLimiteCliente(clienteId: number) {
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { renda: true, nome: true, empresaParceiraId: true },
  });
  if (!cliente) return null;
  const vendas = await prisma.venda.findMany({ where: { clienteId } });
  const consignado = await calcularConsignado(clienteId);
  // Corte e vencimento da regra da empresa vigente hoje (spec 2026-09-30 §3.1): a lista de
  // parcelas do formulário da venda rápida nasce por eles.
  const regra = await regraDaEmpresaNaData(cliente.empresaParceiraId, new Date());
  return {
    ...montarPayloadLimite({
      nome: cliente.nome,
      renda: cliente.renda,
      vendas,
      consignado,
    }),
    regraVencimento: { diaCorte: regra.diaCorte, diaVencimento: regra.diaVencimento },
  };
}
