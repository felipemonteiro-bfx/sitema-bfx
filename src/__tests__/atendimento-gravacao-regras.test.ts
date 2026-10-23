// Gravação de voz como no WhatsApp: regras puras (tempo, alerta de limite, pausa, onda ao vivo, composer).
import { describe, expect, it } from 'vitest';
import {
  INICIAL, LIMITE_ALERTA_SEGUNDOS, MSG_LIMITE, TETO_SEGUNDOS, controlesDoComposer, ehAlertaLimite,
  formatarTempoGravacao, podeContinuar, reduzir, type EstadoGravador,
} from '@/app/(app)/crm/atendimento/gravador-regras';
import { adicionarNivel, alturaDaBarra, nivelDoQuadro, resumirNiveis, slotsDaOnda } from '@/app/(app)/crm/atendimento/gravador-onda';

const gravando = (segundos: number): EstadoGravador => ({ fase: 'gravando', segundos });
const pausado = (segundos: number): EstadoGravador => ({ fase: 'pausado', segundos });

describe('tempo da gravação (m:ss como no WhatsApp)', () => {
  it('sem zero à esquerda nos minutos', () => {
    expect(formatarTempoGravacao(0)).toBe('0:00');
    expect(formatarTempoGravacao(5)).toBe('0:05');
    expect(formatarTempoGravacao(65)).toBe('1:05');
    expect(formatarTempoGravacao(300)).toBe('5:00');
  });
});

describe('alerta do limite', () => {
  it('fica âmbar a partir de 4:50, não antes', () => {
    expect(LIMITE_ALERTA_SEGUNDOS).toBe(290);
    expect(ehAlertaLimite(289)).toBe(false);
    expect(ehAlertaLimite(290)).toBe(true);
    expect(ehAlertaLimite(300)).toBe(true);
  });
  it('mensagem curta de limite', () => expect(MSG_LIMITE).toBe('Limite de 5 min'));
  it('aos 5:00 pausa sozinho (não vai para a prévia final)', () => {
    expect(reduzir(gravando(299), { tipo: 'tick', segundos: 300 })).toEqual(pausado(TETO_SEGUNDOS));
  });
});

describe('transições gravando ↔ pausado ↔ ocioso', () => {
  it('pausar e continuar preservam o tempo', () => {
    let e = reduzir(gravando(7), { tipo: 'pausar' });
    expect(e).toEqual(pausado(7));
    e = reduzir(e, { tipo: 'continuar' });
    expect(e).toEqual(gravando(7));
  });
  it('tick só conta gravando (pausado não anda)', () => {
    expect(reduzir(pausado(7), { tipo: 'tick', segundos: 9 })).toEqual(pausado(7));
  });
  it('pausar fora de gravando e continuar fora de pausado são ignorados', () => {
    expect(reduzir(INICIAL, { tipo: 'pausar' })).toEqual(INICIAL);
    expect(reduzir(gravando(3), { tipo: 'continuar' })).toEqual(gravando(3));
  });
  it('descartar (cancelar) volta a ocioso gravando ou pausado', () => {
    expect(reduzir(gravando(3), { tipo: 'cancelar' })).toEqual(INICIAL);
    expect(reduzir(pausado(3), { tipo: 'cancelar' })).toEqual(INICIAL);
  });
  it('parar (para enviar) vale gravando ou pausado; menos de 1 s é descartado', () => {
    expect(reduzir(gravando(5), { tipo: 'parar' })).toEqual({ fase: 'parado', segundos: 5 });
    expect(reduzir(pausado(5), { tipo: 'parar' })).toEqual({ fase: 'parado', segundos: 5 });
    expect(reduzir(pausado(0), { tipo: 'parar' }).fase).toBe('ocioso');
  });
});

describe('continuar gravando', () => {
  it('só quando o navegador pausa/retoma, há tempo e está pausado', () => {
    expect(podeContinuar(pausado(10), true)).toBe(true);
    expect(podeContinuar(pausado(10), false)).toBe(false); // sem suporte: esconde
    expect(podeContinuar(pausado(TETO_SEGUNDOS), true)).toBe(false); // limite atingido
    expect(podeContinuar(gravando(10), true)).toBe(false);
  });
});

describe('composer durante a gravação', () => {
  it('esconde campo, + e ⚡ enquanto grava', () => {
    expect(controlesDoComposer(true)).toEqual({ anexar: false, atalhos: false, campo: false });
    expect(controlesDoComposer(false)).toEqual({ anexar: true, atalhos: true, campo: true });
  });
});

describe('onda ao vivo a partir de amostras sintéticas', () => {
  it('silêncio dá nível 0; sinal forte satura em 1; mais volume, mais nível', () => {
    expect(nivelDoQuadro(new Float32Array(512))).toBe(0);
    expect(nivelDoQuadro(new Float32Array(512).fill(0.9))).toBe(1);
    const suave = nivelDoQuadro(new Float32Array(512).fill(0.02));
    const forte = nivelDoQuadro(new Float32Array(512).fill(0.2));
    expect(suave).toBeGreaterThan(0);
    expect(forte).toBeGreaterThan(suave);
  });
  it('quadro vazio é 0', () => expect(nivelDoQuadro(new Float32Array(0))).toBe(0));
  it('barras nascem da esquerda; o resto fica em pontinhos', () => {
    const slots = slotsDaOnda([0.1, 0.9, 0.5], 6);
    expect(slots.map(s => s.tipo)).toEqual(['barra', 'barra', 'barra', 'ponto', 'ponto', 'ponto']);
    const alt = (i: number) => { const x = slots[i]!; return x.tipo === 'barra' ? x.altura : -1; };
    expect(alt(1)).toBeGreaterThan(alt(0));
  });
  it('cheia, descarta a mais antiga (a onda rola para a esquerda)', () => {
    expect(adicionarNivel([1, 2, 3], 4, 3)).toEqual([2, 3, 4]);
    expect(adicionarNivel([1], 2, 3)).toEqual([1, 2]);
  });
  it('altura da barra respeita mínimo e máximo', () => {
    expect(alturaDaBarra(0)).toBe(3);
    expect(alturaDaBarra(1)).toBe(22);
  });
  it('resumo da gravação inteira em N barras (prévia da pausa)', () => {
    const niveis = Array.from({ length: 200 }, (_, i) => (i === 100 ? 1 : 0.1));
    const r = resumirNiveis(niveis, 40);
    expect(r).toHaveLength(40);
    expect(Math.max(...r)).toBe(1);
    expect(resumirNiveis([], 40)).toEqual(new Array(40).fill(0));
    expect(resumirNiveis([0.5, 1], 4)).toHaveLength(4); // menos amostras que barras: esticado
  });
});
