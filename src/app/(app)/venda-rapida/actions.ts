"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/lib/action-response";
import { successResponse, errorResponse } from "@/lib/action-response";

export async function criarVenda(formData: FormData) {
  const data = String(formData.get("data") || "");
  const vendedor = String(formData.get("vendedor") || "");
  const clienteId = Number(formData.get("cliente") || 0);
  const produto = String(formData.get("produto") || "");
  const custo = Number(formData.get("custo") || 0);
  const valor = Number(formData.get("valor") || 0);
  const quantidade = Number(formData.get("quantidade") || 1);
  const frete = Number(formData.get("frete") || 0);
  const envio = Number(formData.get("envio") || 0);
  const parcelas = Number(formData.get("parcelas") || 1);
  const temNota = formData.get("temNota") === "true";
  const taxaNota = Number(formData.get("taxaNota") || 5.97);
  
  const subtotal = valor * quantidade;
  const valorDescontoNota = temNota ? (subtotal * taxaNota) / 100 : 0;
  const total = subtotal + frete;
  const parcela = parcelas > 0 ? total / parcelas : 0;
  const lucro = total - ((custo * quantidade) + envio + valorDescontoNota);

  if (!data || !vendedor || !clienteId) return;
  await prisma.venda.create({
    data: {
      dataVenda: new Date(data),
      vendedor,
      clienteId,
      produtoNome: produto,
      custoProduto: custo,
      quantidade,
      valorVenda: valor,
      valorFrete: frete,
      custoEnvio: envio,
      parcelas,
      valorParcela: parcela,
      lucroLiquido: lucro,
      antecipada: 1,
      temNota,
      taxaNota,
    },
  });
  revalidatePath("/venda-rapida");
}

/**
 * Nova action com suporte a múltiplos produtos e parcelas com datas
 */
export async function criarVendaV2(formData: FormData): Promise<ActionResponse> {
  try {
    const data = String(formData.get("data") || "");
    const vendedor = String(formData.get("vendedor") || "");
    const clienteId = Number(formData.get("clienteId") || 0);
    const frete = Number(formData.get("frete") || 0);
    const envio = Number(formData.get("envio") || 0);
    const parcelas = Number(formData.get("parcelas") || 1);
    const temNota = formData.get("temNota") === "true";
    const taxaNota = Number(formData.get("taxaNota") || 5.97);

    // Parse produtos (JSON)
    const produtosJson = formData.get("produtos");
    if (!produtosJson) {
      return errorResponse("Nenhum produto informado");
    }

    const produtos: Array<{
      produtoNome: string;
      custoProduto: number;
      valorVenda: number;
      quantidade: number;
      subtotal: number;
    }> = JSON.parse(String(produtosJson));

    if (produtos.length === 0) {
      return errorResponse("Adicione pelo menos um produto");
    }

    // Parse parcelas com datas (opcional)
    const parcelasJson = formData.get("parcelasVencimento");
    const parcelasVencimento: Array<{
      numeroParcela: number;
      dataVencimento: string;
      valorParcela: number;
    }> = parcelasJson ? JSON.parse(String(parcelasJson)) : [];

    // Validações
    if (!data || !vendedor || !clienteId) {
      return errorResponse("Preencha todos os campos obrigatórios");
    }

    // Cálculos totais
    const subtotalProdutos = produtos.reduce((sum, p) => sum + p.subtotal, 0);
    const totalVenda = subtotalProdutos + frete;
    const valorDescontoNota = temNota ? (subtotalProdutos * taxaNota) / 100 : 0;
    const custoTotal =
      produtos.reduce((sum, p) => sum + p.custoProduto * p.quantidade, 0) + envio + valorDescontoNota;
    const lucroLiquido = totalVenda - custoTotal;
    const valorParcela = parcelas > 0 ? totalVenda / parcelas : 0;

    // Criar venda com transação
    const venda = await prisma.$transaction(async (tx) => {
      // 1. Criar venda principal
      const vendaCriada = await tx.venda.create({
        data: {
          dataVenda: new Date(data),
          vendedor,
          clienteId,
          // Campos deprecated (para compatibilidade)
          produtoNome: produtos[0]?.produtoNome || "",
          custoProduto: produtos[0]?.custoProduto || 0,
          quantidade: produtos[0]?.quantidade || 1,
          valorVenda: produtos[0]?.valorVenda || 0,
          // Campos novos
          valorFrete: frete,
          custoEnvio: envio,
          parcelas,
          valorParcela,
          lucroLiquido,
          antecipada: 1,
          temNota,
          taxaNota,
        },
      });

      // 2. Criar itens da venda
      await tx.itemVenda.createMany({
        data: produtos.map((p) => ({
          vendaId: vendaCriada.id,
          produtoNome: p.produtoNome,
          custoProduto: p.custoProduto,
          valorVenda: p.valorVenda,
          quantidade: p.quantidade,
          subtotal: p.subtotal,
        })),
      });

      // 3. Criar parcelas com datas (se informado)
      if (parcelasVencimento.length > 0) {
        await tx.parcelaVencimento.createMany({
          data: parcelasVencimento.map((p) => ({
            vendaId: vendaCriada.id,
            numeroParcela: p.numeroParcela,
            dataVencimento: new Date(p.dataVencimento),
            valorParcela: p.valorParcela,
            paga: false,
          })),
        });
      } else if (parcelas > 1) {
        // Gerar parcelas automaticamente se não informado
        const hoje = new Date();
        const parcelasAuto = Array.from({ length: parcelas }).map((_, i) => {
          const dataVenc = new Date(hoje);
          dataVenc.setMonth(dataVenc.getMonth() + i + 1);
          dataVenc.setDate(10); // Padrão: dia 10

          return {
            vendaId: vendaCriada.id,
            numeroParcela: i + 1,
            dataVencimento: dataVenc,
            valorParcela,
            paga: false,
          };
        });

        await tx.parcelaVencimento.createMany({
          data: parcelasAuto,
        });
      }

      return vendaCriada;
    });

    revalidatePath("/venda-rapida");
    revalidatePath("/historico");
    revalidatePath("/dashboard");

    return successResponse(`Venda #${venda.id} criada com sucesso!`, { vendaId: venda.id });
  } catch (error) {
    console.error("Erro ao criar venda:", error);
    return errorResponse("Erro ao processar a venda. Tente novamente.");
  }
}
