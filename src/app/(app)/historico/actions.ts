"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";
import { sendVendaNotification } from "@/lib/email";

export async function updateVenda(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const id = Number(formData.get("id") || 0);
  const data = String(formData.get("data") || "");
  const frete = Number(formData.get("frete") || 0);
  const envio = Number(formData.get("envio") || 0);
  const temNota = formData.get("temNota") === "on";
  const taxaNota = Number(formData.get("taxaNota") || 5.97);
  const desconto = Number(formData.get("desconto") || 0);
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

  if (!id || !data) return { success: false, error: "Dados inválidos." };

  const subtotal = itens.length > 0
    ? itens.reduce((s, i) => s + i.subtotal, 0)
    : valorLegado * quantidadeLegado;
  const totalCusto = itens.length > 0
    ? itens.reduce((s, i) => s + i.custoProduto * i.quantidade, 0)
    : custoLegado * quantidadeLegado;
  const valorDescontoNota = temNota ? (subtotal * taxaNota) / 100 : 0;
  const total = subtotal + frete - desconto;
  const lucro = total - (totalCusto + envio + valorDescontoNota);

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
        desconto,
        lucroLiquido: lucro,
        descontoEmFolha,
        boleto,
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

export async function enviarEmailEmpresa(vendaId: number): Promise<{ success: boolean; error?: string }> {
  if (!vendaId) return { success: false, error: "ID da venda invalido." };

  try {
    const venda = await prisma.venda.findUnique({
      where: { id: vendaId },
      include: {
        cliente: { select: { nome: true, matricula: true, empresa: true, empresaParceiraId: true } },
        itens: { select: { produtoNome: true, quantidade: true, subtotal: true } },
      },
    });

    if (!venda) return { success: false, error: "Venda nao encontrada." };
    if (!venda.cliente?.empresaParceiraId && !venda.cliente?.empresa) {
      return { success: false, error: "Cliente nao vinculado a nenhuma empresa." };
    }

    await sendVendaNotification({
      ...venda,
      cliente: venda.cliente ?? undefined,
    });

    return { success: true };
  } catch (err) {
    console.error("[enviarEmailEmpresa] Erro:", err);
    return { success: false, error: "Erro ao enviar email." };
  }
}

export async function deleteVenda(formData: FormData): Promise<void> {
  const id = Number(formData.get("id") || 0);
  if (!id) return;

  try {
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

    // Deletar registros relacionados que têm ON DELETE RESTRICT
    await prisma.assinatura.deleteMany({ where: { vendaId: id } });
    await prisma.documento.deleteMany({ where: { vendaId: id } });

    await prisma.venda.delete({ where: { id } });
    await createAuditLog("venda:delete", { vendaId: id });
    revalidatePath("/historico");
  } catch (err) {
    console.error("Erro ao excluir venda:", err);
    throw new Error("Erro ao excluir venda. Tente novamente.");
  }
}
