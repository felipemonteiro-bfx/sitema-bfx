// Acessibilidade do player e da gravação de voz: regras puras de teclado, foco por fase e anúncios.
import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.stubGlobal('React', React);
import { anuncioDoPlayer } from '@/app/(app)/crm/atendimento/player-audio-regras';
import { anuncioDaGravacao, atalhoDaPilula, focoDaFase } from '@/app/(app)/crm/atendimento/gravador-regras';
import { PilulaGravacao, type PropsPilula } from '@/app/(app)/crm/atendimento/gravador-pilula';

const lerFonte = (f: string) => readFileSync(`src/app/(app)/crm/atendimento/${f}`, 'utf8');

describe('anúncios do player', () => {
  it('tocando, pausado e velocidade', () => {
    expect(anuncioDoPlayer({ tipo: 'tocando' })).toBe('Tocando');
    expect(anuncioDoPlayer({ tipo: 'pausado' })).toBe('Pausado');
    expect(anuncioDoPlayer({ tipo: 'velocidade', valor: 1.5 })).toBe('Velocidade 1,5×');
    expect(anuncioDoPlayer({ tipo: 'velocidade', valor: 2 })).toBe('Velocidade 2×');
  });
  it('o player tem região aria-live polite e anuncia', () => {
    const f = lerFonte('player-audio.tsx');
    expect(f).toContain('aria-live="polite"');
    expect(f).toContain('anuncioDoPlayer');
  });
});

describe('foco por fase da gravação', () => {
  it('pedindo permissão: lixeira (o microfone sumiu); gravando: pausar', () => {
    expect(focoDaFase('pedindo-permissao', false)).toBe('descartar');
    expect(focoDaFase('gravando', true)).toBe('pausar');
  });
  it('pausado: continuar, ou ouvir quando não dá para continuar', () => {
    expect(focoDaFase('pausado', true)).toBe('continuar');
    expect(focoDaFase('pausado', false)).toBe('ouvir');
  });
  it('parado: ouvir; enviando: o próprio grupo; ocioso: o campo de mensagem', () => {
    expect(focoDaFase('parado', false)).toBe('ouvir');
    expect(focoDaFase('enviando', false)).toBe('grupo');
    expect(focoDaFase('ocioso', false)).toBe('campo');
  });
});

describe('atalhos com a pílula ativa', () => {
  const t = (o: Partial<Parameters<typeof atalhoDaPilula>[0]>) => atalhoDaPilula({ tecla: ' ', ctrl: false, meta: false, alvo: 'outro', fase: 'gravando', podeContinuar: true, ...o });
  it('Esc pausa quando gravando e nunca descarta', () => {
    expect(t({ tecla: 'Escape' })).toBe('pausar');
    expect(t({ tecla: 'Escape', fase: 'pausado' })).toBeNull();
    expect(t({ tecla: 'Escape', fase: 'parado' })).toBeNull();
  });
  it('Espaço alterna pausar/continuar só fora de botão e slider', () => {
    expect(t({})).toBe('pausar');
    expect(t({ fase: 'pausado' })).toBe('continuar');
    expect(t({ fase: 'pausado', podeContinuar: false })).toBeNull();
    expect(t({ alvo: 'botao' })).toBeNull();
    expect(t({ alvo: 'slider', fase: 'pausado' })).toBeNull();
  });
  it('Ctrl/Cmd+Enter envia gravando, pausado ou parado, mesmo com o foco num botão', () => {
    expect(t({ tecla: 'Enter', ctrl: true, alvo: 'botao' })).toBe('enviar');
    expect(t({ tecla: 'Enter', meta: true, fase: 'pausado' })).toBe('enviar');
    expect(t({ tecla: 'Enter', ctrl: true, fase: 'parado' })).toBe('enviar');
    expect(t({ tecla: 'Enter', ctrl: true, fase: 'enviando' })).toBeNull();
    expect(t({ tecla: 'Enter' })).toBeNull();
  });
});

describe('anúncios da gravação', () => {
  it('um por evento', () => {
    expect(anuncioDaGravacao({ tipo: 'iniciou' })).toBe('Gravando');
    expect(anuncioDaGravacao({ tipo: 'pausou', segundos: 13 })).toBe('Gravação pausada, 0:13');
    expect(anuncioDaGravacao({ tipo: 'pausou', segundos: 300, limite: true })).toBe('Limite de 5 min. Gravação pausada, 5:00');
    expect(anuncioDaGravacao({ tipo: 'continuou' })).toBe('Gravando de novo');
    expect(anuncioDaGravacao({ tipo: 'descartou' })).toBe('Gravação descartada');
    expect(anuncioDaGravacao({ tipo: 'enviando' })).toBe('Enviando mensagem de voz');
  });
});

describe('markup da pílula', () => {
  const fn = () => undefined;
  const base: PropsPilula = { fase: 'gravando', segundos: 5, niveis: [], resumo: new Array(80).fill(0.3), fracao: 0, tocando: false, previaPronta: true, podeContinuar: true, aviso: '', onCapacidade: fn, onDescartar: fn, onPausar: fn, onContinuar: fn, onOuvir: fn, onBuscar: fn, onEnviar: fn };
  const html = (p: Partial<PropsPilula>) => renderToStaticMarkup(React.createElement(PilulaGravacao, { ...base, ...p }));
  it('declara aria-keyshortcuts e dica nos botões, e marca o destino de foco', () => {
    const g = html({});
    expect(g).toMatch(/data-foco="pausar"[^>]*>|<button[^>]*data-foco="pausar"/);
    expect(g).toContain('aria-keyshortcuts="Escape"');
    expect(g).toContain('title="Pausar (Esc)"');
    expect(g).toContain('aria-keyshortcuts="Control+Enter Meta+Enter"');
    expect(g).toContain('title="Enviar (Ctrl+Enter)"');
    expect(g).not.toContain('Descartar (Esc)');
    const p = html({ fase: 'pausado', segundos: 13 });
    expect(p).toContain('data-foco="continuar"');
    expect(p).toContain('data-foco="ouvir"');
    expect(p).toContain('title="Continuar gravando (Espaço)"');
  });
  it('a prévia segue as regras do player (Espaço/K, setas de 5 s)', () => {
    const f = lerFonte('gravador-pilula.tsx');
    expect(f).toContain('acaoDoTeclado(e.key)');
    expect(f).toContain('tempoDoTeclado');
  });
  it('o gravador tem região aria-live e o Esc não descarta mais', () => {
    const f = lerFonte('gravador-audio.tsx');
    expect(f).toContain('aria-live="polite"');
    expect(f).not.toMatch(/Escape'\) \{ e\.preventDefault\(\); cancelar\(\)/);
  });
});
