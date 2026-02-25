"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  getAsaasConfig,
  getOrCreateCustomer,
  createBoletoPayment,
} from "@/lib/asaas";

/** Gera boleto Asaas para uma venda com opção boleto e sem boletoUrl. */
export async function gerarBoletoAsaas(formData: FormData) {
  const vendaId = Number(formData.get("vendaId") || 0);
  if (!vendaId || !getAsaasConfig()) return;

  const venda = await prisma.venda.findUnique({
    where: { id: vendaId },
    include: {
      cliente: true,
      parcelasVencimento: { orderBy: { numeroParcela: "asc" }, take: 1 },
    },
  });

  if (!venda || !venda.boleto || venda.boletoUrl || !venda.clienteId || !venda.cliente) return;
  const cliente = venda.cliente;
  if (!cliente.cpf && !cliente.cnpj) return;

  try {
    const totalVenda =
      ((venda.valorVenda || 0) * (venda.quantidade || 1)) + (venda.valorFrete || 0);
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
  } catch (err) {
    console.error("Erro ao gerar boleto Asaas:", err);
  }

  revalidatePath("/historico");
  revalidatePath("/boletos");
}
