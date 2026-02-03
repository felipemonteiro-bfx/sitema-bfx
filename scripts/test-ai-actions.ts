import { executeAiAction } from "../src/lib/ai-actions";
import { prisma } from "../src/lib/db";

const ctx = {
  role: "admin" as const,
  username: "admin",
  displayName: "Admin",
};

const now = new Date();
const today = now.toISOString().slice(0, 10);
const uniq = String(Date.now());

const created: {
  clienteId?: number;
  produtoId?: number;
  empresaId?: number;
  usuarioId?: number;
  vendaId?: number;
  despesaId?: number;
} = {};

async function run() {
  console.log("== Testando function calling (executeAiAction) ==");

  const clientes = await executeAiAction("listar_clientes", { limit: 3 }, ctx);
  console.log("listar_clientes ok", Array.isArray(clientes) ? clientes.length : clientes);

  const cliente = await executeAiAction(
    "criar_cliente",
    { nome: `Cliente Teste ${uniq}`, tipo: "PF" },
    ctx
  );
  created.clienteId = (cliente as any).id;
  console.log("criar_cliente ok", created.clienteId);

  const produtos = await executeAiAction("listar_produtos", { limit: 3 }, ctx);
  console.log("listar_produtos ok", Array.isArray(produtos) ? produtos.length : produtos);

  const produto = await executeAiAction(
    "criar_produto",
    { nome: `Produto Teste ${uniq}`, marca: "BFX", custoPadrao: 100, valorVenda: 199 },
    ctx
  );
  created.produtoId = (produto as any).id;
  console.log("criar_produto ok", created.produtoId);

  const venda = await executeAiAction(
    "criar_venda",
    {
      dataVenda: today,
      vendedor: "Admin",
      clienteId: created.clienteId,
      produtoNome: `Produto Teste ${uniq}`,
      valorVenda: 199,
      parcelas: 1,
    },
    ctx
  );
  created.vendaId = (venda as any).id;
  console.log("criar_venda ok", created.vendaId);

  const vendas = await executeAiAction(
    "listar_vendas",
    { from: today, to: today, limit: 5 },
    ctx
  );
  console.log("listar_vendas ok", Array.isArray(vendas) ? vendas.length : vendas);

  const despesa = await executeAiAction(
    "criar_despesa",
    { descricao: `Despesa Teste ${uniq}`, valor: 50, dataDespesa: today, tipo: "Operacional" },
    ctx
  );
  created.despesaId = (despesa as any).id;
  console.log("criar_despesa ok", created.despesaId);

  const despesas = await executeAiAction(
    "listar_despesas",
    { from: today, to: today, limit: 5 },
    ctx
  );
  console.log("listar_despesas ok", Array.isArray(despesas) ? despesas.length : despesas);

  const empresa = await executeAiAction(
    "criar_empresa",
    { nome: `Empresa Teste ${uniq}` },
    ctx
  );
  created.empresaId = (empresa as any).id;
  console.log("criar_empresa ok", created.empresaId);

  const empresas = await executeAiAction("listar_empresas", { limit: 5 }, ctx);
  console.log("listar_empresas ok", Array.isArray(empresas) ? empresas.length : empresas);

  const usuario = await executeAiAction(
    "criar_usuario",
    {
      username: `user_${uniq}`,
      password: "123456",
      role: "admin",
      nomeExibicao: `Usuario Teste ${uniq}`,
    },
    ctx
  );
  created.usuarioId = (usuario as any).id;
  console.log("criar_usuario ok", created.usuarioId);

  const usuarios = await executeAiAction("listar_usuarios", { limit: 5 }, ctx);
  console.log("listar_usuarios ok", Array.isArray(usuarios) ? usuarios.length : usuarios);

  const usuarioUpd = await executeAiAction(
    "atualizar_usuario",
    { id: created.usuarioId, nomeExibicao: `Usuario Atualizado ${uniq}` },
    ctx
  );
  console.log("atualizar_usuario ok", (usuarioUpd as any).id);

  const vendaUpd = await executeAiAction(
    "atualizar_venda",
    { id: created.vendaId, valorVenda: 210 },
    ctx
  );
  console.log("atualizar_venda ok", (vendaUpd as any).id);

  const despesaUpd = await executeAiAction(
    "atualizar_despesa",
    { id: created.despesaId, valor: 60 },
    ctx
  );
  console.log("atualizar_despesa ok", (despesaUpd as any).id);

  console.log("== OK ==");
}

run()
  .catch((err) => {
    console.error("Falhou:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (created.vendaId) await prisma.venda.delete({ where: { id: created.vendaId } }).catch(() => undefined);
    if (created.despesaId) await prisma.despesa.delete({ where: { id: created.despesaId } }).catch(() => undefined);
    if (created.produtoId) await prisma.produto.delete({ where: { id: created.produtoId } }).catch(() => undefined);
    if (created.clienteId) await prisma.cliente.delete({ where: { id: created.clienteId } }).catch(() => undefined);
    if (created.empresaId) await prisma.empresaParceira.delete({ where: { id: created.empresaId } }).catch(() => undefined);
    if (created.usuarioId) await prisma.usuario.delete({ where: { id: created.usuarioId } }).catch(() => undefined);
    await prisma.$disconnect();
  });
