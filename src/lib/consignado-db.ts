import { prisma } from "@/lib/db";
import {
  calcularConsignadoDeRegistros,
  montarPayloadLimite,
  type ResultadoConsignado,
} from "@/lib/consignado";
import type { PlanoImportacaoConsignado } from "@/lib/consignado-import";
import type { LinhaConsignado } from "@/lib/consignado-parse";

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
  const r = await calcularConsignado(clienteId);
  await prisma.cliente.update({
    where: { id: clienteId },
    data: { pctConsignado: r.pct, faixaConsignado: r.faixa },
  });
  return r;
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
  const clienteIds = new Set<number>();
  const leadPorCpf = new Map<string, number>();

  for (const item of plano.contratos) {
    let clienteId: number;
    if (item.cliente.acao === "casar") {
      clienteId = item.cliente.clienteId;
      const preencher = item.cliente.preencher;
      if (Object.keys(preencher).length > 0) {
        await prisma.cliente.update({ where: { id: clienteId }, data: preencher });
      }
    } else {
      const cpf = item.cliente.lead.cpf;
      if (cpf && leadPorCpf.has(cpf)) {
        clienteId = leadPorCpf.get(cpf)!;
      } else {
        const criado = await prisma.cliente.create({ data: item.cliente.lead });
        clienteId = criado.id;
        if (cpf) leadPorCpf.set(cpf, clienteId);
      }
    }
    clienteIds.add(clienteId);
    const data = dadosContrato(item.linha, clienteId, item.empresaParceiraId);
    await prisma.contratoConsignado.upsert({
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

  for (const id of clienteIds) {
    await recalcularConsignado(id);
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
    select: { renda: true, nome: true },
  });
  if (!cliente) return null;
  const vendas = await prisma.venda.findMany({ where: { clienteId } });
  const consignado = await calcularConsignado(clienteId);
  return montarPayloadLimite({
    nome: cliente.nome,
    renda: cliente.renda,
    vendas,
    consignado,
  });
}
