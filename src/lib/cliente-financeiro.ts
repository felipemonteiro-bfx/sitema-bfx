import { prisma } from "@/lib/db";
import { situacaoParaCliente } from "@/lib/baixa-parcelas";
import { FILTRO_VENDA_VALIDA } from "@/lib/venda-utils";

/**
 * Parcelas e boletos de UM cliente, por `clienteId` já resolvido.
 *
 * Extraído do `mcp-agente.ts` para que a IA (MCP) e os atalhos do atendimento
 * leiam a mesma coisa. Quem chama é responsável por resolver o cliente antes
 * (`resolverEscopo`); aqui o id nunca vem de argumento de modelo ou de tela.
 *
 * Venda cancelada/estornada não entra em nenhuma das duas consultas.
 */

export function centavos(valor: number): number {
  return Math.trunc(valor * 100) / 100;
}

/** Dia gravado da data pura (vencimento, data da venda): "YYYY-MM-DD". */
export function dia(data: Date): string {
  return data.toISOString().slice(0, 10);
}

export interface ArgsParcelas {
  apenasEmAberto?: unknown;
  apenasVencidas?: unknown;
}

export interface ParcelaDoCliente {
  vendaId: number;
  produto: string;
  numeroParcela: string;
  dataVencimento: string;
  valor: number;
  paga: boolean;
  diasAtraso: number;
  /** Visão do cliente: parcela antecipada na Prudent segue "a_vencer" até vencer. */
  situacao: "paga" | "vencida" | "a_vencer";
}

export interface ParcelasDoCliente {
  totalEmAberto: number;
  totalVencido: number;
  parcelas: ParcelaDoCliente[];
}

export async function parcelasDoCliente(
  clienteId: number,
  args: ArgsParcelas,
): Promise<ParcelasDoCliente> {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  // Visão do cliente (situacaoParaCliente): parcela antecipada na Prudent segue em aberto até
  // vencer, porque a folha ainda desconta — o `paga` do banco é a visão da BFX.
  const parcelas = await prisma.parcelaVencimento.findMany({
    where: {
      venda: { clienteId, ...FILTRO_VENDA_VALIDA },
      ...(args.apenasEmAberto
        ? { OR: [{ paga: false }, { origemPagamento: "prudent", dataVencimento: { gte: hoje } }] }
        : {}),
      ...(args.apenasVencidas ? { paga: false, dataVencimento: { lt: hoje } } : {}),
    },
    include: { venda: { select: { id: true, produtoNome: true, parcelas: true } } },
    orderBy: { dataVencimento: "asc" },
    take: 200,
  });
  const comSituacao = parcelas.map((p) => ({ p, situacao: situacaoParaCliente(p, hoje) }));
  return {
    totalEmAberto: centavos(
      comSituacao.filter((x) => x.situacao !== "paga").reduce((s, x) => s + x.p.valorParcela, 0),
    ),
    totalVencido: centavos(
      comSituacao.filter((x) => x.situacao === "vencida").reduce((s, x) => s + x.p.valorParcela, 0),
    ),
    parcelas: comSituacao.map(({ p, situacao }) => ({
      vendaId: p.venda.id,
      produto: p.venda.produtoNome,
      numeroParcela: `${p.numeroParcela}/${p.venda.parcelas}`,
      dataVencimento: dia(p.dataVencimento),
      valor: centavos(p.valorParcela),
      paga: situacao === "paga",
      diasAtraso:
        situacao === "vencida"
          ? Math.floor((hoje.getTime() - p.dataVencimento.getTime()) / 86400000)
          : 0,
      situacao,
    })),
  };
}

export interface ArgsBoletos {
  apenasPendentes?: unknown;
}

export interface BoletoDoCliente {
  vendaId: number;
  dataVenda: string;
  produto: string;
  parcelas: number;
  valor: number | null;
  emitido: boolean;
  link: string | null;
}

export interface BoletosDoCliente {
  total: number;
  boletos: BoletoDoCliente[];
}

export async function boletosDoCliente(
  clienteId: number,
  args: ArgsBoletos,
): Promise<BoletosDoCliente> {
  const vendas = await prisma.venda.findMany({
    where: {
      clienteId,
      boleto: true,
      ...FILTRO_VENDA_VALIDA,
      ...(args.apenasPendentes ? { boletoUrl: null } : {}),
    },
    select: {
      id: true,
      dataVenda: true,
      produtoNome: true,
      parcelas: true,
      valorVenda: true,
      boletoUrl: true,
    },
    orderBy: { dataVenda: "desc" },
    take: 50,
  });
  return {
    total: vendas.length,
    boletos: vendas.map((v) => ({
      vendaId: v.id,
      dataVenda: dia(v.dataVenda),
      produto: v.produtoNome,
      parcelas: v.parcelas,
      valor: v.valorVenda == null ? null : centavos(v.valorVenda),
      emitido: Boolean(v.boletoUrl),
      link: v.boletoUrl ?? null,
    })),
  };
}
