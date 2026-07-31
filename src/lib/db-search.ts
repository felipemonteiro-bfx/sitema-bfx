/**
 * Fuzzy search helpers using pg_trgm + unaccent (pt-BR friendly).
 *
 * Strategy: run raw SQL to get matching IDs ordered by similarity,
 * then fetch full records via Prisma so types stay correct.
 */
import { prisma } from "@/lib/db";

type IdRow = { id: number };

/**
 * Returns IDs from `table` where `column` is fuzzy-similar to `query`.
 * Matches via trigram similarity OR plain ILIKE (for short tokens).
 */
async function fuzzyIds(
  table: string,
  column: string,
  query: string,
  limit: number,
  threshold = 0.15
): Promise<number[]> {
  const q = query.trim();
  if (!q) return [];
  const rows = await prisma.$queryRawUnsafe<IdRow[]>(
    `SELECT id
     FROM "${table}"
     WHERE similarity(f_unaccent(lower("${column}")), f_unaccent(lower($1))) > $2
        OR f_unaccent(lower("${column}")) ILIKE '%' || f_unaccent(lower($1)) || '%'
     ORDER BY similarity(f_unaccent(lower("${column}")), f_unaccent(lower($1))) DESC
     LIMIT $3`,
    q,
    threshold,
    limit
  );
  return rows.map((r) => r.id);
}

/**
 * Returns IDs from `table` where `column` CONTAINS `query`, ignoring case AND
 * accents. Same semantics as Prisma's `contains` + `mode: "insensitive"`, minus
 * the accent trap: Postgres ILIKE only case-folds, so `'%JOSE%'` never matched
 * "JOSÉ LOPES DOLZANE" and the client looked missing from every search box.
 *
 * Use this (not `fuzzyIds`) wherever the user typed a query and expects to see
 * only what they asked for: trigram similarity pulls in unrelated names that
 * merely share a surname, which is fine for duplicate detection but noisy in a
 * search box.
 */
async function unaccentContainsIds(
  table: string,
  column: string,
  query: string,
  limit: number
): Promise<number[]> {
  const q = query.trim();
  if (!q) return [];
  const rows = await prisma.$queryRawUnsafe<IdRow[]>(
    `SELECT id
     FROM "${table}"
     WHERE f_unaccent(lower("${column}")) LIKE '%' || f_unaccent(lower($1)) || '%'
     LIMIT $2`,
    q,
    limit
  );
  return rows.map((r) => r.id);
}

/**
 * Accent-insensitive "nome contains" lookup for clients. Returns IDs only, so
 * callers keep their own Prisma `select`.
 */
export async function unaccentFindClienteIds(search: string, limit = 500) {
  return unaccentContainsIds("clientes", "nome", search, limit);
}

export async function fuzzyFindClientes(search: string, limit = 50) {
  const ids = await fuzzyIds("clientes", "nome", search, limit);
  if (!ids.length) return [];
  return prisma.cliente.findMany({ where: { id: { in: ids } }, take: limit });
}

export async function fuzzyFindProdutos(search: string, limit = 50) {
  const ids = await fuzzyIds("produtos", "nome", search, limit);
  if (!ids.length) return [];
  return prisma.produto.findMany({ where: { id: { in: ids } }, take: limit });
}

export async function fuzzyFindFornecedores(search: string, limit = 50) {
  const ids = await fuzzyIds("fornecedores", "nome", search, limit);
  if (!ids.length) return [];
  return prisma.fornecedor.findMany({ where: { id: { in: ids } }, take: limit });
}

/**
 * Returns the best matching client by name (used when AI passes clienteNome).
 * Uses a slightly higher threshold to avoid false positives on single picks.
 */
export async function fuzzyFindClienteByNome(nome: string) {
  const ids = await fuzzyIds("clientes", "nome", nome, 5, 0.2);
  if (!ids.length) return null;
  return prisma.cliente.findFirst({ where: { id: { in: ids } } });
}

/**
 * Returns the best matching product by name (used when AI passes produtoNome).
 */
export async function fuzzyFindProdutoByNome(nome: string) {
  const ids = await fuzzyIds("produtos", "nome", nome, 5, 0.2);
  if (!ids.length) return null;
  return prisma.produto.findFirst({ where: { id: { in: ids } } });
}

/**
 * Fuzzy search across vendas by: client name, product name (itens), or vendedor.
 * Returns up to `limit` vendas with cliente + itens included.
 */
export async function fuzzyFindVendas(search: string, limit = 50) {
  const q = search.trim();
  if (!q) return [];

  // 1. Fuzzy match client names → get clienteIds
  const clienteIds = await fuzzyIds("clientes", "nome", q, limit);

  // 2. Fuzzy match vendedor field on vendas
  type VendaIdRow = { id: number };
  const vendedorRows = await prisma.$queryRawUnsafe<VendaIdRow[]>(
    `SELECT id
     FROM "vendas"
     WHERE similarity(f_unaccent(lower(COALESCE("vendedor", ''))), f_unaccent(lower($1))) > $2
        OR f_unaccent(lower(COALESCE("vendedor", ''))) ILIKE '%' || f_unaccent(lower($1)) || '%'
     LIMIT $3`,
    q,
    0.15,
    limit
  );
  const vendedorVendaIds = vendedorRows.map((r) => r.id);

  // 3. Fuzzy match product names in itens_venda
  type ItemVendaIdRow = { venda_id: number };
  const itemRows = await prisma.$queryRawUnsafe<ItemVendaIdRow[]>(
    `SELECT DISTINCT "venda_id"
     FROM "itens_venda"
     WHERE similarity(f_unaccent(lower("produto_nome")), f_unaccent(lower($1))) > $2
        OR f_unaccent(lower("produto_nome")) ILIKE '%' || f_unaccent(lower($1)) || '%'
     LIMIT $3`,
    q,
    0.15,
    limit
  );
  const itemVendaIds = itemRows.map((r) => r.venda_id);

  // 4. Build combined WHERE clause
  const conditions: { clienteId?: { in: number[] }; id?: { in: number[] } }[] = [];
  if (clienteIds.length > 0) conditions.push({ clienteId: { in: clienteIds } });
  if (vendedorVendaIds.length > 0) conditions.push({ id: { in: vendedorVendaIds } });
  if (itemVendaIds.length > 0) conditions.push({ id: { in: itemVendaIds } });

  if (conditions.length === 0) return [];

  return prisma.venda.findMany({
    where: { OR: conditions },
    include: {
      cliente: { select: { nome: true, matricula: true, empresa: true } },
      itens: { select: { produtoNome: true, quantidade: true, subtotal: true } },
    },
    orderBy: { dataVenda: "desc" },
    take: limit,
  });
}

/**
 * Fuzzy-finds usuarios by nomeExibicao, falling back to username for users
 * that have no nomeExibicao set.
 */
export async function fuzzyFindUsuarios(search: string, limit = 50) {
  const idsByNome = await fuzzyIds("usuarios", "nome_exibicao", search, limit);
  const idsByUsername = await fuzzyIds("usuarios", "username", search, limit);
  const combined = [...new Set([...idsByNome, ...idsByUsername])];
  if (!combined.length) return [];
  return prisma.usuario.findMany({ where: { id: { in: combined } }, take: limit });
}
