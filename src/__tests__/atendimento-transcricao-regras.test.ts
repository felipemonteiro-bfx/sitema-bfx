// Regras puras: texto da transcrição, teto por duração, limites do áudio e picos da onda.
import { describe, expect, it } from 'vitest';
import { normalizarTranscricao, tetoTranscricao, podeTranscrever, DURACAO_MAX_S, TAMANHO_MAX_BYTES } from '@/app/(app)/crm/atendimento/transcricao-regras';
import { calcularOnda, validarOnda, QTD_BARRAS_ONDA, PICO_MAX } from '@/app/(app)/crm/atendimento/onda-regras';

describe('normalizarTranscricao', () => {
  it('remove NUL e controles, colapsa espaços e apara', () => {
    expect(normalizarTranscricao('  Olá\u0000,\u0007   quero\n\n saber \t sim  ')).toBe('Olá, quero saber sim');
  });
  it('vazio depois de normalizar devolve string vazia', () => { expect(normalizarTranscricao(' \u0000 \n')).toBe(''); });
});

describe('tetoTranscricao', () => {
  it('25 caracteres por segundo + 200, no máximo 6000', () => {
    expect(tetoTranscricao(10)).toBe(450);
    expect(tetoTranscricao(300)).toBe(6000);
    expect(tetoTranscricao(1000)).toBe(6000);
  });
  it('duração desconhecida usa 6000', () => {
    expect(tetoTranscricao(null)).toBe(6000);
    expect(tetoTranscricao(Number.NaN)).toBe(6000);
  });
});

describe('podeTranscrever', () => {
  it('só até 5 min e 16 MB', () => {
    expect(DURACAO_MAX_S).toBe(300);
    expect(TAMANHO_MAX_BYTES).toBe(16 * 1024 * 1024);
    expect(podeTranscrever(120, 1_000_000)).toEqual({ ok: true });
    expect(podeTranscrever(301, 1000).ok).toBe(false);
    expect(podeTranscrever(10, TAMANHO_MAX_BYTES + 1).ok).toBe(false);
  });
  it('duração ou tamanho desconhecidos não bloqueiam (o servidor ainda limita)', () => {
    expect(podeTranscrever(undefined, null).ok).toBe(true);
  });
});

describe('calcularOnda', () => {
  const sr = 16000;
  it('silêncio dá 40 valores baixos (0..2)', () => {
    const o = calcularOnda(new Float32Array(sr * 3));
    expect(o).toHaveLength(QTD_BARRAS_ONDA);
    expect(Math.max(...o)).toBeLessThanOrEqual(2);
  });
  it('tom constante dá picos altos e todos entre 0 e 31', () => {
    const pcm = Float32Array.from({ length: sr * 3 }, (_, i) => 0.8 * Math.sin(2 * Math.PI * 440 * i / sr));
    const o = calcularOnda(pcm);
    expect(o).toHaveLength(40);
    expect(Math.min(...o)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...o)).toBe(PICO_MAX);
    expect(o.every(Number.isInteger)).toBe(true);
    expect(Math.min(...o)).toBeGreaterThan(20);
  });
  it('trecho alto e trecho baixo se distinguem; áudio mais curto que 40 amostras não quebra', () => {
    const pcm = new Float32Array(sr * 2);
    for (let i = 0; i < sr; i++) pcm[i] = 0.9 * Math.sin(i / 5);
    for (let i = sr; i < sr * 2; i++) pcm[i] = 0.05 * Math.sin(i / 5);
    const o = calcularOnda(pcm);
    expect(o[5]!).toBeGreaterThan(o[35]!);
    expect(calcularOnda(new Float32Array(10))).toHaveLength(40);
    expect(calcularOnda(new Float32Array(0))).toEqual(new Array(40).fill(0));
  });
});

describe('calcularOnda: relevo de fala (como no WhatsApp)', () => {
  const sr = 16000;
  it('volumes parecidos ainda se espalham: o trecho mais fraco fica bem abaixo do mais forte', () => {
    // 40 trechos com volume entre 0.5 e 0.8 (fala sem pausa longa): antes tudo saía entre 24 e 31
    const pcm = new Float32Array(sr * 8);
    for (let b = 0; b < 40; b++) { const amp = 0.5 + 0.3 * ((b * 7) % 11) / 10; const ini = Math.floor(b * pcm.length / 40), fim = Math.floor((b + 1) * pcm.length / 40); for (let i = ini; i < fim; i++) pcm[i] = amp * Math.sin(i / 3); }
    const o = calcularOnda(pcm);
    expect(Math.max(...o)).toBe(PICO_MAX);
    expect(Math.min(...o)).toBeLessThanOrEqual(10);
  });
});

describe('validarOnda', () => {
  const boa = Array.from({ length: 40 }, (_, i) => i % 32);
  it('aceita exatamente 40 inteiros de 0 a 31', () => { expect(validarOnda(boa)).toEqual(boa); });
  it('recusa tamanho errado, fora da faixa, não inteiro e não array', () => {
    expect(validarOnda(boa.slice(1))).toBeNull();
    expect(validarOnda([...boa, 1])).toBeNull();
    expect(validarOnda(boa.map((v, i) => (i === 3 ? 32 : v)))).toBeNull();
    expect(validarOnda(boa.map((v, i) => (i === 3 ? -1 : v)))).toBeNull();
    expect(validarOnda(boa.map((v, i) => (i === 3 ? 1.5 : v)))).toBeNull();
    expect(validarOnda('x')).toBeNull();
    expect(validarOnda(null)).toBeNull();
  });
});
