// Regras puras da foto, do álbum e da tela cheia (só exibição; nada aqui lê nem envia dados).
import { resumirMensagem, type MensagemCitavel, type ResumoCitado } from '@/lib/whatsapp-citacao-resumo';
import { chaveDia, horaBolha } from './status-mensagem';

/** Quantas células a grade do álbum mostra; a última leva o "+N" quando há mais fotos. */
export const CELULAS_ALBUM = 4;
/** Fotos seguidas necessárias para virar álbum (2 ou 3 continuam bolhas separadas). */
export const MINIMO_ALBUM = 4;

/** Fotos que ficam escondidas atrás do "+N" da quarta célula. */
export const restantesAlbum = (total: number): number => Math.max(0, total - CELULAS_ALBUM);

type Mensagem = MensagemCitavel & { criadoEm: Date; waMessageId?: string | null };

/** Uma foto ou vídeo salvo da conversa, na ordem do histórico. */
export type ItemFoto = {
  msgId: number; midiaId: string; tipo: 'imagem' | 'video'; criadoEm: Date; saida: boolean;
  legenda: string | null;
  /** Resumo para o Responder; nulo quando a mensagem não tem wa_message_id (não pode ser citada). */
  resumo: ResumoCitado | null;
  /** Duração em segundos, quando se sabe. */
  duracao?: number | null;
};

/** Só mídia já salva entra: sem arquivo não há o que ver em tela cheia. */
export function itensDaConversa(mensagens: Mensagem[]): ItemFoto[] {
  const itens: ItemFoto[] = [];
  for (const m of mensagens) {
    const md = m.midia as ({ id: string; tipo: string; status: string; legenda?: string | null } & object) | null | undefined;
    if (!md || md.status !== 'salva' || (md.tipo !== 'imagem' && md.tipo !== 'video')) continue;
    itens.push({
      msgId: m.id, midiaId: md.id, tipo: md.tipo, criadoEm: m.criadoEm, saida: m.direcao === 'out', legenda: md.legenda ?? null,
      resumo: m.waMessageId ? resumirMensagem(m) : null,
    });
  }
  return itens;
}

export const indicePorMensagem = (itens: ItemFoto[], msgId: number): number => itens.findIndex(i => i.msgId === msgId);

/** Índice da foto aberta, derivado a cada render: se a lista mudar (chegou foto, uma sumiu), segue a mesma foto; sumiu = null. */
export function indiceAberto(itens: ItemFoto[], msgId: number | null): number | null {
  if (msgId === null) return null;
  const i = indicePorMensagem(itens, msgId);
  return i >= 0 ? i : null;
}

/** Próximo índice sem dar a volta: nas pontas fica onde está. */
export function proximoIndice(atual: number, total: number, delta: number): number {
  if (total <= 0) return 0;
  return Math.min(total - 1, Math.max(0, atual + delta));
}

export const rotuloPosicao = (indice: number, total: number): string => `${indice + 1} de ${total}`;

const diasEntre = (a: Date, b: Date) => Math.round((Date.parse(chaveDia(b)) - Date.parse(chaveDia(a))) / 86_400_000);

/** "Hoje às 15:54" · "Ontem às 15:54" · "01/10/2026 às 15:54" (Manaus). */
export function rotuloDataVisualizador(d: Date, agora: Date = new Date()): string {
  const dias = diasEntre(d, agora);
  const hora = horaBolha(d);
  if (dias === 0) return `Hoje às ${hora}`;
  if (dias === 1) return `Ontem às ${hora}`;
  const [ano, mes, dia] = chaveDia(d).split('-');
  return `${dia}/${mes}/${ano} às ${hora}`;
}
