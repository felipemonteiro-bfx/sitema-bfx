/**
 * Citação (responder mensagem) no atendimento WhatsApp: acesso ao banco.
 * O resumo em si mora em `whatsapp-citacao-resumo.ts` (sem Prisma, usável no navegador).
 */
import { prisma } from "@/lib/db";
import { CITACAO_INDISPONIVEL, resumirMensagem, type ResumoCitado } from "@/lib/whatsapp-citacao-resumo";

/**
 * wa_message_id da mensagem que o atendente quer citar. O telefone entra no filtro: não se cita mensagem
 * de outra conversa. `null` quando não existe ou ainda não tem id da Meta (o envio segue sem citação).
 */
export async function waIdDaCitada(telefone: string, id: number): Promise<string | null> {
  const r = await prisma.whatsAppMensagem.findFirst({ where: { id, telefone }, select: { waMessageId: true } });
  return r?.waMessageId ?? null;
}

/**
 * Resolve, numa única consulta (sem N+1), as mensagens citadas pelas linhas informadas.
 * Devolve um mapa wa_message_id -> resumo; o que não está no banco vira "Mensagem indisponível".
 */
export async function resolverCitacoes(
  telefone: string,
  linhas: { respondeAWaId?: string | null }[],
): Promise<Map<string, ResumoCitado>> {
  const ids = [...new Set(linhas.map((l) => l.respondeAWaId).filter((v): v is string => !!v))];
  const mapa = new Map<string, ResumoCitado>();
  if (!ids.length) return mapa;
  const achadas = await prisma.whatsAppMensagem.findMany({
    where: { telefone, waMessageId: { in: ids } },
    select: {
      id: true, waMessageId: true, direcao: true, tipo: true, corpo: true,
      midia: { select: { id: true, tipo: true, status: true, voz: true, nomeExibicao: true, legenda: true } },
    },
  });
  for (const a of achadas) if (a.waMessageId) mapa.set(a.waMessageId, resumirMensagem(a));
  for (const id of ids) if (!mapa.has(id)) mapa.set(id, CITACAO_INDISPONIVEL);
  return mapa;
}
