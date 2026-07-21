import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

/**
 * Registra uma ação no AuditLog para rastreabilidade
 */
export async function createAuditLog(acao: string, detalhes?: Record<string, unknown> | string) {
  const session = await getSession();
  const usuario = session?.nomeExibicao ?? session?.username ?? "Sistema";
  await prisma.auditLog.create({
    data: {
      dataHora: new Date(),
      usuario,
      usuarioId: session?.id ?? null,
      acao,
      detalhes: typeof detalhes === "string" ? detalhes : JSON.stringify(detalhes ?? {}),
    },
  });
}
