/**
 * Sincroniza vendas da data de hoje do SQLite (Streamlit) para o PostgreSQL.
 * Não remove vendas existentes - apenas adiciona as que não existem (por id).
 *
 * Uso:
 *   SQLITE_PATH=streamlit/bfx_sistema.db node scripts/sync-vendas-hoje.js
 *
 * Se SQLITE_PATH não for definido, usa streamlit/bfx_sistema.db
 */

const path = require("path");
const Database = require("better-sqlite3");
const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

const SQLITE_PATH = process.env.SQLITE_PATH || path.join(__dirname, "..", "streamlit", "bfx_sistema.db");

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function hojeStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

async function main() {
  let db;
  try {
    db = new Database(SQLITE_PATH, { readonly: true });
  } catch (e) {
    console.warn("SQLite não encontrado em", SQLITE_PATH);
    process.exit(1);
  }

  const hoje = hojeStr();
  const vendas = db.prepare(
    "SELECT * FROM vendas WHERE date(data_venda) = date(?)"
  ).all(hoje);
  db.close();

  if (vendas.length === 0) {
    console.log("Nenhuma venda de hoje no SQLite.");
    return;
  }

  const idsExistentes = new Set(
    (await prisma.venda.findMany({ where: { id: { in: vendas.map((v) => v.id) } }, select: { id: true } })).map((v) => v.id)
  );

  const vendasNovas = vendas.filter((v) => !idsExistentes.has(v.id));

  if (vendasNovas.length === 0) {
    console.log("Todas as", vendas.length, "vendas de hoje já estão no PostgreSQL.");
    return;
  }

  const dados = vendasNovas.map((v) => ({
    id: v.id,
    dataVenda: toDate(v.data_venda) || new Date(),
    vendedor: v.vendedor,
    clienteId: v.cliente_id,
    produtoNome: v.produto_nome,
    custoProduto: v.custo_produto,
    valorVenda: v.valor_venda,
    parcelas: v.parcelas,
    valorParcela: v.valor_parcela,
    taxaFinanceiraValor: v.taxa_financeira_valor,
    lucroLiquido: v.lucro_liquido,
    antecipada: v.antecipada,
    excedeuLimite: v.excedeu_limite,
    valorFrete: v.valor_frete,
    custoEnvio: v.custo_envio,
    comprovantePdf: v.comprovante_pdf,
    quantidade: v.quantidade ?? 1,
  }));

  await prisma.venda.createMany({ data: dados, skipDuplicates: true });

  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"vendas"','id'), COALESCE((SELECT MAX(id) FROM "vendas"), 1), true);`
  );

  console.log("Sincronizadas", dados.length, "vendas de hoje do SQLite para o PostgreSQL.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
