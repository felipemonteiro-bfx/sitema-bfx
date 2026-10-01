/**
 * Notificação a todos os admins. Falha aqui nunca desfaz a operação que pediu o aviso: só vai
 * para o log.
 *
 * `prefixo` (opcional, por alerta): o alerta só sai se nenhuma notificação com esse prefixo já
 * existe — idempotência para avisos que o webhook e a sincronização diária repetem.
 */
import { prisma } from "@/lib/db";

export type AlertaAdmin = { mensagem: string; link: string; prefixo?: string };

/** Devolve quantos alertas saíram (os repetidos pelo prefixo não contam). */
export async function avisarAdmins(alertas: AlertaAdmin[]): Promise<number> {
  if (alertas.length === 0) return 0;
  try {
    const novos: AlertaAdmin[] = [];
    for (const a of alertas) {
      if (a.prefixo) {
        const ja = await prisma.notificacao.findFirst({ where: { mensagem: { startsWith: a.prefixo } }, select: { id: true } });
        if (ja) continue;
      }
      novos.push(a);
    }
    if (novos.length === 0) return 0;
    const admins = await prisma.usuario.findMany({ where: { role: "admin" }, select: { id: true } });
    if (admins.length === 0) return 0;
    await prisma.notificacao.createMany({
      data: novos.flatMap((a) => admins.map((u) => ({ mensagem: a.mensagem, link: a.link, usuarioId: u.id }))),
    });
    return novos.length;
  } catch (e) {
    console.error("[avisar-admins] falha ao notificar os admins:", e);
    return 0;
  }
}
