'use server';
import { requireAdmin } from '@/lib/guards';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { MSG_ACESSO_RESTRITO } from '@/lib/whatsapp-atendimento-guardas';
import { normalizarTranscricao, tetoTranscricao, DURACAO_MAX_S } from './transcricao-regras';
import { validarOnda } from './onda-regras';
import { MODELO_TRANSCRICAO } from './transcricao-actions-constantes';

type Resultado = { ok: boolean; message: string; transcricao?: string; /** `salvarOnda`: `true` só se esta chamada escreveu a onda. */ gravou?: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MSG_NAO_AUDIO = 'Só áudio pode ser transcrito.';

/**
 * Grava a transcrição feita no navegador. Mesma guarda das actions do atendimento. O autor vem da sessão e o modelo é
 * constante do servidor. O texto é DADO NÃO CONFIÁVEL: vai só para `WhatsAppMidia.transcricao`, nunca para `corpo`.
 * `duracaoS` (opcional, do navegador) só pode APERTAR o teto; sem ele vale 6000. Compare-and-set: nunca sobrescreve.
 */
export async function salvarTranscricao(midiaId: string, texto: string, duracaoS?: number): Promise<Resultado> {
  if (!await requireAdmin()) return { ok: false, message: MSG_ACESSO_RESTRITO };
  const sessao = await getSession();
  if (!sessao || typeof midiaId !== 'string' || !UUID.test(midiaId) || typeof texto !== 'string') return { ok: false, message: 'Não foi possível salvar a transcrição.' };
  const limpo = normalizarTranscricao(texto);
  if (!limpo) return { ok: false, message: 'Não foi reconhecida nenhuma fala neste áudio.' };
  const dur = typeof duracaoS === 'number' && Number.isFinite(duracaoS) && duracaoS > 0 ? Math.min(duracaoS, DURACAO_MAX_S) : null;
  if (limpo.length > tetoTranscricao(dur)) return { ok: false, message: 'A transcrição ficou longa demais para este áudio e não foi salva.' };

  const midia = await prisma.whatsAppMidia.findUnique({ where: { id: midiaId }, select: { id: true, tipo: true, transcricao: true } });
  if (!midia) return { ok: false, message: 'Mídia não encontrada.' };
  if (midia.tipo !== 'audio') return { ok: false, message: MSG_NAO_AUDIO };
  if (midia.transcricao) return { ok: true, message: 'Este áudio já tinha transcrição.', transcricao: midia.transcricao };

  const r = await prisma.whatsAppMidia.updateMany({
    where: { id: midiaId, tipo: 'audio', transcricao: null },
    data: { transcricao: limpo, transcricaoEm: new Date(), transcricaoAutorId: sessao.id, transcricaoModelo: MODELO_TRANSCRICAO },
  });
  if (r.count === 0) {
    const atual = await prisma.whatsAppMidia.findUnique({ where: { id: midiaId }, select: { transcricao: true } });
    return { ok: true, message: 'Este áudio já tinha transcrição.', transcricao: atual?.transcricao ?? limpo };
  }
  return { ok: true, message: 'Transcrição salva.', transcricao: limpo };
}

/** Grava a onda (40 inteiros 0-31) calculada no navegador, só em áudio sem onda. */
export async function salvarOnda(midiaId: string, onda: unknown): Promise<Resultado> {
  if (!await requireAdmin()) return { ok: false, message: MSG_ACESSO_RESTRITO };
  const valida = validarOnda(onda);
  if (!valida || typeof midiaId !== 'string' || !UUID.test(midiaId)) return { ok: false, message: 'Onda inválida.' };
  const midia = await prisma.whatsAppMidia.findUnique({ where: { id: midiaId }, select: { id: true, tipo: true } });
  if (!midia) return { ok: false, message: 'Mídia não encontrada.' };
  if (midia.tipo !== 'audio') return { ok: false, message: MSG_NAO_AUDIO };
  const r = await prisma.whatsAppMidia.updateMany({ where: { id: midiaId, tipo: 'audio', onda: null }, data: { onda: Uint8Array.from(valida) } });
  if (r.count === 0) return { ok: true, gravou: false, message: 'Este áudio já tinha onda.' };
  return { ok: true, gravou: true, message: 'Onda salva.' };
}
