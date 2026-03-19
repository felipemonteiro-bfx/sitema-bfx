import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button-variants";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL, cn } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma";
import { FormSelect } from "@/components/form-select";
import { MaskedInput } from "@/components/masked-input";
import { CurrencyInput } from "@/components/currency-input";
import { QueryTabs } from "@/components/query-tabs";
import ProdutoFormClient from "@/components/produto-form-client";
import ProdutosTabClient from "@/components/produtos-tab-client";
import { Search, Pencil } from "lucide-react";
import { LinkCatalogoButton } from "@/components/link-catalogo-button";
import Link from "next/link";
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

async function addProduto(formData: FormData) {
  "use server";
  const nome = normalizeUppercase(formData.get("nome"));
  if (!nome) return;
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
    throw new Error("Dados incompletos. Nome do produto é obrigatório.");
  }
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
    },
  });
  await createAuditLog("produto:update", { produtoId: id, nome });
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
    select: { id: true, nome: true, custoPadrao: true, marca: true, categoria: true, ncm: true, imagem: true, valorVenda: true, qtdEstoque: true, fornecedorId: true, fornecedor: { select: { id: true, nome: true } } },
  }) : null;
  const editFornecedorData = editFornecedorId ? await prisma.fornecedor.findUnique({
    where: { id: editFornecedorId },
    select: { id: true, nome: true, telefone: true },
  }) : null;
  const editEmpresaData = editEmpresaId ? await prisma.empresaParceira.findUnique({
    where: { id: editEmpresaId },
    select: { id: true, nome: true, responsavelRh: true, telefoneRh: true, emailRh: true },
  }) : null;

  const buildUrl = (params: Partial<Search>) => {
    const newParams = { ...sp, ...params, error: undefined };
    const search = new URLSearchParams();
    Object.entries(newParams).forEach(([k, v]) => {
      if (v) search.set(k, v);
    });
    return `/cadastros?${search.toString()}`;
  };

  const errorMsg = sp.error === "nome_duplicado"
    ? "Já existe um cliente com esse nome. Use um nome diferente."
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

  const produtos = await prisma.produto.findMany({
    where: sp.q_produtos ? {
      OR: [
        { nome: { contains: sp.q_produtos, mode: 'insensitive' } },
        { marca: { contains: sp.q_produtos, mode: 'insensitive' } },
        { categoria: { contains: sp.q_produtos, mode: 'insensitive' } },
      ]
    } : {},
    select: { id: true, nome: true, custoPadrao: true, marca: true, categoria: true, ncm: true, imagem: true, valorVenda: true, qtdEstoque: true, fornecedorId: true, fornecedor: { select: { id: true, nome: true } } },
    orderBy: { nome: "asc" }
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
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-blue-900">Novo Cliente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {errorMsg && !sp.editCliente && (
                      <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {errorMsg}
                      </div>
                    )}
                    <form action={addCliente} className="grid gap-4 [&_input]:uppercase">
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Nome/Razão Social</div>
                          <Input name="nome" placeholder="Nome/Razão Social" aria-label="Nome" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Tipo</div>
                          <FormSelect
                            name="tipo"
                            options={[
                              { value: "PF", label: "Pessoa Física" },
                              { value: "PJ", label: "Pessoa Jurídica" },
                            ]}
                            defaultValue="PF"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">CPF/CNPJ</div>
                          <Input name="doc" placeholder="CPF/CNPJ" aria-label="CPF/CNPJ" />
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-4">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Matrícula</div>
                          <Input name="matricula" placeholder="Matrícula" aria-label="Matrícula" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Renda/Faturamento</div>
                          <CurrencyInput name="renda" aria-label="Renda" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">WhatsApp</div>
                          <MaskedInput name="telefone" mask="phone" aria-label="WhatsApp" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">CEP</div>
                          <MaskedInput name="cep" mask="cep" aria-label="CEP" />
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Empresa/Vínculo</div>
                          <Input name="empresa" placeholder="Empresa/Vínculo" aria-label="Empresa" />
                        </div>
                      </div>
                      <div className="flex items-center justify-end">
                        <button className={cn(buttonVariants(), "bg-blue-900 hover:bg-blue-800 cursor-pointer")}>Salvar Cliente</button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
                <Card className="mt-4">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-blue-900">Clientes</CardTitle>
                    <form className="relative w-full max-w-sm [&_input]:uppercase">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        name="q_clientes" 
                        placeholder="Pesquisar clientes..." 
                        defaultValue={sp.q_clientes}
                        className="pl-9 h-9" 
                      />
                      <input type="hidden" name="tab" value="clientes" />
                    </form>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Doc</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead className="text-right">Renda</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientes.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              Sem clientes cadastrados.
                            </TableCell>
                          </TableRow>
                        ) : (
                          clientes.map((c) => (
                            <TableRow key={c.id}>
                              <TableCell className="font-medium">{c.nome}</TableCell>
                              <TableCell>{c.cpf || c.cnpj}</TableCell>
                              <TableCell>{c.telefone}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatBRL(c.renda || 0)}</TableCell>
                              <TableCell>
                                <Link
                                  href={buildUrl({ tab: "clientes", editCliente: String(c.id) })}
                                  className={cn(buttonVariants({ variant: "ghost" }), "h-8 px-2 text-muted-foreground hover:text-foreground")}
                                  title="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                {editClienteData && (
                  <Card id="editar-cliente" className="mt-4 scroll-mt-24">
                    <CardHeader>
                      <CardTitle className="text-blue-900">Editando cliente #{editClienteData.id}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {errorMsg && sp.editCliente && (
                        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          {errorMsg}
                        </div>
                      )}
                      <form action={updateCliente} className="grid gap-4 [&_input]:uppercase">
                        <input type="hidden" name="id" value={editClienteData.id} />
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-muted-foreground">Nome/Razão Social</div>
                            <Input name="nome" defaultValue={editClienteData.nome} placeholder="Nome/Razão Social" aria-label="Nome" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-muted-foreground">Tipo</div>
                            <FormSelect
                              name="tipo"
                              options={[
                                { value: "PF", label: "Pessoa Física" },
                                { value: "PJ", label: "Pessoa Jurídica" },
                              ]}
                              defaultValue={editClienteData.tipo || "PF"}
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-muted-foreground">CPF/CNPJ</div>
                            <Input name="doc" defaultValue={editClienteData.cpf || editClienteData.cnpj || ""} placeholder="CPF/CNPJ" aria-label="CPF/CNPJ" />
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-4">
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-muted-foreground">Matrícula</div>
                            <Input name="matricula" defaultValue={editClienteData.matricula || ""} placeholder="Matrícula" aria-label="Matrícula" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-muted-foreground">Renda/Faturamento</div>
                            <CurrencyInput name="renda" defaultValue={editClienteData.renda ?? 0} aria-label="Renda" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-muted-foreground">WhatsApp</div>
                            <MaskedInput name="telefone" mask="phone" defaultValue={editClienteData.telefone || ""} aria-label="WhatsApp" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-muted-foreground">CEP</div>
                            <MaskedInput name="cep" mask="cep" defaultValue={editClienteData.cep || ""} aria-label="CEP" />
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-muted-foreground">Empresa/Vínculo</div>
                            <Input name="empresa" defaultValue={editClienteData.empresa || ""} placeholder="Empresa/Vínculo" aria-label="Empresa" />
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Link href={buildUrl({ tab: "clientes", editCliente: undefined })} className={buttonVariants({ variant: "outline" })}>
                            Cancelar
                          </Link>
                          <button className={cn(buttonVariants(), "bg-blue-900 hover:bg-blue-800 cursor-pointer")}>Salvar alterações</button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}
              </>
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
                    Gerar Catálogo (Imprimir)
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
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-blue-900">Novo Fornecedor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form action={addFornecedor} className="grid gap-4 [&_input]:uppercase">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Nome do Fornecedor</div>
                          <Input name="nome" placeholder="Razão Social ou Nome" aria-label="Nome" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Telefone/WhatsApp</div>
                          <MaskedInput name="telefone" mask="phone" aria-label="Telefone" />
                        </div>
                      </div>
                      <div className="flex items-center justify-end">
                        <button className={cn(buttonVariants(), "bg-blue-900 hover:bg-blue-800 cursor-pointer")}>Salvar Fornecedor</button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
                <Card className="mt-4">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-blue-900">Fornecedores Cadastrados</CardTitle>
                    <form className="relative w-full max-w-sm [&_input]:uppercase">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        name="q_fornecedores" 
                        placeholder="Pesquisar fornecedores..." 
                        defaultValue={sp.q_fornecedores}
                        className="pl-9 h-9" 
                      />
                      <input type="hidden" name="tab" value="fornecedores" />
                    </form>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fornecedores.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                              Sem fornecedores cadastrados.
                            </TableCell>
                          </TableRow>
                        ) : (
                          fornecedores.map((f) => (
                            <TableRow key={f.id}>
                              <TableCell className="font-medium">{f.nome}</TableCell>
                              <TableCell>{f.telefone}</TableCell>
                              <TableCell>
                                <Link
                                  href={buildUrl({ tab: "fornecedores", editFornecedor: String(f.id) })}
                                  className={cn(buttonVariants({ variant: "ghost" }), "h-8 px-2 text-muted-foreground hover:text-foreground")}
                                  title="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                {editFornecedorData && (
                  <Card id="editar-fornecedor" className="mt-4 scroll-mt-24">
                    <CardHeader>
                      <CardTitle className="text-blue-900">Editando fornecedor #{editFornecedorData.id}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form action={updateFornecedor} className="grid gap-4 [&_input]:uppercase">
                        <input type="hidden" name="id" value={editFornecedorData.id} />
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-muted-foreground">Nome do Fornecedor</div>
                            <Input name="nome" defaultValue={editFornecedorData.nome} placeholder="Razão Social ou Nome" aria-label="Nome" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-muted-foreground">Telefone/WhatsApp</div>
                            <MaskedInput name="telefone" mask="phone" defaultValue={editFornecedorData.telefone || ""} aria-label="Telefone" />
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Link href={buildUrl({ tab: "fornecedores", editFornecedor: undefined })} className={buttonVariants({ variant: "outline" })}>
                            Cancelar
                          </Link>
                          <button className={cn(buttonVariants(), "bg-blue-900 hover:bg-blue-800 cursor-pointer")}>Salvar alterações</button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}
              </>
            ),
          },
          {
            value: "empresas",
            label: "Empresas",
            content: (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-blue-900">Nova Empresa</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form action={addEmpresa} className="grid gap-4 [&_input]:uppercase">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Empresa</div>
                          <Input name="nome" placeholder="Empresa" aria-label="Nome" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Responsável RH</div>
                          <Input name="rh" placeholder="Responsável RH" aria-label="Responsável RH" />
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Telefone RH</div>
                          <MaskedInput name="tel" mask="phone" aria-label="Telefone RH" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Email RH</div>
                          <Input name="email" placeholder="Email RH" aria-label="Email RH" />
                        </div>
                      </div>
                      <div className="flex items-center justify-end">
                        <button className={cn(buttonVariants(), "bg-blue-900 hover:bg-blue-800 cursor-pointer")}>Salvar Empresa</button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
                <Card className="mt-4">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-blue-900">Empresas Parceiras</CardTitle>
                    <form className="relative w-full max-w-sm [&_input]:uppercase">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        name="q_empresas" 
                        placeholder="Pesquisar empresas..." 
                        defaultValue={sp.q_empresas}
                        className="pl-9 h-9" 
                      />
                      <input type="hidden" name="tab" value="empresas" />
                    </form>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>RH</TableHead>
                          <TableHead>Contato</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {empresas.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              Sem empresas cadastradas.
                            </TableCell>
                          </TableRow>
                        ) : (
                          empresas.map((e) => (
                            <TableRow key={e.id}>
                              <TableCell className="font-medium">{e.nome}</TableCell>
                              <TableCell>{e.responsavelRh}</TableCell>
                              <TableCell>{e.telefoneRh || e.emailRh}</TableCell>
                              <TableCell>
                                <Link
                                  href={buildUrl({ tab: "empresas", editEmpresa: String(e.id) })}
                                  className={cn(buttonVariants({ variant: "ghost" }), "h-8 px-2 text-muted-foreground hover:text-foreground")}
                                  title="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                {editEmpresaData && (
                  <Card id="editar-empresa" className="mt-4 scroll-mt-24">
                    <CardHeader>
                      <CardTitle className="text-blue-900">Editando empresa #{editEmpresaData.id}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form action={updateEmpresa} className="grid gap-4 [&_input]:uppercase">
                        <input type="hidden" name="id" value={editEmpresaData.id} />
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-muted-foreground">Empresa</div>
                            <Input name="nome" defaultValue={editEmpresaData.nome} placeholder="Empresa" aria-label="Nome" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-muted-foreground">Responsável RH</div>
                            <Input name="rh" defaultValue={editEmpresaData.responsavelRh || ""} placeholder="Responsável RH" aria-label="Responsável RH" />
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-muted-foreground">Telefone RH</div>
                            <MaskedInput name="tel" mask="phone" defaultValue={editEmpresaData.telefoneRh || ""} aria-label="Telefone RH" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-muted-foreground">Email RH</div>
                            <Input name="email" type="email" defaultValue={editEmpresaData.emailRh || ""} placeholder="Email RH" aria-label="Email RH" />
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Link href={buildUrl({ tab: "empresas", editEmpresa: undefined })} className={buttonVariants({ variant: "outline" })}>
                            Cancelar
                          </Link>
                          <button className={cn(buttonVariants(), "bg-blue-900 hover:bg-blue-800 cursor-pointer")}>Salvar alterações</button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
