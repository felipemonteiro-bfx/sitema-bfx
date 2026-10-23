// Onda sonora real do áudio: picos por janela, normalizados em 40 barras de 0 a 31.

export const QTD_BARRAS_ONDA = 40;
export const PICO_MAX = 31;
/** Altura mínima (fração) de um trecho com som, para não sumir. */
const ALTURA_MIN_RELEVO = 0.18;

/**
 * RMS por janela (PCM mono em [-1, 1]), espalhado pela faixa de volume do próprio áudio. Silêncio total fica em 0.
 */
export function calcularOnda(pcm: Float32Array, barras = QTD_BARRAS_ONDA): number[] {
  const rms = new Array<number>(barras).fill(0);
  if (pcm.length === 0) return rms;
  for (let b = 0; b < barras; b++) {
    const ini = Math.floor((b * pcm.length) / barras);
    const fim = Math.max(ini + 1, Math.floor(((b + 1) * pcm.length) / barras));
    let soma = 0;
    let n = 0;
    for (let i = ini; i < fim && i < pcm.length; i++) { soma += pcm[i]! * pcm[i]!; n++; }
    rms[b] = n ? Math.sqrt(soma / n) : 0;
  }
  const maior = Math.max(...rms);
  if (maior < 1e-4) return rms.map(() => 0);
  // Relevo: normaliza pela faixa real deste áudio (do 10º percentil dos trechos com som ao maior), para a fala
  // ganhar forma mesmo com cada barra cobrindo um trecho longo. Silêncio fica no chão; áudio uniforme fica cheio.
  const comSom = rms.filter(v => v >= 1e-4).sort((a, b) => a - b);
  const piso = comSom[Math.floor(comSom.length * 0.1)] ?? 0;
  const faixa = maior - piso;
  return rms.map(v => {
    if (v < 1e-4) return 0;
    if (faixa < maior * 0.05) return PICO_MAX;
    const t = Math.min(Math.max((v - piso) / faixa, 0), 1);
    return Math.min(PICO_MAX, Math.round((ALTURA_MIN_RELEVO + (1 - ALTURA_MIN_RELEVO) * t) * PICO_MAX));
  });
}

/** Entrada de fronteira: exatamente 40 inteiros de 0 a 31, senão `null`. */
export function validarOnda(v: unknown): number[] | null {
  if (!Array.isArray(v) || v.length !== QTD_BARRAS_ONDA) return null;
  return v.every(x => typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= PICO_MAX) ? (v as number[]) : null;
}

/** A bolha precisa ficar visível este tempo antes de a onda ser calculada sozinha (rolar rápido não baixa nada). */
export const ATRASO_ONDA_VISIVEL_MS = 1500;
/** Cálculo automático (sem play) só para áudio pequeno: decodificar exige baixar o arquivo inteiro. */
export const LIMITE_ONDA_VISIVEL_BYTES = 2 * 1024 * 1024;
const LIMITE_ONDA_PLAY_BYTES = 16 * 1024 * 1024;

/** Play: o atendente já vai baixar o áudio, vale até o teto geral. Visível: só com tamanho conhecido e pequeno. */
export function podeCalcularOnda(motivo: 'play' | 'visivel', tamanho: number | null | undefined): boolean {
  if (motivo === 'play') return tamanho == null || tamanho <= LIMITE_ONDA_PLAY_BYTES;
  return typeof tamanho === 'number' && tamanho <= LIMITE_ONDA_VISIVEL_BYTES;
}
