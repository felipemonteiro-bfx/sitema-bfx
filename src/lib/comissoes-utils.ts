import type { Prisma } from "@/generated/prisma";

/**
 * Constrói o filtro where para queries de comissões a partir dos searchParams.
 */
export function buildComissoesWhere(
  searchParams: URLSearchParams
): Prisma.VendaWhereInput {
  const where: Prisma.VendaWhereInput = {};
  const vendedorFiltro = searchParams.get("vendedor");
  const dataInicioStr = searchParams.get("dataInicio");
  const dataFimStr = searchParams.get("dataFim");

  if (vendedorFiltro) where.vendedor = vendedorFiltro;
  if (dataInicioStr || dataFimStr) {
    where.dataVenda = {};
    if (dataInicioStr) where.dataVenda.gte = new Date(dataInicioStr);
    if (dataFimStr) where.dataVenda.lte = new Date(dataFimStr);
  }

  return where;
}
