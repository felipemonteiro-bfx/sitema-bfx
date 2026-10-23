// Regras puras da transcrição (compartilhadas entre navegador e Server Action).

export const DURACAO_MAX_S = 300; // 5 min: memória/tempo no iOS
export const TAMANHO_MAX_BYTES = 16 * 1024 * 1024;
export const CARACTERES_MAX = 6000;
const CARACTERES_POR_SEGUNDO = 25;
const FOLGA = 200;

/** Remove NUL e controles (quebras e tabs viram espaço), colapsa espaços e apara. */
export function normalizarTranscricao(texto: string): string {
  return texto.split('').map(c => { const n = c.charCodeAt(0); return n === 9 || n === 10 || n === 13 ? ' ' : n < 32 || n === 127 ? '' : c; }).join('').replace(/\s+/g, ' ').trim();
}

/** min(6000, 25 × duração_s + 200); duração desconhecida vale 6000. */
export function tetoTranscricao(duracaoS: number | null | undefined): number {
  if (typeof duracaoS !== 'number' || !Number.isFinite(duracaoS) || duracaoS <= 0) return CARACTERES_MAX;
  return Math.min(CARACTERES_MAX, Math.round(CARACTERES_POR_SEGUNDO * duracaoS + FOLGA));
}

export const MSG_LONGO = 'Este áudio é longo demais para transcrever aqui (máximo 5 minutos).';
export const MSG_GRANDE = 'Este áudio é grande demais para transcrever aqui (máximo 16 MB).';

export function podeTranscrever(duracaoS: number | undefined, tamanho: number | null | undefined): { ok: true } | { ok: false; message: string } {
  if (typeof duracaoS === 'number' && Number.isFinite(duracaoS) && duracaoS > DURACAO_MAX_S) return { ok: false, message: MSG_LONGO };
  if (typeof tamanho === 'number' && tamanho > TAMANHO_MAX_BYTES) return { ok: false, message: MSG_GRANDE };
  return { ok: true };
}

export type FaseTranscricao = 'modelo' | 'leitura' | 'inferencia';
/** Texto e tipo de barra de cada fase. Só o download do modelo tem porcentagem real: preparar e transcrever não têm. */
export function descreverProgresso(p: { fase: FaseTranscricao; pct: number }): { rotulo: string; indeterminado: boolean; valor: number } {
  if (p.fase === 'modelo') return { rotulo: `Baixando o modelo de voz… ${p.pct}%`, indeterminado: false, valor: p.pct };
  if (p.fase === 'leitura') return { rotulo: 'Preparando o áudio…', indeterminado: true, valor: 0 };
  return { rotulo: 'Transcrevendo…', indeterminado: true, valor: 0 };
}
