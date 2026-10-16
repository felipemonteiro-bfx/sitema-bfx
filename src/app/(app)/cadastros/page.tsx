import { prisma } from "@/lib/db";
import { fuzzyFindProdutos, unaccentFindClienteIds } from "@/lib/db-search";
import { buttonVariants } from "@/components/ui/button-variants";
import { formatBRL, cn } from "@/lib/utils";
import {
  revalidarCliente,
  revalidarProduto,
  revalidarFornecedor,
  revalidarEmpresa,
} from "@/lib/revalidacao";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma";
import { QueryTabs } from "@/components/query-tabs";
import ProdutoFormClient from "@/components/produto-form-client";
import ProdutosTabClient from "@/components/produtos-tab-client";
import ClientesTabClient from "@/components/clientes-tab-client";
import FornecedoresTabClient from "@/components/fornecedores-tab-client";
import EmpresasTabClient from "@/components/empresas-tab-client";
import type { RegraEmpresaLinha } from "@/components/regras-empresa-section";
import { LinkCatalogoButton } from "@/components/link-catalogo-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { createAuditLog } from "@/lib/audit";
import { requireAdminOrThrow, requireSessionOrThrow } from "@/lib/guards";
import { classificarNomeFornecedor } from "@/lib/fornecedor-import";
import { recalcularConsignadoPendentes, recalcularConsignadoSeguro } from "@/lib/consignado-db";
import { validarDiaRelatorioMensal } from "@/lib/relatorio-mensal-config";
import { normalizarEmailsCopia } from "@/lib/email-copia";

type Search = { tab?: string; q_clientes?: string; q_produtos?: string; q_fornecedores?: string; q_empresas?: string; editCliente?: string; editProduto?: string; editFornecedor?: string; editEmpresa?: string; error?: string; faixa_consignado?: string; empresa_parceira?: string };

function normalizeUppercase(value: FormDataEntryValue | null) {
  return String(value || "").trim().toLocaleUpperCase("pt-BR");
}

export async function addCliente(formData: FormData) {
  "use server";
  await requireSessionOrThrow();
  const nome = normalizeUppercase(formData.get("nome"));
  const tipo = String(formData.get("tipo") || "PF");
  if (!nome) return;
  const empresaParceiraIdRaw = Number(formData.get("empresaParceiraId") || 0);
  const empresaParceiraId = empresaParceiraIdRaw > 0 ? empresaParceiraIdRaw : null;
  const dataNascimentoStr = String(formData.get("dataNascimento") || "").trim();
  try {
    const cliente = await prisma.cliente.create({
      data: {
        nome,
        cpf: tipo === "PF" ? normalizeUppercase(formData.get("doc")) : null,
        cnpj: tipo === "PJ" ? normalizeUppercase(formData.get("doc")) : null,
        renda: Number(formData.get("renda") || 0),
        empresa: normalizeUppercase(formData.get("empresa")),
        empresaParceiraId,
        telefone: normalizeUppercase(formData.get("telefone")),
        cep: normalizeUppercase(formData.get("cep")),
        matricula: normalizeUppercase(formData.get("matricula")),
        tipo,
        dataNascimento: dataNascimentoStr ? new Date(dataNascimentoStr) : null,
      },
    });
    await createAuditLog("cliente:create", { clienteId: cliente.id, nome });
    await recalcularConsignadoSeguro(cliente.id);
    revalidarCliente();
  } catch (e) {
    const isUniqueError = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
    redirect(`/cadastros?tab=clientes&error=${isUniqueError ? "nome_duplicado" : "salvar_falhou"}`);
  }
}

export async function updateCliente(formData: FormData) {
  "use server";
  await requireSessionOrThrow();
  const id = Number(formData.get("id") || 0);
  const nome = normalizeUppercase(formData.get("nome"));
  const tipo = String(formData.get("tipo") || "PF");
  if (!id || !nome) return;
  const empresaParceiraIdRaw = Number(formData.get("empresaParceiraId") || 0);
  const empresaParceiraId = empresaParceiraIdRaw > 0 ? empresaParceiraIdRaw : null;
  const dataNascimentoStr = String(formData.get("dataNascimento") || "").trim();
  try {
    await prisma.cliente.update({
      where: { id },
      data: {
        nome,
        cpf: tipo === "PF" ? normalizeUppercase(formData.get("doc")) : null,
        cnpj: tipo === "PJ" ? normalizeUppercase(formData.get("doc")) : null,
        renda: Number(formData.get("renda") || 0),
        empresa: normalizeUppercase(formData.get("empresa")),
        empresaParceiraId,
        telefone: normalizeUppercase(formData.get("telefone")),
        cep: normalizeUppercase(formData.get("cep")),
        matricula: normalizeUppercase(formData.get("matricula")),
        tipo,
        dataNascimento: dataNascimentoStr ? new Date(dataNascimentoStr) : null,
      },
    });
    await createAuditLog("cliente:update", { clienteId: id, nome });
    await recalcularConsignadoSeguro(id);
    revalidarCliente();
  } catch (e) {
    const isUniqueError = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
    redirect(`/cadastros?tab=clientes&editCliente=${id}&error=${isUniqueError ? "nome_duplicado" : "salvar_falhou"}`);
  }
  redirect("/cadastros?tab=clientes");
}

async function bulkDeleteClientes(ids: number[]) {
  "use server";
  // Mesmo buraco de RBAC ja fechado em bulkDeleteFornecedores: /cadastros esta
  // no menu do vendedor, entao ele recebe o Action ID no bundle e podia chamar
  // esta action direto. Guarda antes de qualquer efeito, inclusive antes do
  // early-return de lista vazia.
  await requireAdminOrThrow();
  if (!ids.length) return;
  const clientes = await prisma.cliente.findMany({ where: { id: { in: ids } }, select: { id: true, nome: true } });
  await prisma.cliente.deleteMany({ where: { id: { in: ids } } });
  for (const c of clientes) {
    await createAuditLog("cliente:delete", { clienteId: c.id, nome: c.nome });
  }
  revalidarCliente();
}

export async function addProduto(formData: FormData) {
  "use server";
  await requireSessionOrThrow();
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
  revalidarProduto();
}

export async function updateProduto(formData: FormData) {
  "use server";
  await requireSessionOrThrow();
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
  revalidarProduto();
}

async function deleteProduto(formData: FormData) {
  "use server";
  // Coerencia com bulkDeleteProdutos: sem esta guarda, a exigencia de admin no
  // bulk seria contornavel apagando um produto de cada vez.
  await requireAdminOrThrow();
  const id = Number(formData.get("id") || 0);
  if (!id) return;
  const produto = await prisma.produto.findUnique({ where: { id }, select: { nome: true } });
  if (!produto) return;
  await prisma.produto.delete({ where: { id } });
  await createAuditLog("produto:delete", { produtoId: id, nome: produto.nome });
  revalidarProduto();
}

async function bulkDeleteProdutos(ids: number[]) {
  "use server";
  await requireAdminOrThrow();
  if (!ids.length) return;
  const produtos = await prisma.produto.findMany({ where: { id: { in: ids } }, select: { id: true, nome: true } });
  await prisma.produto.deleteMany({ where: { id: { in: ids } } });
  for (const p of produtos) {
    await createAuditLog("produto:delete", { produtoId: p.id, nome: p.nome });
  }
  revalidarProduto();
}

export async function addFornecedor(formData: FormData) {
  "use server";
  await requireAdminOrThrow();
  const telefone = normalizeUppercase(formData.get("telefone"));
  // D-03: nome ja existe soft-deletado reativa o registro (limpa deletedAt)
  // em vez de tentar inserir e estourar o @unique de `nome`.
  const candidatos = await prisma.fornecedor.findMany({
    select: { id: true, nome: true, deletedAt: true },
  });
  const classificacao = classificarNomeFornecedor(formData.get("nome"), candidatos);

  if (classificacao.acao === "erro") return;

  if (classificacao.acao === "criar") {
    const fornecedor = await prisma.fornecedor.create({
      data: { nome: classificacao.nomeNormalizado, telefone },
    });
    await createAuditLog("fornecedor:create", {
      fornecedorId: fornecedor.id,
      nome: classificacao.nomeNormalizado,
    });
    revalidarFornecedor();
    return;
  }

  if (classificacao.acao === "reativar" && classificacao.id != null) {
    await prisma.fornecedor.update({
      where: { id: classificacao.id },
      data: { deletedAt: null, telefone },
    });
    await createAuditLog("fornecedor:restore", {
      fornecedorId: classificacao.id,
      nome: classificacao.nomeNormalizado,
    });
    revalidarFornecedor();
    return;
  }

  // "ignorar": nao escreve nada, apenas revalida.
  revalidarFornecedor();
}

export async function updateFornecedor(formData: FormData) {
  "use server";
  await requireAdminOrThrow();
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
  revalidarFornecedor();
  redirect("/cadastros?tab=fornecedores");
}

export async function bulkDeleteFornecedores(ids: number[]) {
  "use server";
  // D-04: buraco de RBAC encontrado nesta fase — qualquer usuario autenticado
  // conseguia apagar o cadastro inteiro de fornecedores. Guarda de admin antes
  // de qualquer efeito, inclusive antes do early-return de lista vazia.
  await requireAdminOrThrow();
  if (!ids.length) return;
  const fornecedores = await prisma.fornecedor.findMany({ where: { id: { in: ids }, deletedAt: null }, select: { id: true, nome: true } });
  // D-02: exclusao passa a ser logica — preserva a linha e o fornecedor_id
  // historico dos produtos em vez de apagar de vez.
  await prisma.fornecedor.updateMany({ where: { id: { in: ids }, deletedAt: null }, data: { deletedAt: new Date() } });
  for (const f of fornecedores) {
    await createAuditLog("fornecedor:delete", { fornecedorId: f.id, nome: f.nome });
  }
  revalidarFornecedor();
}

/** "Em cópia" do cadastro da empresa: normaliza ou lança dizendo qual endereço não passa. */
function validarEmailCopia(valor: FormDataEntryValue | null): string | null {
  const r = normalizarEmailsCopia(String(valor ?? ""));
  if (!r.ok) throw new Error(`E-mail em cópia inválido: ${r.invalidos.join(", ")}`);
  return r.valor;
}

export async function addEmpresa(formData: FormData) {
  "use server";
  await requireAdminOrThrow();
  const nome = normalizeUppercase(formData.get("nome"));
  if (!nome) return;
  const cnpjRaw = String(formData.get("cnpj") || "").trim();
  const emailsExtrasRaw = String(formData.get("emailsExtras") || "").trim().toLowerCase();
  const diaRelatorioMensal = validarDiaRelatorioMensal(formData.get("diaRelatorioMensal"));
  const emailCopia = validarEmailCopia(formData.get("emailCopia"));
  await prisma.empresaParceira.create({
    data: {
      nome,
      responsavelRh: normalizeUppercase(formData.get("rh")),
      telefoneRh: normalizeUppercase(formData.get("tel")),
      emailRh: String(formData.get("email") || "").trim().toLowerCase() || null,
      cnpj: cnpjRaw ? cnpjRaw.toLocaleUpperCase("pt-BR") : null,
      emailsExtras: emailsExtrasRaw || null,
      emailCopia,
      diaRelatorioMensal,
    },
  });
  revalidarEmpresa();
}

export async function updateEmpresa(formData: FormData) {
  "use server";
  await requireAdminOrThrow();
  const id = Number(formData.get("id") || 0);
  const nome = normalizeUppercase(formData.get("nome"));
  if (!id || !nome) return;
  const cnpjRaw = String(formData.get("cnpj") || "").trim();
  const emailsExtrasRaw = String(formData.get("emailsExtras") || "").trim().toLowerCase();
  const diaRelatorioMensal = validarDiaRelatorioMensal(formData.get("diaRelatorioMensal"));
  const emailCopia = validarEmailCopia(formData.get("emailCopia"));
  await prisma.empresaParceira.update({
    where: { id },
    data: {
      nome,
      responsavelRh: normalizeUppercase(formData.get("rh")),
      telefoneRh: normalizeUppercase(formData.get("tel")),
      emailRh: String(formData.get("email") || "").trim().toLowerCase() || null,
      cnpj: cnpjRaw ? cnpjRaw.toLocaleUpperCase("pt-BR") : null,
      emailsExtras: emailsExtrasRaw || null,
      emailCopia,
      diaRelatorioMensal,
    },
  });
  await createAuditLog("empresa:update", { empresaId: id, nome });
  revalidarEmpresa();
  redirect("/cadastros?tab=empresas");
}

async function bulkDeleteEmpresas(ids: number[]) {
  "use server";
  await requireAdminOrThrow();
  if (!ids.length) return;
  const empresas = await prisma.empresaParceira.findMany({ where: { id: { in: ids } }, select: { id: true, nome: true } });
  await prisma.empresaParceira.deleteMany({ where: { id: { in: ids } } });
  for (const e of empresas) {
    await createAuditLog("empresa:delete", { empresaId: e.id, nome: e.nome });
  }
  revalidarEmpresa();
}

async function vincularEmpresas(empresaId: number, vinculadaIds: number[]) {
  "use server";
  await requireAdminOrThrow();
  if (!empresaId) return;
  try {
    // Remove all existing vinculos for this empresa
    await prisma.empresaVinculo.deleteMany({ where: { empresaId } });
    // Create new vinculos (symmetric: A->B and B->A)
    if (vinculadaIds.length > 0) {
      const pairs = vinculadaIds.flatMap((vid) => [
        { empresaId, vinculadaId: vid },
        { empresaId: vid, vinculadaId: empresaId },
      ]);
      // Use upsert-style: delete duplicates first
      const uniquePairs = pairs.filter(
        (p, idx, arr) =>
          arr.findIndex((x) => x.empresaId === p.empresaId && x.vinculadaId === p.vinculadaId) === idx
      );
      await prisma.empresaVinculo.createMany({ data: uniquePairs, skipDuplicates: true });
    }
    await createAuditLog("empresa:vincular", { empresaId, vinculadaIds });
    revalidarEmpresa();
  } catch (err) {
    console.error("[vincularEmpresas]", err);
  }
}

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const editClienteId = sp.editCliente ? Number(sp.editCliente) : 0;
  const editProdutoId = sp.editProduto ? Number(sp.editProduto) : 0;
  const editFornecedorId = sp.editFornecedor ? Number(sp.editFornecedor) : 0;
  const editEmpresaId = sp.editEmpresa ? Number(sp.editEmpresa) : 0;

  const editClienteData = editClienteId ? await prisma.cliente.findUnique({
    where: { id: editClienteId },
    select: { id: true, nome: true, cpf: true, cnpj: true, renda: true, empresa: true, matricula: true, telefone: true, cep: true, tipo: true, empresaParceiraId: true, dataNascimento: true, pctConsignado: true, faixaConsignado: true },
  }) : null;
  const editProdutoData = editProdutoId ? await prisma.produto.findUnique({
    where: { id: editProdutoId },
    select: { id: true, nome: true, custoPadrao: true, marca: true, categoria: true, ncm: true, imagem: true, valorVenda: true, qtdEstoque: true, fornecedorId: true, dataCompra: true, fornecedor: { select: { id: true, nome: true } } },
  }) : null;
  // findFirst (nao findUnique): o where combina `id` com `deletedAt: null`, e
  // `deletedAt` nao e coluna unica.
  const editFornecedorData = editFornecedorId ? await prisma.fornecedor.findFirst({
    where: { id: editFornecedorId, deletedAt: null },
    select: { id: true, nome: true, telefone: true },
  }) : null;
  const editEmpresaData = editEmpresaId ? await prisma.empresaParceira.findUnique({
    where: { id: editEmpresaId },
    select: { id: true, nome: true, responsavelRh: true, telefoneRh: true, emailRh: true, cnpj: true, emailsExtras: true, emailCopia: true, diaRelatorioMensal: true },
  }).catch(() => null) : null;

  const errorMsg = sp.error === "nome_duplicado"
    ? "Ja existe um cliente com esse nome. Use um nome diferente."
    : sp.error === "salvar_falhou"
    ? "Erro ao salvar. Tente novamente."
    : null;

  // Nome vai por f_unaccent (ver db-search): `contains` + `mode: insensitive` so
  // ignora maiuscula, nao ignora acento — buscar "JOSE" nao achava
  // "JOSÉ LOPES DOLZANE", que existia e so aparecia no aviso de duplicado.
  const clienteIdsPorNome = sp.q_clientes
    ? await unaccentFindClienteIds(sp.q_clientes)
    : [];

  // A faixa de consignado é cache que depende do mês corrente: antes de listar e
  // filtrar, recalcula quem nunca foi calculado ou ficou no mês anterior.
  try {
    await recalcularConsignadoPendentes();
  } catch (e) {
    console.error("[consignado] Falha no recalculo pendente:", e);
  }

  const faixaConsignado = sp.faixa_consignado;
  const empresaParceiraFiltro = Number(sp.empresa_parceira || 0);
  const clientes = await prisma.cliente.findMany({
    where: {
      ...(sp.q_clientes ? {
        OR: [
          { id: { in: clienteIdsPorNome } },
          { cpf: { contains: sp.q_clientes, mode: 'insensitive' } },
          { cnpj: { contains: sp.q_clientes, mode: 'insensitive' } },
        ]
      } : {}),
      ...(faixaConsignado ? { faixaConsignado } : {}),
      ...(empresaParceiraFiltro > 0 ? { empresaParceiraId: empresaParceiraFiltro } : {}),
    },
    select: { id: true, nome: true, cpf: true, cnpj: true, renda: true, empresa: true, matricula: true, telefone: true, cep: true, tipo: true, empresaParceiraId: true, dataNascimento: true, pctConsignado: true, faixaConsignado: true },
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

  const empresasRaw = await prisma.empresaParceira.findMany({
    where: sp.q_empresas ? {
      nome: { contains: sp.q_empresas, mode: 'insensitive' }
    } : {},
    orderBy: { nome: "asc" },
  });

  // Try to include vinculos and client count — table may not exist on older deployments
  type EmpresaWithVinculos = typeof empresasRaw[0] & {
    vinculos?: { vinculada: { id: number; nome: string } }[];
    _count?: { clientes: number };
  };
  let empresas: EmpresaWithVinculos[] = empresasRaw;
  try {
    const withVinculos = await prisma.empresaParceira.findMany({
      where: sp.q_empresas ? { nome: { contains: sp.q_empresas, mode: 'insensitive' } } : {},
      orderBy: { nome: "asc" },
      include: {
        vinculos: { include: { vinculada: { select: { id: true, nome: true } } } },
        _count: { select: { clientes: true } },
      },
    });
    empresas = withVinculos;
  } catch {
    // Table not yet migrated, use raw without vinculos
  }

  // Regras por período (spec 2026-09-30 §3.1). A edição da empresa abre num painel no cliente,
  // sem navegar, então as regras de todas as empresas vão junto (a tabela é pequena).
  const regrasPorEmpresa: Record<number, RegraEmpresaLinha[]> = {};
  try {
    const regras = await prisma.regraEmpresa.findMany({
      orderBy: [{ empresaParceiraId: "asc" }, { vigenteDe: "asc" }],
      select: { id: true, empresaParceiraId: true, vigenteDe: true, vigenteAte: true, diaCorte: true, diaVencimento: true, diaPix: true, repassePct: true, cobrancaViaBfx: true },
    });
    for (const { empresaParceiraId, ...r } of regras) (regrasPorEmpresa[empresaParceiraId] ??= []).push(r);
  } catch {
    // Tabela regras_empresa ainda nao migrada: a secao aparece vazia.
  }

  const fornecedores = await prisma.fornecedor.findMany({
    where: sp.q_fornecedores ? {
      deletedAt: null,
      nome: { contains: sp.q_fornecedores, mode: 'insensitive' }
    } : { deletedAt: null },
    orderBy: { nome: "asc" }
  });

  const spPlain: Record<string, string | undefined> = {
    tab: sp.tab,
    q_clientes: sp.q_clientes,
    q_produtos: sp.q_produtos,
    q_fornecedores: sp.q_fornecedores,
    q_empresas: sp.q_empresas,
    faixa_consignado: sp.faixa_consignado,
    empresa_parceira: sp.empresa_parceira,
    editCliente: sp.editCliente,
    editProduto: sp.editProduto,
    editFornecedor: sp.editFornecedor,
    editEmpresa: sp.editEmpresa,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cadastros"
        description="Base de clientes, produtos, fornecedores e empresas."
        breadcrumbs={[{ label: "Cadastros" }]}
      />
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
                empresasParceiras={empresasRaw.map(e => ({ id: e.id, nome: e.nome }))}
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
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M8 7h6"/><path d="M8 11h8"/></svg>
                    Gerar Catalogo (Imprimir)
                  </a>
                  <LinkCatalogoButton />
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Novo Produto</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ProdutoFormClient
                      onSuccessAction={addProduto}
                      fornecedores={fornecedores.map(f => ({ id: f.id, nome: f.nome }))}
                      categoriasExistentes={categoriasExistentes}
                    />
                  </CardContent>
                </Card>
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
                regrasPorEmpresa={regrasPorEmpresa}
                searchQuery={sp.q_empresas}
                searchParams={spPlain}
                onAddAction={addEmpresa}
                onUpdateAction={updateEmpresa}
                onBulkDeleteAction={bulkDeleteEmpresas}
                onVincularAction={vincularEmpresas}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
