'use server';
import { requireAdmin } from '@/lib/guards';
import { processarMidia } from '@/lib/whatsapp-midia-download';
import { MSG_ACESSO_RESTRITO } from '@/lib/whatsapp-atendimento-guardas';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * "Tentar de novo" da bolha de mídia que falhou: pede ao servidor para baixar de novo.
 * `processarMidia` reivindica a linha de forma atômica (pendente/falhou, ou indisponivel de erro transitório; o botão ignora o backoff), então clique duplo é inofensivo.
 */
export async function tentarMidiaDeNovo(id: string): Promise<{ ok: boolean; message: string }> {
  if (!await requireAdmin()) return { ok: false, message: MSG_ACESSO_RESTRITO };
  if (!UUID_RE.test(id)) return { ok: false, message: 'Mídia inválida.' };
  try {
    await processarMidia(id, { manual: true });
    return { ok: true, message: 'Tentativa concluída.' };
  } catch {
    return { ok: false, message: 'Não foi possível tentar de novo agora.' };
  }
}
