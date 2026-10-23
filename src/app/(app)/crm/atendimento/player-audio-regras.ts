// Funções puras do player de áudio (sem DOM): velocidade, posição e teclado.
import { formatarTempo } from './status-mensagem';

import { QTD_BARRAS_ONDA } from './onda-regras';

/** Barras da onda: picos reais do áudio (40 valores 0-31), calculados no navegador e guardados no banco. */
export const QTD_BARRAS = QTD_BARRAS_ONDA;
/** Escala vertical (0..1) de um pico 0-31; nunca some de vez, para o silêncio ainda aparecer como um traço. */
export const escalaDoPico = (pico: number): number => Math.max(0.12, Math.min(pico, 31) / 31);
/** Escala do esqueleto enquanto a onda real não chegou: baixa e uniforme, sem fingir forma. */
export const ESCALA_ESQUELETO = 0.18;
/** Atraso entre barras ao revelar a onda real (ms). */
export const ATRASO_BARRA_MS = 8;
export const VELOCIDADES = [1, 1.5, 2] as const;
/** Passo das setas do teclado no slider, em segundos. */
export const PASSO_SEGUNDOS = 5;

/** 1× → 1,5× → 2× → 1×. */
export function proximaVelocidade(v: number): number {
  const i = VELOCIDADES.findIndex(x => x === v);
  return VELOCIDADES[(i + 1) % VELOCIDADES.length];
}

type Armazem = { getItem(k: string): string | null; setItem(k: string, v: string): void } | null | undefined;
/** A velocidade é preferência da pessoa: fica no navegador dela e vale para todos os áudios. */
export const CHAVE_VELOCIDADE = 'bfx:atendimento:velocidade-audio';
export function lerVelocidadeSalva(armazem: Armazem): number {
  try {
    const v = Number(armazem?.getItem(CHAVE_VELOCIDADE));
    return (VELOCIDADES as readonly number[]).includes(v) ? v : 1;
  } catch { return 1; }
}
export function salvarVelocidade(v: number, armazem: Armazem): void {
  try { armazem?.setItem(CHAVE_VELOCIDADE, String(v)); } catch { /* aba privada ou storage bloqueado: só não lembra */ }
}

export const rotuloVelocidade = (v: number): string => `${String(v).replace('.', ',')}×`;

/** Fração (0..1) do slider → segundos, limitada ao áudio. */
export function tempoPorPosicao(fracao: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.min(Math.max(fracao, 0), 1) * total;
}

/** Tecla do slider → novo tempo (segundos), ou null quando a tecla não é do slider. */
/** Tecla na barra do áudio: Espaço/Enter/K tocam ou pausam (como em players de vídeo); setas e Home/End movem. */
export function acaoDoTeclado(tecla: string): 'alternar' | 'mover' | null {
  if (tecla === ' ' || tecla === 'Enter' || tecla === 'k' || tecla === 'K') return 'alternar';
  if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(tecla)) return 'mover';
  return null;
}

export function tempoDoTeclado(tecla: string, atual: number, total: number): number | null {
  const limite = (t: number) => Math.min(Math.max(t, 0), Number.isFinite(total) ? total : t);
  switch (tecla) {
    case 'ArrowRight': case 'ArrowUp': return limite(atual + PASSO_SEGUNDOS);
    case 'ArrowLeft': case 'ArrowDown': return limite(atual - PASSO_SEGUNDOS);
    case 'Home': return 0;
    case 'End': return limite(total);
    default: return null;
  }
}

/** Parado (início): duração total. Tocando ou pausado no meio: tempo corrido. */
export function textoDoTempo(tocando: boolean, atual: number, total: number): string {
  return formatarTempo(tocando || atual > 0 ? atual : total);
}

export type EventoPlayer = { tipo: 'tocando' } | { tipo: 'pausado' } | { tipo: 'velocidade'; valor: number };
/** Texto da região aria-live do player (leitor de tela): estado e velocidade. */
export function anuncioDoPlayer(ev: EventoPlayer): string {
  if (ev.tipo === 'tocando') return 'Tocando';
  if (ev.tipo === 'pausado') return 'Pausado';
  return `Velocidade ${rotuloVelocidade(ev.valor)}`;
}
