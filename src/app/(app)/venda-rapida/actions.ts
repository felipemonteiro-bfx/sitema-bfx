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
import { calcularPrimeiroVencimento } from "@/lib/utils";
import { enviarWhatsAppTexto, getWhatsAppConfig } from "@/lib/whatsapp";
import { signReciboId } from "@/lib/recibo-url";

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
        // Gerar parcelas automaticamente: regra dia 20
        const primeiroVenc = calcularPrimeiroVencimento(new Date(dataStr));
        const parcelasAuto = Array.from({ length: parcelas }).map((_, i) => {
          const dataVenc = new Date(primeiroVenc.getFullYear(), primeiroVenc.getMonth() + i, 10);
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

    if (boleto && clienteId) {
      const cfg = await prisma.config.findFirst();
      const asaasConfig = getAsaasConfig(cfg ?? undefined);
      if (!asaasConfig) {
        return successResponse(
          `Venda #${venda.id} criada. Configure ASAAS_API_KEY no servidor para gerar boletos.`,
          { vendaId: venda.id }
        );
      }
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
        if (!cliente) {
          return successResponse(
            `Venda #${venda.id} criada. Cliente não encontrado para gerar boleto.`,
            { vendaId: venda.id }
          );
        }
        if (!cliente.cpf && !cliente.cnpj) {
          return successResponse(
            `Venda #${venda.id} criada. O cliente "${cliente.nome}" precisa ter CPF ou CNPJ cadastrado para gerar boleto no Asaas. Cadastre em Cadastros → Clientes.`,
            { vendaId: venda.id }
          );
        }
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
            prisma,
            asaasConfig
          );
          let firstDueDate: string;
          if (parcelasValidadas && parcelasValidadas.length > 0) {
            firstDueDate = parcelasValidadas[0].dataVencimento.slice(0, 10);
          } else {
            // Regra: até dia 20 → dia 10 do próximo mês; após dia 20 → mês subsequente
            const d = calcularPrimeiroVencimento(new Date(dataStr));
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
          }, asaasConfig);
          await prisma.venda.update({
            where: { id: venda.id },
            data: {
              asaasPaymentId: payment.id,
              boletoUrl: payment.bankSlipUrl || null,
            },
          });
          boletoUrl = payment.bankSlipUrl || undefined;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error("Erro ao gerar boleto Asaas:", err);
        return successResponse(
          `Venda #${venda.id} criada. Falha ao gerar boleto no Asaas: ${errMsg}. Tente gerar manualmente pelo Histórico de Vendas.`,
          { vendaId: venda.id }
        );
      }
    }

    // Envio automático WhatsApp - conforme config: recibo/assinatura, boleto, boas-vindas
    const waConfig = await getWhatsAppConfig();
    if (clienteId) {
      const cliente = await prisma.cliente.findUnique({
        where: { id: clienteId },
        select: { nome: true, telefone: true },
      });
      if (cliente?.telefone) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3008";
        let mensagem = "";
        if (waConfig?.autoRecibo) {
          mensagem =
            descontoEmFolha && assinaturaToken
              ? `Olá! Segue o link para assinar sua autorização de desconto em folha: ${baseUrl}/assinatura/${assinaturaToken}`
              : `Olá! Segue seu recibo de venda: ${baseUrl}/api/recibo?id=${venda.id}&sig=${signReciboId(venda.id)}${descontoEmFolha ? "&tipo=autorizacao" : ""}`;
          if (boletoUrl && waConfig.autoBoleto) {
            mensagem += `\n\nSeu boleto: ${boletoUrl}`;
          }
        } else if (boletoUrl && waConfig?.autoBoleto) {
          mensagem = `Olá! Seu boleto da venda #${venda.id} foi gerado. Acesse: ${boletoUrl}`;
        }
        if (mensagem) void enviarWhatsAppTexto(cliente.telefone, mensagem);

        // Boas-vindas para cliente novo (primeira compra)
        if (waConfig?.autoBoasVindas) {
          const totalVendas = await prisma.venda.count({
            where: { clienteId },
          });
          if (totalVendas === 1) {
            const msgBoasVindas = `Bem-vindo(a), ${cliente.nome ?? "Cliente"}! Obrigado pela primeira compra. Em caso de dúvidas, estamos à disposição.`;
            void enviarWhatsAppTexto(cliente.telefone, msgBoasVindas);
          }
        }
      }
    }

    return successResponse(`Venda #${venda.id} criada com sucesso!`, {
      vendaId: venda.id,
      ...(boletoUrl && { boletoUrl }),
      ...(assinaturaToken && { assinaturaToken }),
    });
  } catch (error) {
    console.error("Erro ao criar venda:", error);
    const err = error as Error & { code?: string };
    const errMsg = err?.message ?? String(error);

    // Mapear erros comuns do Prisma para mensagens amigáveis
    if (err?.code === "P2003") {
      return errorResponse(
        "Cliente ou vendedor inválido. Verifique se o cliente existe em Cadastros e se o vendedor está correto."
      );
    }
    if (err?.code === "P2025") {
      return errorResponse("Registro não encontrado. Atualize a página e tente novamente.");
    }

    const safeToShow =
      errMsg.includes("Foreign key") ||
      errMsg.includes("Unique constraint") ||
      errMsg.includes("Cliente") ||
      errMsg.includes("inválid") ||
      errMsg.includes("P2022") ||
      errMsg.includes("column") ||
      errMsg.includes("table") ||
      errMsg.includes("relation") ||
      process.env.NODE_ENV === "development";

    return errorResponse(
      safeToShow ? `Erro ao processar a venda: ${errMsg}` : "Erro ao processar a venda. Tente novamente."
    );
  }
}
