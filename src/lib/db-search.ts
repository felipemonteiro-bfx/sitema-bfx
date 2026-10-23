/**
 * Fuzzy search helpers using pg_trgm + unaccent (pt-BR friendly).
 *
 * Strategy: run raw SQL to get matching IDs ordered by similarity,
 * then fetch full records via Prisma so types stay correct.
 */
import { prisma } from "@/lib/db";

type IdRow = { id: number };

/**
 * Fragmento SQL que escapa os curingas de LIKE/ILIKE (`\`, `%` e `_`) de uma expressão.
 * O termo do usuário continua indo como parâmetro ($1); aqui só impedimos que "50%" ou "_"
 * virem curinga e casem tudo. O escape padrão do LIKE no Postgres é a barra invertida.
 */
function likeEsc(expr: string): string {
  return `replace(replace(replace(${expr}, '\\', '\\\\'), '%', '\\%'), '_', '\\_')`;
}

type Escopo = { id: number; nome: string };

/**
 * Trava uma busca de clientes nos que têm venda do vendedor (mesma regra de
 * `whereVendasDoUsuario`: vendedor_id igual OU venda legada sem id com o texto do nome).
 * Vai DENTRO do SQL, antes do LIMIT, para o corte nunca esconder cliente do vendedor
 * atrás de cliente alheio. `pId`/`pNome` são os números dos parâmetros ($n) já livres.
 */
function existeVendaDoVendedor(pId: number, pNome: number): string {
  return `EXISTS (SELECT 1 FROM "vendas" v WHERE v."cliente_id" = "clientes"."id" AND (v."vendedor_id" = $${pId} OR (v."vendedor_id" IS NULL AND v."vendedor" = $${pNome})))`;
}

/**
 * Returns IDs from `table` where `column` is fuzzy-similar to `query`.
 * Matches via trigram similarity OR plain ILIKE (for short tokens).
 */
async function fuzzyIds(
  table: string,
  column: string,
  query: string,
  limit: number,
  threshold = 0.15,
  escopoClientes?: Escopo
): Promise<number[]> {
  const q = query.trim();
  if (!q) return [];
  // Escopo só faz sentido na tabela de clientes (EXISTS em vendas do vendedor).
  const escopo = escopoClientes && table === "clientes" ? escopoClientes : undefined;
  const rows = await prisma.$queryRawUnsafe<IdRow[]>(
    `SELECT id
     FROM "${table}"
     WHERE (similarity(f_unaccent(lower("${column}")), f_unaccent(lower($1))) > $2
        OR f_unaccent(lower("${column}")) ILIKE '%' || ${likeEsc("f_unaccent(lower($1))")} || '%')
        ${escopo ? `AND ${existeVendaDoVendedor(4, 5)}` : ""}
     ORDER BY similarity(f_unaccent(lower("${column}")), f_unaccent(lower($1))) DESC
     LIMIT $3`,
    q,
    threshold,
    limit,
    ...(escopo ? [escopo.id, escopo.nome] : [])
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
  limit: number,
  escopoClientes?: Escopo
): Promise<number[]> {
  const q = query.trim();
  if (!q) return [];
  const escopo = escopoClientes && table === "clientes" ? escopoClientes : undefined;
  // ORDER BY antes do LIMIT: o corte é determinístico (e o escopo, quando há, já filtrou).
  const rows = await prisma.$queryRawUnsafe<IdRow[]>(
    `SELECT id
     FROM "${table}"
     WHERE f_unaccent(lower("${column}")) LIKE '%' || ${likeEsc("f_unaccent(lower($1))")} || '%'
        ${escopo ? `AND ${existeVendaDoVendedor(3, 4)}` : ""}
     ORDER BY "${column}" ASC, id ASC
     LIMIT $2`,
    q,
    limit,
    ...(escopo ? [escopo.id, escopo.nome] : [])
  );
  return rows.map((r) => r.id);
}

/**
 * Accent-insensitive "nome contains" lookup for clients. Returns IDs only, so
 * callers keep their own Prisma `select`.
 */
export async function unaccentFindClienteIds(search: string, limit = 500, escopo?: Escopo) {
  return unaccentContainsIds("clientes", "nome", search, limit, escopo);
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

/**
 * DAT-02: o `where` filtra `deletedAt: null` para nao ressuscitar fornecedor
 * excluido na busca fuzzy. O SQL cru de `fuzzyIds` aplica `LIMIT` antes deste
 * filtro, entao uma busca pode devolver menos que `limit` resultados quando
 * ha excluidos parecidos no meio do ranking de similaridade — tradeoff aceito
 * e consciente: a tabela e pequena, e mudar o SQL cru exigiria duplicar a
 * regra de soft-delete em string SQL.
 */
export async function fuzzyFindFornecedores(search: string, limit = 50) {
  const ids = await fuzzyIds("fornecedores", "nome", search, limit);
  if (!ids.length) return [];
  return prisma.fornecedor.findMany({ where: { id: { in: ids }, deletedAt: null }, take: limit });
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

// Escopo de vendedor em SQL cru: $4 = id do usuario, $5 = nome de exibicao (perna legada).
const ESCOPO_SQL = `("vendedor_id" = $4 OR ("vendedor_id" IS NULL AND "vendedor" = $5))`;

async function whereFuzzyVendas(q: string, limit: number, escopo?: Escopo) {
  // 1. Fuzzy match client names → get clienteIds (com escopo, só clientes do vendedor, antes do LIMIT)
  const clienteIds = await fuzzyIds("clientes", "nome", q, limit, 0.15, escopo);

  // 2. Fuzzy match vendedor field on vendas
  type VendaIdRow = { id: number };
  const vendedorRows = await prisma.$queryRawUnsafe<VendaIdRow[]>(
    `SELECT id
     FROM "vendas"
     WHERE (similarity(f_unaccent(lower(COALESCE("vendedor", ''))), f_unaccent(lower($1))) > $2
        OR f_unaccent(lower(COALESCE("vendedor", ''))) ILIKE '%' || ${likeEsc("f_unaccent(lower($1))")} || '%')
        ${escopo ? `AND ${ESCOPO_SQL}` : ""}
     LIMIT $3`,
    q,
    0.15,
    limit,
    ...(escopo ? [escopo.id, escopo.nome] : [])
  );
  const vendedorVendaIds = vendedorRows.map((r) => r.id);

  // 3. Fuzzy match product names in itens_venda
  type ItemVendaIdRow = { venda_id: number };
  const itemRows = await prisma.$queryRawUnsafe<ItemVendaIdRow[]>(
    `SELECT DISTINCT "venda_id"
     FROM "itens_venda"
     WHERE (similarity(f_unaccent(lower("produto_nome")), f_unaccent(lower($1))) > $2
        OR f_unaccent(lower("produto_nome")) ILIKE '%' || ${likeEsc("f_unaccent(lower($1))")} || '%')
        ${escopo ? `AND "venda_id" IN (SELECT id FROM "vendas" WHERE ${ESCOPO_SQL})` : ""}
     LIMIT $3`,
    q,
    0.15,
    limit,
    ...(escopo ? [escopo.id, escopo.nome] : [])
  );
  const itemVendaIds = itemRows.map((r) => r.venda_id);

  // 4. Build combined WHERE clause
  const conditions: { clienteId?: { in: number[] }; id?: { in: number[] } }[] = [];
  if (clienteIds.length > 0) conditions.push({ clienteId: { in: clienteIds } });
  if (vendedorVendaIds.length > 0) conditions.push({ id: { in: vendedorVendaIds } });
  if (itemVendaIds.length > 0) conditions.push({ id: { in: itemVendaIds } });

  if (conditions.length === 0) return null;

  return escopo
    ? { AND: [{ OR: conditions }, { OR: [{ vendedorId: escopo.id }, { vendedorId: null, vendedor: escopo.nome }] }] }
    : { OR: conditions };
}

/**
 * Fuzzy search across vendas (cliente, produto ou vendedor), com cliente + itens incluídos.
 * `escopo` trava nas vendas do usuário (mesma regra de `whereVendasDoUsuario`), DENTRO do SQL,
 * antes do LIMIT, e de novo no `where` final.
 */
export async function fuzzyFindVendas(search: string, limit = 50, escopo?: Escopo) {
  const q = search.trim();
  if (!q) return [];
  const where = await whereFuzzyVendas(q, limit, escopo);
  if (!where) return [];

  return prisma.venda.findMany({
    where,
    include: {
      cliente: { select: { nome: true, matricula: true, empresa: true } },
      itens: { select: { produtoNome: true, quantidade: true, subtotal: true } },
    },
    orderBy: { dataVenda: "desc" },
    take: limit,
  });
}

/**
 * Mesma busca de `fuzzyFindVendas`, mas devolve só os ids (sem carregar cliente e itens).
 * Para quem só usa os ids como filtro (rota do ⌘K, Histórico, exportação).
 */
export async function fuzzyFindVendaIds(search: string, limit = 50, escopo?: Escopo): Promise<number[]> {
  const q = search.trim();
  if (!q) return [];
  const where = await whereFuzzyVendas(q, limit, escopo);
  if (!where) return [];
  const rows = await prisma.venda.findMany({
    where,
    select: { id: true },
    orderBy: { dataVenda: "desc" },
    take: limit,
  });
  return rows.map((r) => r.id);
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
