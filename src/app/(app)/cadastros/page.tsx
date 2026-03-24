import { prisma } from "@/lib/db";
import { fuzzyFindProdutos } from "@/lib/db-search";
import { buttonVariants } from "@/components/ui/button-variants";
import { formatBRL, cn } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma";
import { QueryTabs } from "@/components/query-tabs";
import ProdutoFormClient from "@/components/produto-form-client";
import ProdutosTabClient from "@/components/produtos-tab-client";
import ClientesTabClient from "@/components/clientes-tab-client";
import FornecedoresTabClient from "@/components/fornecedores-tab-client";
import EmpresasTabClient from "@/components/empresas-tab-client";
import { LinkCatalogoButton } from "@/components/link-catalogo-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createAuditLog } from "@/lib/audit";

type Search = { tab?: string; q_clientes?: string; q_produtos?: string; q_fornecedores?: string; q_empresas?: string; editCliente?: string; editProduto?: string; editFornecedor?: string; editEmpresa?: string; error?: string };

function normalizeUppercase(value: FormDataEntryValue | null) {
  return String(value || "").trim().toLocaleUpperCase("pt-BR");
}

async function addCliente(formData: FormData) {
  "use server";
  const nome = normalizeUppercase(formData.get("nome"));
  const tipo = String(formData.get("tipo") || "PF");
  if (!nome) return;
  try {
    const cliente = await prisma.cliente.create({
      data: {
        nome,
        cpf: tipo === "PF" ? normalizeUppercase(formData.get("doc")) : null,
        cnpj: tipo === "PJ" ? normalizeUppercase(formData.get("doc")) : null,
        renda: Number(formData.get("renda") || 0),
        empresa: normalizeUppercase(formData.get("empresa")),
        telefone: normalizeUppercase(formData.get("telefone")),
        cep: normalizeUppercase(formData.get("cep")),
        matricula: normalizeUppercase(formData.get("matricula")),
        tipo,
      },
    });
    await createAuditLog("cliente:create", { clienteId: cliente.id, nome });
    revalidatePath("/cadastros");
  } catch (e) {
    const isUniqueError = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
    redirect(`/cadastros?tab=clientes&error=${isUniqueError ? "nome_duplicado" : "salvar_falhou"}`);
  }
}

async function updateCliente(formData: FormData) {
  "use server";
  const id = Number(formData.get("id") || 0);
  const nome = normalizeUppercase(formData.get("nome"));
  const tipo = String(formData.get("tipo") || "PF");
  if (!id || !nome) return;
  try {
    await prisma.cliente.update({
      where: { id },
      data: {
        nome,
        cpf: tipo === "PF" ? normalizeUppercase(formData.get("doc")) : null,
        cnpj: tipo === "PJ" ? normalizeUppercase(formData.get("doc")) : null,
        renda: Number(formData.get("renda") || 0),
        empresa: normalizeUppercase(formData.get("empresa")),
        telefone: normalizeUppercase(formData.get("telefone")),
        cep: normalizeUppercase(formData.get("cep")),
        matricula: normalizeUppercase(formData.get("matricula")),
        tipo,
      },
    });
    await createAuditLog("cliente:update", { clienteId: id, nome });
    revalidatePath("/cadastros");
  } catch (e) {
    const isUniqueError = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
    redirect(`/cadastros?tab=clientes&editCliente=${id}&error=${isUniqueError ? "nome_duplicado" : "salvar_falhou"}`);
  }
  redirect("/cadastros?tab=clientes");
}

async function bulkDeleteClientes(ids: number[]) {
  "use server";
  if (!ids.length) return;
  const clientes = await prisma.cliente.findMany({ where: { id: { in: ids } }, select: { id: true, nome: true } });
  await prisma.cliente.deleteMany({ where: { id: { in: ids } } });
  for (const c of clientes) {
    await createAuditLog("cliente:delete", { clienteId: c.id, nome: c.nome });
  }
  revalidatePath("/cadastros");
}

async function addProduto(formData: FormData) {
  "use server";
  const nome = normalizeUppercase(formData.get("nome"));
  if (!nome) return;
  const dataCompraStr = String(formData.get("dataCompra") || "");
  const produto = await prisma.produto.create({
    data: {
      nome,
      custoPadrao: Number(formData.get("custo") || 0),
      marca: normalizeUppercase(formData.get("marca")),
      categoria: normalizeUppercase(formData.get("categoria")),
      ncm: normalizeUppercase(formData.get("ncm")),
      valorVenda: Number(formData.get("valor") || 0),
      qtdEstoque: Number(formData.get("estoque") || 0),
      imagem: String(formData.get("imagem") || ""),
      fornecedorId: formData.get("fornecedorId") ? Number(formData.get("fornecedorId")) : null,
      dataCompra: dataCompraStr ? new Date(dataCompraStr) : null,
    },
  });
  await createAuditLog("produto:create", { produtoId: produto.id, nome });
  revalidatePath("/cadastros");
}

async function updateProduto(formData: FormData) {
  "use server";
  const id = Number(formData.get("id") || 0);
  const nome = normalizeUppercase(formData.get("nome"));
  if (!id || !nome) {
    throw new Error("Dados incompletos. Nome do produto e obrigatorio.");
  }
  const dataCompraStr = String(formData.get("dataCompra") || "");
  await prisma.produto.update({
    where: { id },
    data: {
      nome,
      custoPadrao: Number(formData.get("custo") || 0),
      marca: normalizeUppercase(formData.get("marca")),
      categoria: normalizeUppercase(formData.get("categoria")),
      ncm: normalizeUppercase(formData.get("ncm")),
      valorVenda: Number(formData.get("valor") || 0),
      qtdEstoque: Number(formData.get("estoque") || 0),
      imagem: String(formData.get("imagem") || ""),
      fornecedorId: formData.get("fornecedorId") ? Number(formData.get("fornecedorId")) : null,
      dataCompra: dataCompraStr ? new Date(dataCompraStr) : null,
    },
  });
  await createAuditLog("produto:update", { produtoId: id, nome });
  revalidatePath("/cadastros");
}

async function deleteProduto(formData: FormData) {
  "use server";
  const id = Number(formData.get("id") || 0);
  if (!id) return;
  const produto = await prisma.produto.findUnique({ where: { id }, select: { nome: true } });
  if (!produto) return;
  await prisma.produto.delete({ where: { id } });
  await createAuditLog("produto:delete", { produtoId: id, nome: produto.nome });
  revalidatePath("/cadastros");
}

async function bulkDeleteProdutos(ids: number[]) {
  "use server";
  if (!ids.length) return;
  const produtos = await prisma.produto.findMany({ where: { id: { in: ids } }, select: { id: true, nome: true } });
  await prisma.produto.deleteMany({ where: { id: { in: ids } } });
  for (const p of produtos) {
    await createAuditLog("produto:delete", { produtoId: p.id, nome: p.nome });
  }
  revalidatePath("/cadastros");
}

async function addFornecedor(formData: FormData) {
  "use server";
  const nome = normalizeUppercase(formData.get("nome"));
  if (!nome) return;
  await prisma.fornecedor.create({
    data: {
      nome,
      telefone: normalizeUppercase(formData.get("telefone")),
    },
  });
  revalidatePath("/cadastros");
}

async function updateFornecedor(formData: FormData) {
  "use server";
  const id = Number(formData.get("id") || 0);
  const nome = normalizeUppercase(formData.get("nome"));
  if (!id || !nome) return;
  await prisma.fornecedor.update({
    where: { id },
    data: {
      nome,
      telefone: normalizeUppercase(formData.get("telefone")),
    },
  });
  await createAuditLog("fornecedor:update", { fornecedorId: id, nome });
  revalidatePath("/cadastros");
  redirect("/cadastros?tab=fornecedores");
}

async function bulkDeleteFornecedores(ids: number[]) {
  "use server";
  if (!ids.length) return;
  const fornecedores = await prisma.fornecedor.findMany({ where: { id: { in: ids } }, select: { id: true, nome: true } });
  await prisma.fornecedor.deleteMany({ where: { id: { in: ids } } });
  for (const f of fornecedores) {
    await createAuditLog("fornecedor:delete", { fornecedorId: f.id, nome: f.nome });
  }
  revalidatePath("/cadastros");
}

async function addEmpresa(formData: FormData) {
  "use server";
  const nome = normalizeUppercase(formData.get("nome"));
  if (!nome) return;
  await prisma.empresaParceira.create({
    data: {
      nome,
      responsavelRh: normalizeUppercase(formData.get("rh")),
      telefoneRh: normalizeUppercase(formData.get("tel")),
      emailRh: normalizeUppercase(formData.get("email")),
    },
  });
  revalidatePath("/cadastros");
}

async function updateEmpresa(formData: FormData) {
  "use server";
  const id = Number(formData.get("id") || 0);
  const nome = normalizeUppercase(formData.get("nome"));
  if (!id || !nome) return;
  await prisma.empresaParceira.update({
    where: { id },
    data: {
      nome,
      responsavelRh: normalizeUppercase(formData.get("rh")),
      telefoneRh: normalizeUppercase(formData.get("tel")),
      emailRh: normalizeUppercase(formData.get("email")),
    },
  });
  await createAuditLog("empresa:update", { empresaId: id, nome });
  revalidatePath("/cadastros");
  redirect("/cadastros?tab=empresas");
}

async function bulkDeleteEmpresas(ids: number[]) {
  "use server";
  if (!ids.length) return;
  const empresas = await prisma.empresaParceira.findMany({ where: { id: { in: ids } }, select: { id: true, nome: true } });
  await prisma.empresaParceira.deleteMany({ where: { id: { in: ids } } });
  for (const e of empresas) {
    await createAuditLog("empresa:delete", { empresaId: e.id, nome: e.nome });
  }
  revalidatePath("/cadastros");
}

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const editClienteId = sp.editCliente ? Number(sp.editCliente) : 0;
  const editProdutoId = sp.editProduto ? Number(sp.editProduto) : 0;
  const editFornecedorId = sp.editFornecedor ? Number(sp.editFornecedor) : 0;
  const editEmpresaId = sp.editEmpresa ? Number(sp.editEmpresa) : 0;

  const editClienteData = editClienteId ? await prisma.cliente.findUnique({
    where: { id: editClienteId },
    select: { id: true, nome: true, cpf: true, cnpj: true, renda: true, empresa: true, matricula: true, telefone: true, cep: true, tipo: true },
  }) : null;
  const editProdutoData = editProdutoId ? await prisma.produto.findUnique({
    where: { id: editProdutoId },
    select: { id: true, nome: true, custoPadrao: true, marca: true, categoria: true, ncm: true, imagem: true, valorVenda: true, qtdEstoque: true, fornecedorId: true, dataCompra: true, fornecedor: { select: { id: true, nome: true } } },
  }) : null;
  const editFornecedorData = editFornecedorId ? await prisma.fornecedor.findUnique({
    where: { id: editFornecedorId },
    select: { id: true, nome: true, telefone: true },
  }) : null;
  const editEmpresaData = editEmpresaId ? await prisma.empresaParceira.findUnique({
    where: { id: editEmpresaId },
    select: { id: true, nome: true, responsavelRh: true, telefoneRh: true, emailRh: true },
  }) : null;

  const errorMsg = sp.error === "nome_duplicado"
    ? "Ja existe um cliente com esse nome. Use um nome diferente."
    : sp.error === "salvar_falhou"
    ? "Erro ao salvar. Tente novamente."
    : null;

  const clientes = await prisma.cliente.findMany({
    where: sp.q_clientes ? {
      OR: [
        { nome: { contains: sp.q_clientes, mode: 'insensitive' } },
        { cpf: { contains: sp.q_clientes, mode: 'insensitive' } },
        { cnpj: { contains: sp.q_clientes, mode: 'insensitive' } },
      ]
    } : {},
    select: { id: true, nome: true, cpf: true, cnpj: true, renda: true, empresa: true, matricula: true, telefone: true, cep: true, tipo: true },
    orderBy: { nome: "asc" }
  });

  const produtos = sp.q_produtos
    ? await (async () => {
        const fuzzyResults = await fuzzyFindProdutos(sp.q_produtos!, 200);
        const fuzzyIds = new Set(fuzzyResults.map(p => p.id));
        const extraMatches = await prisma.produto.findMany({
          where: {
            id: { notIn: Array.from(fuzzyIds) },
            OR: [
              { marca: { contains: sp.q_produtos!, mode: 'insensitive' } },
              { categoria: { contains: sp.q_produtos!, mode: 'insensitive' } },
            ],
          },
          select: { id: true, nome: true, custoPadrao: true, marca: true, categoria: true, ncm: true, imagem: true, valorVenda: true, qtdEstoque: true, fornecedorId: true, dataCompra: true, fornecedor: { select: { id: true, nome: true } } },
        });
        const fullFuzzy = await prisma.produto.findMany({
          where: { id: { in: Array.from(fuzzyIds) } },
          select: { id: true, nome: true, custoPadrao: true, marca: true, categoria: true, ncm: true, imagem: true, valorVenda: true, qtdEstoque: true, fornecedorId: true, dataCompra: true, fornecedor: { select: { id: true, nome: true } } },
          orderBy: { nome: "asc" },
        });
        return [...fullFuzzy, ...extraMatches];
      })()
    : await prisma.produto.findMany({
        select: { id: true, nome: true, custoPadrao: true, marca: true, categoria: true, ncm: true, imagem: true, valorVenda: true, qtdEstoque: true, fornecedorId: true, dataCompra: true, fornecedor: { select: { id: true, nome: true } } },
        orderBy: { nome: "asc" },
      });

  const categoriasExistentes = Array.from(
    new Set(
      produtos
        .map((produto) => produto.categoria?.trim())
        .filter((categoria): categoria is string => Boolean(categoria))
    )
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const empresas = await prisma.empresaParceira.findMany({
    where: sp.q_empresas ? {
      nome: { contains: sp.q_empresas, mode: 'insensitive' }
    } : {},
    orderBy: { nome: "asc" }
  });

  const fornecedores = await prisma.fornecedor.findMany({
    where: sp.q_fornecedores ? {
      nome: { contains: sp.q_fornecedores, mode: 'insensitive' }
    } : {},
    orderBy: { nome: "asc" }
  });

  const spPlain: Record<string, string | undefined> = {
    tab: sp.tab,
    q_clientes: sp.q_clientes,
    q_produtos: sp.q_produtos,
    q_fornecedores: sp.q_fornecedores,
    q_empresas: sp.q_empresas,
    editCliente: sp.editCliente,
    editProduto: sp.editProduto,
    editFornecedor: sp.editFornecedor,
    editEmpresa: sp.editEmpresa,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cadastros</h1>
        <p className="text-sm text-muted-foreground">Base de clientes, produtos, fornecedores e empresas.</p>
      </div>
      <QueryTabs
        defaultTab={sp.tab || (sp.editProduto ? "produtos" : sp.editFornecedor ? "fornecedores" : sp.editEmpresa ? "empresas" : sp.editCliente ? "clientes" : "clientes")}
        tabs={[
          {
            value: "clientes",
            label: "Clientes",
            content: (
              <ClientesTabClient
                clientes={clientes}
                editClienteData={editClienteData}
                searchQuery={sp.q_clientes}
                errorMsg={errorMsg}
                searchParams={spPlain}
                onAddAction={addCliente}
                onUpdateAction={updateCliente}
                onBulkDeleteAction={bulkDeleteClientes}
              />
            ),
          },
          {
            value: "produtos",
            label: "Produtos",
            content: (
              <>
                <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
                  <a
                    href="/api/relatorios/catalogo"
                    target="_blank"
                    rel="noreferrer"
                    className={cn(buttonVariants({ variant: "outline" }), "border-blue-900 text-blue-900 hover:bg-blue-50")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M8 7h6"/><path d="M8 11h8"/></svg>
                    Gerar Catalogo (Imprimir)
                  </a>
                  <LinkCatalogoButton />
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-blue-900">Novo Produto</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ProdutoFormClient
                      onSuccessAction={addProduto}
                      fornecedores={fornecedores.map(f => ({ id: f.id, nome: f.nome }))}
                      categoriasExistentes={categoriasExistentes}
                    />
                  </CardContent>
                </Card>
                <Card className="mt-4">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-blue-900">Produtos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ProdutosTabClient
                      produtos={produtos}
                      fornecedores={fornecedores.map(f => ({ id: f.id, nome: f.nome }))}
                      categoriasExistentes={categoriasExistentes}
                      searchQuery={sp.q_produtos}
                      initialProduto={editProdutoData}
                      onCreateAction={addProduto}
                      onUpdateAction={updateProduto}
                      onDeleteAction={deleteProduto}
                      onBulkDeleteAction={bulkDeleteProdutos}
                    />
                  </CardContent>
                </Card>
              </>
            ),
          },
          {
            value: "fornecedores",
            label: "Fornecedores",
            content: (
              <FornecedoresTabClient
                fornecedores={fornecedores}
                editFornecedorData={editFornecedorData}
                searchQuery={sp.q_fornecedores}
                searchParams={spPlain}
                onAddAction={addFornecedor}
                onUpdateAction={updateFornecedor}
                onBulkDeleteAction={bulkDeleteFornecedores}
              />
            ),
          },
          {
            value: "empresas",
            label: "Empresas",
            content: (
              <EmpresasTabClient
                empresas={empresas}
                editEmpresaData={editEmpresaData}
                searchQuery={sp.q_empresas}
                searchParams={spPlain}
                onAddAction={addEmpresa}
                onUpdateAction={updateEmpresa}
                onBulkDeleteAction={bulkDeleteEmpresas}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
