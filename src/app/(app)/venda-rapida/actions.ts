"use server";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { checkboxLigado } from "@/lib/form-values";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/lib/action-response";
import { successResponse, errorResponse } from "@/lib/action-response";
import { vendaV2Schema } from "@/lib/validations/venda";
import { validarItensContraCatalogo } from "@/lib/venda-item-validation";
import { checkCredito } from "@/lib/credit";
import { createAuditLog } from "@/lib/audit";
import {
  getAsaasConfig,
  getOrCreateCustomer,
  createBoletoPayment,
} from "@/lib/asaas";
import { calcularPrimeiroVencimento } from "@/lib/utils";
import { enviarWhatsApp, getWhatsAppFlags } from "@/lib/whatsapp";
import { TEMPLATES, comFallback } from "@/lib/whatsapp-templates";
import { signReciboId } from "@/lib/recibo-url";
import { sendVendaNotification } from "@/lib/email";
import { creditarPontosVenda, resgatarPontos } from "@/lib/fidelidade-service";
import { valorEmReais } from "@/lib/fidelidade";
import { logError } from "@/lib/logger";
import { getSession } from "@/lib/session";
import {
  FORMA_PAGAMENTO,
  formaFromLegacyFlags,
  isFormaPagamento,
  legacyFlagsFromForma,
  type FormaPagamento,
} from "@/lib/forma-pagamento";

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
  const temNota = checkboxLigado(formData.get("temNota"));
  const taxaNota = Number(formData.get("taxaNota") || 5.97);
  
  const subtotal = valor * quantidade;
  const valorDescontoNota = temNota ? (subtotal * taxaNota) / 100 : 0;
  const total = subtotal + frete;
  const parcela = parcelas > 0 ? Math.trunc((total / parcelas) * 100) / 100 : 0;
  const lucro = total - ((custo * quantidade) + envio + valorDescontoNota);

  if (!data || !vendedor || !clienteId) return;
  const session = await getSession();
  const vendedorUsuario = await prisma.usuario.findFirst({
    where: { OR: [{ username: { equals: vendedor, mode: "insensitive" } }, { nomeExibicao: { equals: vendedor, mode: "insensitive" } }] },
    select: { id: true },
  });
  // Forma canonica para a action legada (sem campo no form): derivada de parcelas.
  const formaPagamentoLegada = formaFromLegacyFlags({ descontoEmFolha: false, boleto: false, parcelas });
  const flagsLegado = legacyFlagsFromForma(formaPagamentoLegada);
  const vendaCriada = await prisma.venda.create({
    data: {
      dataVenda: new Date(data),
      vendedor,
      vendedorId: vendedorUsuario?.id ?? session?.id ?? null,
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
      descontoEmFolha: flagsLegado.descontoEmFolha,
      boleto: flagsLegado.boleto,
      formaPagamento: formaPagamentoLegada,
    },
  });
  if (produto) {
    const prod = await prisma.produto.findFirst({
      where: { nome: { equals: produto, mode: "insensitive" } },
      orderBy: { qtdEstoque: "desc" },
      select: { id: true },
    });
    if (prod) {
      await prisma.produto.update({
        where: { id: prod.id },
        data: { qtdEstoque: { decrement: quantidade } },
      });
    }
  }
  // Fire-and-forget: notify partner company via email
  if (clienteId) {
    void (async () => {
      try {
        const vendaComCliente = await prisma.venda.findUnique({
          where: { id: vendaCriada.id },
          include: {
            cliente: { select: { nome: true, matricula: true, empresa: true, empresaParceiraId: true } },
            itens: { select: { produtoNome: true, quantidade: true, subtotal: true } },
          },
        });
        if (vendaComCliente) {
          await sendVendaNotification({
            ...vendaComCliente,
            cliente: vendaComCliente.cliente ?? undefined,
          });
        }
      } catch (e) {
        console.error("[email] sendVendaNotification failed (criarVenda):", e);
      }
    })();
  }
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

    const formaPagamentoRaw = formData.get("formaPagamento");
    const raw = {
      data: String(formData.get("data") || ""),
      vendedor: String(formData.get("vendedor") || ""),
      clienteId: Number(formData.get("clienteId") || 0),
      frete: Number(formData.get("frete") || 0),
      envio: Number(formData.get("envio") || 0),
      parcelas: Number(formData.get("parcelas") || 1),
      temNota: checkboxLigado(formData.get("temNota")),
      taxaNota: Number(formData.get("taxaNota") || 5.97),
      produtos,
      parcelasVencimento: parcelasVencimento.length > 0 ? parcelasVencimento : undefined,
      desconto: Number(formData.get("desconto") || 0),
      pontosResgatar: Number(formData.get("pontosResgatar") || 0),
      descontoEmFolha: checkboxLigado(formData.get("descontoEmFolha")),
      boleto: checkboxLigado(formData.get("boleto")),
      formaPagamento: isFormaPagamento(formaPagamentoRaw) ? formaPagamentoRaw : undefined,
    };

    const parsed = vendaV2Schema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.flatten().fieldErrors;
      const msg = Object.values(firstError).flat().find(Boolean) || parsed.error.message;
      return errorResponse(String(msg || "Dados inválidos"));
    }

    const { data: dataStr, vendedor, clienteId, frete, envio, parcelas, temNota, taxaNota, produtos: produtosValidados, parcelasVencimento: parcelasValidadas } = parsed.data;
    const descontoManual = parsed.data.desconto ?? 0;

    // Fidelidade: resgate de pontos vira desconto na venda (limitado ao saldo do cliente).
    const pontosResgatarPedido = parsed.data.pontosResgatar ?? 0;
    let pontosUsar = 0;
    let descontoPontos = 0;
    if (pontosResgatarPedido > 0) {
      const cliPontos = await prisma.cliente.findUnique({
        where: { id: clienteId },
        select: { pontos: true },
      });
      const saldo = cliPontos?.pontos ?? 0;
      pontosUsar = Math.min(pontosResgatarPedido, saldo);
      descontoPontos = valorEmReais(pontosUsar);
    }
    const desconto = descontoManual + descontoPontos;

    // Valida cada item: subtotal precisa bater com valorVenda×quantidade. O piso de
    // custo contra o catálogo foi removido (PDV-14, D-01) — o custo digitado pelo
    // vendedor é gravado sem consulta ao catálogo, para qualquer perfil.
    const erroValidacao = validarItensContraCatalogo(produtosValidados);
    if (erroValidacao) {
      return errorResponse(erroValidacao);
    }

    // Forma de pagamento canônica.
    // Preferimos o campo `formaPagamento` quando enviado pelo form novo.
    // Se nao veio (clientes/scripts antigos), derivamos dos flags legados.
    const formaPagamento: FormaPagamento = parsed.data.formaPagamento
      ? (parsed.data.formaPagamento as FormaPagamento)
      : formaFromLegacyFlags({
          descontoEmFolha: parsed.data.descontoEmFolha ?? false,
          boleto: parsed.data.boleto ?? false,
          parcelas,
        });

    // Sincroniza os flags legados a partir da forma canonica para integracoes antigas.
    const { descontoEmFolha, boleto } = legacyFlagsFromForma(formaPagamento);

    // Cálculos totais
    const subtotalProdutos = produtosValidados.reduce((sum, p) => sum + p.subtotal, 0);
    const totalVenda = subtotalProdutos + frete - desconto;
    const valorDescontoNota = temNota ? (subtotalProdutos * taxaNota) / 100 : 0;
    const custoTotal =
      produtosValidados.reduce((sum, p) => sum + p.custoProduto * p.quantidade, 0) + envio + valorDescontoNota;
    const lucroLiquido = totalVenda - custoTotal;
    const valorParcela = parcelas > 0 ? Math.trunc((totalVenda / parcelas) * 100) / 100 : 0;

    // Limite de crédito é sempre recalculado no servidor — o valor de "excedeuLimite"
    // vindo do client é só um aviso de UX e nunca é usado para gravar no banco.
    const credito = await checkCredito(clienteId, valorParcela);
    const excedeuLimite = credito.ok ? 0 : 1;

    // Criar venda com transação
    const assinaturaToken = formaPagamento === FORMA_PAGAMENTO.DESCONTO_FOLHA ? randomUUID() : undefined;
    const sessionV2 = await getSession();
    const vendedorUsuarioV2 = await prisma.usuario.findFirst({
      where: { OR: [{ username: { equals: vendedor, mode: "insensitive" } }, { nomeExibicao: { equals: vendedor, mode: "insensitive" } }] },
      select: { id: true },
    });

    const venda = await prisma.$transaction(async (tx) => {
      // 1. Criar venda principal
      const vendaCriada = await tx.venda.create({
        data: {
          dataVenda: new Date(dataStr),
          vendedor,
          vendedorId: vendedorUsuarioV2?.id ?? sessionV2?.id ?? null,
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
          excedeuLimite,
          temNota,
          taxaNota,
          desconto,
          descontoEmFolha,
          boleto,
          formaPagamento,
          assinaturaToken: assinaturaToken ?? undefined,
        },
      });

      // 1b. Criar registro de Assinatura se desconto em folha
      if (descontoEmFolha) {
        await tx.assinatura.create({
          data: { vendaId: vendaCriada.id, assinaturaStatus: "pendente" },
        });
      }

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

      // 4. Debitar estoque — casa por nome case-insensitive e debita UM produto
      //    (evita miss por maiúsc/minúsc e super-decremento quando 2 fornecedores
      //    têm produto de mesmo nome). Heurística: prefere o de maior estoque.
      for (const p of produtosValidados) {
        const prod = await tx.produto.findFirst({
          where: { nome: { equals: p.produtoNome, mode: "insensitive" } },
          orderBy: { qtdEstoque: "desc" },
          select: { id: true },
        });
        if (prod) {
          await tx.produto.update({
            where: { id: prod.id },
            data: { qtdEstoque: { decrement: p.quantidade } },
          });
        }
      }

      return vendaCriada;
    });

    revalidatePath("/venda-rapida");
    revalidatePath("/historico");
    revalidatePath("/dashboard");

    await createAuditLog("venda:create", { vendaId: venda.id, clienteId, vendedor, total: totalVenda });

    // CRM: ao comprar, um lead vira "cliente" (integração funil -> venda).
    if (clienteId) {
      void prisma.cliente
        .updateMany({
          where: { id: clienteId, estagioCrm: { in: ["novo_lead", "contatado", "negociando"] } },
          data: { estagioCrm: "cliente" },
        })
        .catch((e) => console.error("[crm] Falha ao converter lead em cliente:", e));

      // Fidelidade: credita pontos pela compra (idempotente por venda).
      void creditarPontosVenda(clienteId, venda.id, totalVenda).catch((e) =>
        console.error("[fidelidade] Falha ao creditar pontos:", e)
      );

      // Fidelidade: debita os pontos resgatados como desconto nesta venda.
      if (pontosUsar > 0) {
        void resgatarPontos(clienteId, pontosUsar, `Resgate na venda #${venda.id}`).catch((e) =>
          console.error("[fidelidade] Falha ao debitar pontos resgatados:", e)
        );
      }
    }

    // Fire-and-forget: notify partner company via email
    if (clienteId) {
      void (async () => {
        try {
          const vendaComCliente = await prisma.venda.findUnique({
            where: { id: venda.id },
            include: {
              cliente: { select: { nome: true, matricula: true, empresa: true, empresaParceiraId: true } },
              itens: { select: { produtoNome: true, quantidade: true, subtotal: true } },
            },
          });
          if (vendaComCliente) {
            await sendVendaNotification({
              ...vendaComCliente,
              cliente: vendaComCliente.cliente ?? undefined,
            });
          }
        } catch (e) {
          console.error("[email] sendVendaNotification failed:", e);
        }
      })();
    }

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
    const waConfig = await getWhatsAppFlags();
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
        if (mensagem) {
          void enviarWhatsApp({
            telefone: cliente.telefone,
            clienteId,
            origem: "venda",
            template: comFallback(TEMPLATES.recibo, [cliente.nome ?? "Cliente"], mensagem),
          });
        }

        // Boas-vindas para cliente novo (primeira compra)
        if (waConfig?.autoBoasVindas) {
          const totalVendas = await prisma.venda.count({
            where: { clienteId },
          });
          if (totalVendas === 1) {
            const msgBoasVindas = `Bem-vindo(a), ${cliente.nome ?? "Cliente"}! Obrigado pela primeira compra. Em caso de dúvidas, estamos à disposição.`;
            void enviarWhatsApp({
              telefone: cliente.telefone,
              clienteId,
              origem: "venda",
              template: comFallback(TEMPLATES.boasVindas, [cliente.nome ?? "Cliente"], msgBoasVindas),
            });
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
    logError("venda", "criar_venda_falhou", error);
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
