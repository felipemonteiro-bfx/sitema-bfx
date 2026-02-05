"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

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
