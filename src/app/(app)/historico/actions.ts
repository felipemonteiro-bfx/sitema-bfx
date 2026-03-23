"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import fs from "fs";

export async function updateVenda(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const id = Number(formData.get("id") || 0);
  const data = String(formData.get("data") || "");
  const frete = Number(formData.get("frete") || 0);
  const envio = Number(formData.get("envio") || 0);
  const temNota = formData.get("temNota") === "on";
  const taxaNota = Number(formData.get("taxaNota") || 5.97);
  const descontoEmFolha = formData.get("descontoEmFolha") === "on";
  let boleto = formData.get("boleto") === "on";
  if (descontoEmFolha && boleto) boleto = false;

  type ItemForm = { produtoNome: string; custoProduto: number; valorVenda: number; quantidade: number; subtotal: number };
  let itens: ItemForm[] = [];
  const itensRaw = formData.get("itensJson");
  if (itensRaw) {
    try { itens = JSON.parse(String(itensRaw)); } catch { /* ignore */ }
  }

  const valorLegado = itens.length > 0 ? 0 : Number(formData.get("valor") || 0);
  const quantidadeLegado = itens.length > 0 ? 0 : Number(formData.get("quantidade") || 1);
  const custoLegado = itens.length > 0 ? 0 : Number(formData.get("custo_prod") || 0);

  const file = formData.get("comprovante") as File | null;

  if (!id || !data) return { success: false, error: "Dados inválidos." };

  const subtotal = itens.length > 0
    ? itens.reduce((s, i) => s + i.subtotal, 0)
    : valorLegado * quantidadeLegado;
  const totalCusto = itens.length > 0
    ? itens.reduce((s, i) => s + i.custoProduto * i.quantidade, 0)
    : custoLegado * quantidadeLegado;
  const valorDescontoNota = temNota ? (subtotal * taxaNota) / 100 : 0;
  const total = subtotal + frete;
  const lucro = total - (totalCusto + envio + valorDescontoNota);

  let comprovantePath: string | undefined = undefined;

  const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
  if (file && file.size > 0 && file.name) {
    const ext = path.extname(file.name).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      try {
        const uploadDir = path.join(process.cwd(), "public/uploads/recibos");
        if (!fs.existsSync(uploadDir)) {
          await mkdir(uploadDir, { recursive: true });
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        const baseName = path.basename(file.name, ext).replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "") || "anexo";
        const filename = `${id}-${Date.now()}-${baseName}${ext}`;
        const filePath = path.join(uploadDir, filename);
        await writeFile(filePath, buffer);
        comprovantePath = `/uploads/recibos/${filename}`;
      } catch (error) {
        console.error("Erro ao fazer upload do comprovante:", error);
      }
    }
  }

  try {
    await prisma.venda.update({
      where: { id },
      data: {
        dataVenda: new Date(data),
        vendedor: String(formData.get("vendedor") || ""),
        produtoNome: itens.length > 0 ? (itens[0].produtoNome || "") : String(formData.get("produto") || ""),
        quantidade: itens.length > 0 ? itens.reduce((s, i) => s + i.quantidade, 0) : quantidadeLegado,
        valorVenda: itens.length > 0 ? (itens[0]?.valorVenda ?? 0) : valorLegado,
        valorFrete: frete,
        custoEnvio: envio,
        parcelas: Number(formData.get("parcelas") || 1),
        temNota,
        taxaNota,
        lucroLiquido: lucro,
        descontoEmFolha,
        boleto,
        ...(comprovantePath ? { comprovantePdf: comprovantePath } : {}),
      },
    });

    if (itens.length > 0) {
      await prisma.itemVenda.deleteMany({ where: { vendaId: id } });
      await prisma.itemVenda.createMany({
        data: itens.map((item) => ({
          vendaId: id,
          produtoNome: item.produtoNome,
          custoProduto: item.custoProduto,
          valorVenda: item.valorVenda,
          quantidade: item.quantidade,
          subtotal: item.subtotal,
        })),
      });
    }

    const parcelasRaw = formData.get("parcelasVencimento");
    if (parcelasRaw) {
      try {
        const parcelasData = JSON.parse(String(parcelasRaw)) as { numeroParcela: number; dataVencimento: string; valorParcela: number }[];
        if (Array.isArray(parcelasData) && parcelasData.length > 0) {
          const existentes = await prisma.parcelaVencimento.findMany({
            where: { vendaId: id },
            select: { numeroParcela: true, paga: true, dataPagamento: true },
          });
          const pagasMap = new Map(existentes.map((p) => [p.numeroParcela, { paga: p.paga, dataPagamento: p.dataPagamento }]));

          await prisma.parcelaVencimento.deleteMany({ where: { vendaId: id } });
          await prisma.parcelaVencimento.createMany({
            data: parcelasData.map((p) => {
              const existente = pagasMap.get(p.numeroParcela);
              return {
                vendaId: id,
                numeroParcela: p.numeroParcela,
                dataVencimento: new Date(p.dataVencimento),
                valorParcela: p.valorParcela,
                paga: existente?.paga ?? false,
                dataPagamento: existente?.dataPagamento ?? null,
              };
            }),
          });
        }
      } catch {
        // Tabela parcelas_vencimento pode não existir em produção antiga
      }
    }

    await createAuditLog("venda:update", { vendaId: id, subtotal, lucro });
    revalidatePath("/historico");
    return { success: true };
  } catch (err) {
    console.error("Erro ao atualizar venda:", err);
    return { success: false, error: "Erro ao salvar alterações. Tente novamente." };
  }
}

export async function deleteVenda(formData: FormData): Promise<void> {
  const id = Number(formData.get("id") || 0);
  if (!id) return;

  // Restaurar estoque antes de deletar
  const itens = await prisma.itemVenda.findMany({
    where: { vendaId: id },
    select: { produtoNome: true, quantidade: true },
  });
  for (const item of itens) {
    await prisma.produto.updateMany({
      where: { nome: item.produtoNome },
      data: { qtdEstoque: { increment: item.quantidade } },
    });
  }

  await prisma.venda.delete({ where: { id } });
  await createAuditLog("venda:delete", { vendaId: id });
  revalidatePath("/historico");
}
