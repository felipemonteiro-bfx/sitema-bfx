// Onda da gravação (sem DOM): nível do microfone por quadro, barras que nascem da esquerda e resumo para a prévia.

const ALTURA_MIN = 3;
const ALTURA_MAX = 22;

/**
 * Nível 0..1 de um quadro de amostras (AnalyserNode.getFloatTimeDomainData, mono em [-1, 1]): RMS com raiz para
 * a fala suave também aparecer. Abaixo do piso de ruído é silêncio (0).
 */
export function nivelDoQuadro(amostras: ArrayLike<number>): number {
  if (amostras.length === 0) return 0;
  let soma = 0;
  for (let i = 0; i < amostras.length; i++) soma += amostras[i]! * amostras[i]!;
  const rms = Math.sqrt(soma / amostras.length);
  if (rms < 0.002) return 0;
  return Math.min(1, Math.sqrt(rms) * 1.6);
}

/** Acrescenta o nível mais recente; cheio, descarta o mais antigo. */
export function adicionarNivel(niveis: readonly number[], nivel: number, capacidade: number): number[] {
  const novo = [...niveis, nivel];
  return novo.length > capacidade ? novo.slice(novo.length - capacidade) : novo;
}

export const alturaDaBarra = (nivel: number) => Math.round(ALTURA_MIN + Math.min(Math.max(nivel, 0), 1) * (ALTURA_MAX - ALTURA_MIN));

export type SlotOnda = { tipo: 'barra'; altura: number } | { tipo: 'ponto' };

/** Barras a partir da esquerda; o resto da trilha em pontinhos. */
export function slotsDaOnda(niveis: readonly number[], capacidade: number): SlotOnda[] {
  return Array.from({ length: capacidade }, (_, i): SlotOnda => i < niveis.length ? { tipo: 'barra', altura: alturaDaBarra(niveis[i]!) } : { tipo: 'ponto' });
}

/** Gravação inteira em `barras` colunas (maior nível de cada trecho); com poucas amostras, esticada. */
export function resumirNiveis(niveis: readonly number[], barras: number): number[] {
  if (niveis.length === 0) return new Array<number>(barras).fill(0);
  return Array.from({ length: barras }, (_, b) => {
    const ini = Math.floor((b * niveis.length) / barras);
    const fim = Math.max(ini + 1, Math.floor(((b + 1) * niveis.length) / barras));
    let m = 0;
    for (let i = ini; i < fim && i < niveis.length; i++) m = Math.max(m, niveis[i]!);
    return m;
  });
}
