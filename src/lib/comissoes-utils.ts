import type { Prisma } from "@/generated/prisma";
import { resolveVendedorScope, type VendedorSessionScope } from "@/lib/vendedor-scope";

export type ComissoesSessionScope = VendedorSessionScope;

/**
 * Constrói o filtro where para queries de comissões a partir dos searchParams.
 *
 * Quando `session` é passada e o papel não é "admin", o filtro de vendedor é
 * travado no próprio usuário — o `vendedor` vindo da query string é ignorado,
 * para impedir que um vendedor consulte a comissão/lucro de outro (IDOR).
 */
export function buildComissoesWhere(
  searchParams: URLSearchParams,
  session?: ComissoesSessionScope | null
): Prisma.VendaWhereInput {
  const where: Prisma.VendaWhereInput = { status: { not: { in: ["cancelada", "estornada"] } } };
  const vendedorFiltro = searchParams.get("vendedor");
  const dataInicioStr = searchParams.get("dataInicio");
  const dataFimStr = searchParams.get("dataFim");

  const vendedorEscopado = resolveVendedorScope(vendedorFiltro ?? undefined, session ?? null);
  if (vendedorEscopado) where.vendedor = vendedorEscopado;
  if (dataInicioStr || dataFimStr) {
    where.dataVenda = {};
    if (dataInicioStr) where.dataVenda.gte = new Date(dataInicioStr);
    if (dataFimStr) where.dataVenda.lte = new Date(dataFimStr);
  }

  return where;
}
