"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  getAsaasConfig,
  getOrCreateCustomer,
  createBoletoPayment,
} from "@/lib/asaas";
import { enviarWhatsAppTexto, getWhatsAppConfig } from "@/lib/whatsapp";

export type GerarBoletoResult = { success: boolean; error?: string };

/** Gera boleto Asaas para uma venda com opção boleto e sem boletoUrl. Retorna erro legível para o usuário. */
export async function gerarBoletoAsaas(formData: FormData): Promise<GerarBoletoResult> {
  const vendaId = Number(formData.get("vendaId") || 0);
  if (!vendaId) return { success: false, error: "ID da venda inválido." };
  if (!getAsaasConfig()) {
    return { success: false, error: "Asaas não configurado. Configure ASAAS_API_KEY no servidor." };
  }

  const venda = await prisma.venda.findUnique({
    where: { id: vendaId },
    include: {
      cliente: true,
      parcelasVencimento: { orderBy: { numeroParcela: "asc" }, take: 1 },
      itens: { select: { subtotal: true } },
    },
  });

  if (!venda) return { success: false, error: "Venda não encontrada." };
  if (!venda.boleto) return { success: false, error: "Esta venda não está marcada como boleto." };
  if (venda.boletoUrl) return { success: false, error: "Boleto já foi gerado." };
  if (!venda.clienteId || !venda.cliente) return { success: false, error: "Cliente não vinculado à venda." };
  const cliente = venda.cliente;
  if (!cliente.cpf && !cliente.cnpj) {
    return {
      success: false,
      error: `O cliente "${cliente.nome}" precisa ter CPF ou CNPJ cadastrado. Edite em Cadastros → Clientes.`,
    };
  }

  try {
    const totalVenda =
      venda.itens && venda.itens.length > 0
        ? venda.itens.reduce((s, i) => s + i.subtotal, 0) + (venda.valorFrete ?? 0)
        : ((venda.valorVenda || 0) * (venda.quantidade || 1)) + (venda.valorFrete || 0);
    const firstDue =
      venda.parcelasVencimento[0]?.dataVencimento?.toISOString().slice(0, 10) ||
      (() => {
        const d = new Date();
        if ((venda.parcelas || 1) > 1) {
          d.setMonth(d.getMonth() + 1);
          d.setDate(10);
        } else {
          d.setDate(d.getDate() + 3);
        }
        return d.toISOString().slice(0, 10);
      })();

    const clienteAsaas = cliente as { asaasCustomerId?: string | null };
    const asaasCustomerId = await getOrCreateCustomer(
      {
        id: cliente.id,
        nome: cliente.nome,
        cpf: cliente.cpf,
        cnpj: cliente.cnpj,
        email: cliente.email,
        telefone: cliente.telefone,
        asaasCustomerId: clienteAsaas.asaasCustomerId ?? null,
      },
      prisma
    );

    const parcelas = venda.parcelas || 1;
    const payment = await createBoletoPayment({
      customerId: asaasCustomerId,
      value: totalVenda,
      dueDate: firstDue,
      ...(parcelas > 1 && { installmentCount: parcelas, totalValue: totalVenda }),
      description: `Venda #${venda.id}`,
      externalReference: String(venda.id),
    });

    await prisma.venda.update({
      where: { id: vendaId },
      data: { asaasPaymentId: payment.id, boletoUrl: payment.bankSlipUrl || null },
    });

    const waConfig = await getWhatsAppConfig();
    if (waConfig?.autoBoleto && payment.bankSlipUrl && cliente.telefone) {
      const msg = `Olá! Seu boleto da venda #${venda.id} foi gerado. Acesse: ${payment.bankSlipUrl}`;
      void enviarWhatsAppTexto(cliente.telefone, msg);
    }

    revalidatePath("/historico");
    revalidatePath("/boletos");
    return { success: true };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Erro ao gerar boleto Asaas:", err);
    return {
      success: false,
      error: errMsg || "Falha ao gerar boleto no Asaas. Tente novamente.",
    };
  }
}
