/**
 * Substitui as vendas atuais no PostgreSQL pelas vendas do banco SQLite (dados reais).
 * Use quando as vendas exibidas forem mockadas e os dados reais estiverem no SQLite.
 *
 * Uso:
 *   SQLITE_PATH=caminho/para/bfx_sistema.db node prisma/import-vendas-sqlite.js
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

async function main() {
  console.log("Removendo vendas atuais (mockadas)...");
  await prisma.parcelaVencimento.deleteMany({});
  await prisma.itemVenda.deleteMany({});
  await prisma.venda.deleteMany({});

  let db;
  try {
    db = new Database(SQLITE_PATH, { readonly: true });
  } catch (e) {
    console.warn("SQLite não encontrado em", SQLITE_PATH);
    console.warn("Vendas mockadas foram removidas. O histórico mostrará apenas vendas novas lançadas pelo sistema.");
    return;
  }

  const vendas = db.prepare("SELECT * FROM vendas").all();
  db.close();

  if (vendas.length === 0) {
    console.log("Nenhuma venda no SQLite. Histórico ficará vazio até novas vendas serem lançadas.");
    return;
  }

  const vendasData = vendas.map((v) => ({
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

  await prisma.venda.createMany({
    data: vendasData,
    skipDuplicates: true,
  });

  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"vendas"','id'), COALESCE((SELECT MAX(id) FROM "vendas"), 1), true);`
  );

  console.log("Importadas", vendasData.length, "vendas do SQLite para o PostgreSQL.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
