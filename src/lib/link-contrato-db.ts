import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { precisaLinkContrato, type VendaLinkContrato } from "@/lib/link-contrato";

/** Cria o token que faltava. Não troca um token que já existe. */
export async function garantirLinksContrato(vendas: VendaLinkContrato[]): Promise<Map<number, string>> {
  const tokens = new Map<number, string>();

  for (const venda of vendas) {
    if (!precisaLinkContrato(venda)) continue;

    const token = randomUUID();
    const gravado = await prisma.venda.updateMany({
      where: { id: venda.id, assinaturaToken: null },
      data: { assinaturaToken: token },
    });

    if (gravado.count !== 1) {
      const atual = await prisma.venda.findUnique({
        where: { id: venda.id },
        select: { assinaturaToken: true },
      });
      if (atual?.assinaturaToken) tokens.set(venda.id, atual.assinaturaToken);
      continue;
    }

    tokens.set(venda.id, token);
    const assinatura = await prisma.assinatura.findUnique({ where: { vendaId: venda.id } });
    if (!assinatura) {
      try {
        await prisma.assinatura.create({
          data: { vendaId: venda.id, assinaturaStatus: "pendente" },
        });
      } catch {
        // Outra requisição criou a linha entre a leitura e a gravação.
      }
    }
  }

  return tokens;
}
