import { NextResponse } from "next/server";
import { autorizarCron } from "@/lib/segredo";
import { prisma } from "@/lib/db";
import { enviarCampanha } from "@/lib/campanha-service";
import { logCron, logCronError } from "@/lib/logger";

/**
 * GET /api/cron/campanhas-agendadas
 *
 * Dispara campanhas com status "agendada" cujo horário já chegou.
 * Requer header Authorization: Bearer $CRON_SECRET.
 */
export async function GET(req: Request) {
  // Fechado: sem CRON_SECRET nega (antes a rota passava com o segredo vazio).
  if (!autorizarCron(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const pendentes = await prisma.campanha.findMany({
      where: { status: "agendada", agendadaPara: { lte: new Date() } },
      select: { id: true },
      orderBy: { agendadaPara: "asc" },
      take: 50,
    });

    let disparadas = 0;
    for (const c of pendentes) {
      try {
        await enviarCampanha(c.id);
        disparadas++;
      } catch (err) {
        logCronError("campanhas-agendadas", "falha_disparo", err, { campanhaId: c.id });
      }
    }

    logCron("campanhas-agendadas", "concluido", { pendentes: pendentes.length, disparadas });
    return NextResponse.json({ ok: true, pendentes: pendentes.length, disparadas });
  } catch (error) {
    logCronError("campanhas-agendadas", "erro_geral", error);
    return NextResponse.json({ error: "Erro ao processar campanhas agendadas" }, { status: 500 });
  }
}
