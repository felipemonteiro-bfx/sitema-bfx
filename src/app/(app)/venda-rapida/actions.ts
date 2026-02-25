"use server";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/lib/action-response";
import { successResponse, errorResponse } from "@/lib/action-response";
import { vendaV2Schema } from "@/lib/validations/venda";
import { createAuditLog } from "@/lib/audit";
import {
  getAsaasConfig,
  getOrCreateCustomer,
  createBoletoPayment,
} from "@/lib/asaas";

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
      antecipada: 0,
      temNota,
      taxaNota,
    },
  });
  revalidatePath("/venda-rapida");
}

/**
 * Nova action com suporte a múltiplos produtos e parcelas com datas
 */
export async function criarVendaV2(
  formData: FormData
): Promise<ActionResponse<{ vendaId: number; boletoUrl?: string; assinaturaToken?: string }>> {
  try {
    const produtosJson = formData.get("produtos");
    if (!produtosJson) {
      return errorResponse("Nenhum produto informado");
    }

    let produtos: Array<{ produtoNome: string; custoProduto: number; valorVenda: number; quantidade: number; subtotal: number }>;
    try {
      produtos = JSON.parse(String(produtosJson));
    } catch {
      return errorResponse("Dados de produtos inválidos");
    }

    const parcelasJson = formData.get("parcelasVencimento");
    let parcelasVencimento: Array<{ numeroParcela: number; dataVencimento: string; valorParcela: number }> = [];
    if (parcelasJson) {
      try {
        parcelasVencimento = JSON.parse(String(parcelasJson));
      } catch {
        return errorResponse("Dados de parcelas inválidos");
      }
    }

    const raw = {
      data: String(formData.get("data") || ""),
      vendedor: String(formData.get("vendedor") || ""),
      clienteId: Number(formData.get("clienteId") || 0),
      frete: Number(formData.get("frete") || 0),
      envio: Number(formData.get("envio") || 0),
      parcelas: Number(formData.get("parcelas") || 1),
      temNota: formData.get("temNota") === "true",
      taxaNota: Number(formData.get("taxaNota") || 5.97),
      produtos,
      parcelasVencimento: parcelasVencimento.length > 0 ? parcelasVencimento : undefined,
      descontoEmFolha: formData.get("descontoEmFolha") === "true",
      boleto: formData.get("boleto") === "true",
    };

    const parsed = vendaV2Schema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.flatten().fieldErrors;
      const msg = Object.values(firstError).flat().find(Boolean) || parsed.error.message;
      return errorResponse(String(msg || "Dados inválidos"));
    }

    const { data: dataStr, vendedor, clienteId, frete, envio, parcelas, temNota, taxaNota, produtos: produtosValidados, parcelasVencimento: parcelasValidadas } = parsed.data;
    // Apenas um: desconto em folha ou boleto (nunca os dois)
    const descontoEmFolha = parsed.data.descontoEmFolha ?? false;
    let boleto = parsed.data.boleto ?? false;
    if (descontoEmFolha && boleto) boleto = false;

    // Cálculos totais
    const subtotalProdutos = produtosValidados.reduce((sum, p) => sum + p.subtotal, 0);
    const totalVenda = subtotalProdutos + frete;
    const valorDescontoNota = temNota ? (subtotalProdutos * taxaNota) / 100 : 0;
    const custoTotal =
      produtosValidados.reduce((sum, p) => sum + p.custoProduto * p.quantidade, 0) + envio + valorDescontoNota;
    const lucroLiquido = totalVenda - custoTotal;
    const valorParcela = parcelas > 0 ? totalVenda / parcelas : 0;

    // Criar venda com transação
    const assinaturaToken = descontoEmFolha ? randomUUID() : undefined;

    const venda = await prisma.$transaction(async (tx) => {
      // 1. Criar venda principal
      const vendaCriada = await tx.venda.create({
        data: {
          dataVenda: new Date(dataStr),
          vendedor,
          clienteId,
          // Campos deprecated (para compatibilidade)
          produtoNome: produtosValidados[0]?.produtoNome || "",
          custoProduto: produtosValidados[0]?.custoProduto || 0,
          quantidade: produtosValidados[0]?.quantidade || 1,
          valorVenda: produtosValidados[0]?.valorVenda || 0,
          // Campos novos
          valorFrete: frete,
          custoEnvio: envio,
          parcelas,
          valorParcela,
          lucroLiquido,
          antecipada: 0,
          excedeuLimite: formData.get("excedeuLimite") === "1" ? 1 : 0,
          temNota,
          taxaNota,
          descontoEmFolha: descontoEmFolha ?? false,
          boleto: boleto ?? false,
          assinaturaToken: assinaturaToken ?? undefined,
          assinaturaStatus: descontoEmFolha ? "pendente" : undefined,
        },
      });

      // 2. Criar itens da venda
      await tx.itemVenda.createMany({
        data: produtosValidados.map((p) => ({
          vendaId: vendaCriada.id,
          produtoNome: p.produtoNome,
          custoProduto: p.custoProduto,
          valorVenda: p.valorVenda,
          quantidade: p.quantidade,
          subtotal: p.subtotal,
        })),
      });

      // 3. Criar parcelas com datas (se informado)
      if (parcelasValidadas && parcelasValidadas.length > 0) {
        await tx.parcelaVencimento.createMany({
          data: parcelasValidadas.map((p) => ({
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

    await createAuditLog("venda:create", { vendaId: venda.id, clienteId, vendedor, total: totalVenda });

    let boletoUrl: string | undefined;

    if (boleto && getAsaasConfig() && clienteId) {
      try {
        const cliente = await prisma.cliente.findUnique({
          where: { id: clienteId },
          select: {
            id: true,
            nome: true,
            cpf: true,
            cnpj: true,
            email: true,
            telefone: true,
            asaasCustomerId: true,
          },
        });
        if (cliente && (cliente.cpf || cliente.cnpj)) {
          const asaasCustomerId = await getOrCreateCustomer(
            {
              id: cliente.id,
              nome: cliente.nome,
              cpf: cliente.cpf,
              cnpj: cliente.cnpj,
              email: cliente.email,
              telefone: cliente.telefone,
              asaasCustomerId: cliente.asaasCustomerId,
            },
            prisma
          );
          let firstDueDate: string;
          if (parcelasValidadas && parcelasValidadas.length > 0) {
            firstDueDate = parcelasValidadas[0].dataVencimento.slice(0, 10);
          } else if (parcelas > 1) {
            const d = new Date();
            d.setMonth(d.getMonth() + 1);
            d.setDate(10);
            firstDueDate = d.toISOString().slice(0, 10);
          } else {
            const d = new Date();
            d.setDate(d.getDate() + 3);
            firstDueDate = d.toISOString().slice(0, 10);
          }
          const payment = await createBoletoPayment({
            customerId: asaasCustomerId,
            value: totalVenda,
            dueDate: firstDueDate,
            ...(parcelas > 1 && {
              installmentCount: parcelas,
              totalValue: totalVenda,
            }),
            description: `Venda #${venda.id}`,
            externalReference: String(venda.id),
          });
          await prisma.venda.update({
            where: { id: venda.id },
            data: {
              asaasPaymentId: payment.id,
              boletoUrl: payment.bankSlipUrl || null,
            },
          });
          boletoUrl = payment.bankSlipUrl || undefined;
        }
      } catch (err) {
        console.error("Erro ao gerar boleto Asaas:", err);
        return successResponse(
          `Venda #${venda.id} criada. Falha ao gerar boleto no Asaas; tente gerar pelo histórico.`,
          { vendaId: venda.id }
        );
      }
    }

    return successResponse(`Venda #${venda.id} criada com sucesso!`, {
      vendaId: venda.id,
      ...(boletoUrl && { boletoUrl }),
      ...(assinaturaToken && { assinaturaToken }),
    });
  } catch (error) {
    console.error("Erro ao criar venda:", error);
    return errorResponse("Erro ao processar a venda. Tente novamente.");
  }
}
