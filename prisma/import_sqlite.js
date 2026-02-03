const path = require("path");
const Database = require("better-sqlite3");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SQLITE_PATH = process.env.SQLITE_PATH || path.join(__dirname, "..", "streamlit", "bfx_sistema.db");
const RESET = process.env.RESET === "1";

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

async function resetTables() {
  const tables = [
    "vendas",
    "clientes",
    "usuarios",
    "produtos",
    "fornecedores",
    "empresas_parceiras",
    "despesas",
    "pagamentos",
    "audit_logs",
    "avisos",
    "config",
  ];
  for (const t of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${t}" RESTART IDENTITY CASCADE;`);
  }
}

async function setSequences() {
  const tables = [
    "clientes",
    "usuarios",
    "produtos",
    "fornecedores",
    "empresas_parceiras",
    "despesas",
    "pagamentos",
    "audit_logs",
    "avisos",
    "config",
    "vendas",
  ];
  for (const t of tables) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${t}"','id'), COALESCE((SELECT MAX(id) FROM "${t}"), 1), true);`
    );
  }
}

async function main() {
  const db = new Database(SQLITE_PATH, { readonly: true });

  if (RESET) {
    await resetTables();
  }

  const clientes = db.prepare("SELECT * FROM clientes").all();
  const usuarios = db.prepare("SELECT * FROM usuarios").all();
  const fornecedores = db.prepare("SELECT * FROM fornecedores").all();
  const produtos = db.prepare("SELECT * FROM produtos").all();
  const empresas = db.prepare("SELECT * FROM empresas_parceiras").all();
  const despesas = db.prepare("SELECT * FROM despesas").all();
  const pagamentos = db.prepare("SELECT * FROM pagamentos").all();
  const auditLogs = db.prepare("SELECT * FROM audit_logs").all();
  const avisos = db.prepare("SELECT * FROM avisos").all();
  const config = db.prepare("SELECT * FROM config").all();
  const vendas = db.prepare("SELECT * FROM vendas").all();

  if (clientes.length) {
    await prisma.cliente.createMany({
      data: clientes.map((c) => ({
        id: c.id,
        nome: c.nome,
        renda: c.renda,
        empresa: c.empresa,
        matricula: c.matricula,
        telefone: c.telefone,
        cpf: c.cpf,
        cnpj: c.cnpj,
        tipo: c.tipo,
        dataNascimento: toDate(c.data_nascimento),
        cep: c.cep,
        endereco: c.endereco,
      })),
      skipDuplicates: true,
    });
  }

  if (usuarios.length) {
    await prisma.usuario.createMany({
      data: usuarios.map((u) => ({
        id: u.id,
        username: u.username,
        password: u.password,
        role: u.role,
        nomeExibicao: u.nome_exibicao,
        email: u.email,
        telefone: u.telefone,
        dataNascimento: toDate(u.data_nascimento),
        endereco: u.endereco,
        cep: u.cep,
        metaMensal: u.meta_mensal,
        comissaoPct: u.comissao_pct,
      })),
      skipDuplicates: true,
    });
  }

  if (fornecedores.length) {
    await prisma.fornecedor.createMany({
      data: fornecedores.map((f) => ({
        id: f.id,
        nome: f.nome,
        telefone: f.telefone,
      })),
      skipDuplicates: true,
    });
  }

  if (produtos.length) {
    await prisma.produto.createMany({
      data: produtos.map((p) => ({
        id: p.id,
        nome: p.nome,
        custoPadrao: p.custo_padrao,
        marca: p.marca,
        qtdEstoque: p.qtd_estoque,
        fornecedorId: p.fornecedor_id,
        imagem: p.imagem,
        ncm: p.ncm,
        valorVenda: p.valor_venda,
      })),
      skipDuplicates: true,
    });
  }

  if (empresas.length) {
    await prisma.empresaParceira.createMany({
      data: empresas.map((e) => ({
        id: e.id,
        nome: e.nome,
        responsavelRh: e.responsavel_rh,
        telefoneRh: e.telefone_rh,
        emailRh: e.email_rh,
      })),
      skipDuplicates: true,
    });
  }

  if (despesas.length) {
    await prisma.despesa.createMany({
      data: despesas.map((d) => ({
        id: d.id,
        dataDespesa: toDate(d.data_despesa),
        descricao: d.descricao,
        categoria: d.categoria,
        valor: d.valor,
        tipo: d.tipo,
      })),
      skipDuplicates: true,
    });
  }

  if (pagamentos.length) {
    await prisma.pagamento.createMany({
      data: pagamentos.map((p) => ({
        id: p.id,
        dataPagamento: toDate(p.data_pagamento),
        vendedor: p.vendedor,
        valor: p.valor,
        obs: p.obs,
      })),
      skipDuplicates: true,
    });
  }

  if (auditLogs.length) {
    await prisma.auditLog.createMany({
      data: auditLogs.map((a) => ({
        id: a.id,
        dataHora: toDate(a.data_hora),
        usuario: a.usuario,
        acao: a.acao,
        detalhes: a.detalhes,
      })),
      skipDuplicates: true,
    });
  }

  if (avisos.length) {
    await prisma.aviso.createMany({
      data: avisos.map((a) => ({
        id: a.id,
        dataCriacao: toDate(a.data_criacao),
        mensagem: a.mensagem,
        ativo: a.ativo,
      })),
      skipDuplicates: true,
    });
  }

  if (config.length) {
    await prisma.config.createMany({
      data: config.map((c) => ({
        id: c.id,
        modeloContrato: c.modelo_contrato,
        logoPath: c.logo_path,
        openaiKey: c.openai_key,
      })),
      skipDuplicates: true,
    });
  }

  if (vendas.length) {
    await prisma.venda.createMany({
      data: vendas.map((v) => ({
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
      })),
      skipDuplicates: true,
    });
  }

  await setSequences();

  db.close();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
