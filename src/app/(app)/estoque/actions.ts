"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";
import { getSession } from "@/lib/session";

export async function registrarEntradaEstoque(formData: FormData) {
  const session = await getSession();
  const usuario = session?.nomeExibicao ?? session?.username ?? "Sistema";

  const produtoId = Number(formData.get("produtoId") || 0);
  const quantidade = Number(formData.get("quantidade") || 0);
  const custoUnitario = Number(formData.get("custoUnitario") || 0);
  const temNota = formData.get("temNota") === "true";
  const notaFiscal = String(formData.get("notaFiscal") || "").trim();
  const chaveNfe = String(formData.get("chaveNfe") || "").replace(/\D/g, "").trim();
  const fornecedorId = formData.get("fornecedorId") ? Number(formData.get("fornecedorId")) : null;
  const observacao = String(formData.get("observacao") || "").trim();

  if (!produtoId || quantidade <= 0) return;

  const motivoTipo = temNota ? "COMPRA_COM_NOTA" : "COMPRA_SEM_NOTA";

  await prisma.$transaction(async (tx) => {
    const produto = await tx.produto.findUnique({
      where: { id: produtoId },
      select: { id: true, qtdEstoque: true, nome: true },
    });
    if (!produto) throw new Error("Produto não encontrado");

    await tx.produto.update({
      where: { id: produtoId },
      data: {
        qtdEstoque: (produto.qtdEstoque ?? 0) + quantidade,
        ...(custoUnitario > 0 ? { custoPadrao: custoUnitario } : {}),
      },
    });

    await tx.movimentoEstoque.create({
      data: {
        produtoId,
        tipo: "ENTRADA",
        quantidade,
        custoUnitario: custoUnitario || null,
        motivoTipo,
        observacao: observacao || null,
        notaFiscal: temNota && notaFiscal ? notaFiscal : null,
        chaveNfe: temNota && chaveNfe.length === 44 ? chaveNfe : null,
        fornecedorId,
        usuario,
      },
    });
  });

  await createAuditLog("estoque:entrada", { produtoId, quantidade, motivoTipo, notaFiscal: notaFiscal || undefined, chaveNfe: chaveNfe || undefined });

  revalidatePath("/estoque");
  revalidatePath("/cadastros");
  revalidatePath("/dashboard");
}

export async function registrarSaidaManual(formData: FormData) {
  const session = await getSession();
  const usuario = session?.nomeExibicao ?? session?.username ?? "Sistema";

  const produtoId = Number(formData.get("produtoId") || 0);
  const quantidade = Number(formData.get("quantidade") || 0);
  const motivoTipo = String(formData.get("motivoTipo") || "AJUSTE");
  const observacao = String(formData.get("observacao") || "").trim();

  if (!produtoId || quantidade <= 0) return;

  await prisma.$transaction(async (tx) => {
    const produto = await tx.produto.findUnique({
      where: { id: produtoId },
      select: { id: true, qtdEstoque: true, nome: true },
    });
    if (!produto) throw new Error("Produto não encontrado");

    const novoEstoque = Math.max((produto.qtdEstoque ?? 0) - quantidade, 0);

    await tx.produto.update({
      where: { id: produtoId },
      data: { qtdEstoque: novoEstoque },
    });

    await tx.movimentoEstoque.create({
      data: {
        produtoId,
        tipo: "SAIDA",
        quantidade,
        motivoTipo,
        observacao: observacao || null,
        usuario,
      },
    });
  });

  await createAuditLog("estoque:saida", { produtoId, quantidade, motivoTipo });

  revalidatePath("/estoque");
  revalidatePath("/cadastros");
  revalidatePath("/dashboard");
}

export async function registrarEntradaLote(formData: FormData) {
  const session = await getSession();
  const usuario = session?.nomeExibicao ?? session?.username ?? "Sistema";

  const itensJson = formData.get("itens");
  if (!itensJson) return;

  let itens: Array<{ produtoId: number; quantidade: number; custoUnitario: number }>;
  try {
    itens = JSON.parse(String(itensJson));
  } catch {
    return;
  }

  const temNota = formData.get("temNota") === "true";
  const notaFiscal = String(formData.get("notaFiscal") || "").trim();
  const chaveNfe = String(formData.get("chaveNfe") || "").replace(/\D/g, "").trim();
  const fornecedorId = formData.get("fornecedorId") ? Number(formData.get("fornecedorId")) : null;
  const observacao = String(formData.get("observacao") || "").trim();

  const motivoTipo = temNota ? "COMPRA_COM_NOTA" : "COMPRA_SEM_NOTA";

  await prisma.$transaction(async (tx) => {
    for (const item of itens) {
      if (!item.produtoId || item.quantidade <= 0) continue;

      const produto = await tx.produto.findUnique({
        where: { id: item.produtoId },
        select: { id: true, qtdEstoque: true },
      });
      if (!produto) continue;

      await tx.produto.update({
        where: { id: item.produtoId },
        data: {
          qtdEstoque: (produto.qtdEstoque ?? 0) + item.quantidade,
          ...(item.custoUnitario > 0 ? { custoPadrao: item.custoUnitario } : {}),
        },
      });

      await tx.movimentoEstoque.create({
        data: {
          produtoId: item.produtoId,
          tipo: "ENTRADA",
          quantidade: item.quantidade,
          custoUnitario: item.custoUnitario || null,
          motivoTipo,
          observacao: observacao || null,
          notaFiscal: temNota && notaFiscal ? notaFiscal : null,
          chaveNfe: temNota && chaveNfe.length === 44 ? chaveNfe : null,
          fornecedorId,
          usuario,
        },
      });
    }
  });

  await createAuditLog("estoque:entrada_lote", { itens: itens.length, motivoTipo, notaFiscal: notaFiscal || undefined, chaveNfe: chaveNfe || undefined });

  revalidatePath("/estoque");
  revalidatePath("/cadastros");
  revalidatePath("/dashboard");
}

export async function atualizarEstoqueMinimo(formData: FormData) {
  const produtoId = Number(formData.get("produtoId") || 0);
  const estoqueMinimo = Number(formData.get("estoqueMinimo") || 5);

  if (!produtoId) return;

  await prisma.produto.update({
    where: { id: produtoId },
    data: { estoqueMinimo },
  });

  revalidatePath("/estoque");
  revalidatePath("/dashboard");
}
