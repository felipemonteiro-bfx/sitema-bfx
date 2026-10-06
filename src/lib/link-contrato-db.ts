import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  faltaAssinaturaPendente,
  precisaLinkContrato,
  whereNovoLinkContrato,
  type VendaLinkContrato,
} from "@/lib/link-contrato";

type Tx = {
  venda: {
    updateMany: typeof prisma.venda.updateMany;
    findUnique: typeof prisma.venda.findUnique;
  };
  assinatura: {
    findUnique: typeof prisma.assinatura.findUnique;
    create: typeof prisma.assinatura.create;
  };
};

function ehConflitoUnico(erro: unknown): boolean {
  return !!erro && typeof erro === "object" && (erro as { code?: unknown }).code === "P2002";
}

async function criarPendente(tx: Tx, vendaId: number) {
  const assinatura = await tx.assinatura.findUnique({ where: { vendaId } });
  if (assinatura) return;
  try {
    await tx.assinatura.create({
      data: { vendaId, assinaturaStatus: "pendente" },
    });
  } catch (erro) {
    if (!ehConflitoUnico(erro)) throw erro;
  }
}

async function gravarLinkNovo(vendaId: number): Promise<string | null> {
  const token = randomUUID();
  return prisma.$transaction(async (tx) => {
    const gravado = await tx.venda.updateMany({
      where: whereNovoLinkContrato(vendaId),
      data: { assinaturaToken: token },
    });
    if (gravado.count !== 1) {
      const atual = await tx.venda.findUnique({
        where: { id: vendaId },
        select: {
          assinaturaToken: true,
          status: true,
          formaPagamento: true,
          descontoEmFolha: true,
          assinatura: { select: { assinaturaStatus: true } },
        },
      });
      if (!atual?.assinaturaToken) return null;
      if (faltaAssinaturaPendente(atual)) await criarPendente(tx, vendaId);
      return atual.assinaturaToken;
    }
    await criarPendente(tx, vendaId);
    return token;
  });
}

/** Cria o token que faltava e a assinatura pendente. Não troca um token que já existe. */
export async function garantirLinksContrato(vendas: VendaLinkContrato[]): Promise<Map<number, string>> {
  const tokens = new Map<number, string>();

  for (const venda of vendas) {
    if (precisaLinkContrato(venda)) {
      const token = await gravarLinkNovo(venda.id);
      if (token) tokens.set(venda.id, token);
      continue;
    }
    if (faltaAssinaturaPendente(venda)) {
      await criarPendente(prisma, venda.id);
      if (venda.assinaturaToken) tokens.set(venda.id, venda.assinaturaToken);
    }
  }

  return tokens;
}
