// Markup dos dois estados da gravação (pílula única) e o composer escondendo campo, + e ⚡.
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.stubGlobal('React', React);
import { PilulaGravacao, type PropsPilula } from '@/app/(app)/crm/atendimento/gravador-pilula';

const fn = () => undefined;
const base: PropsPilula = {
  fase: 'gravando', segundos: 5, niveis: [0.2, 0.8, 0.4], resumo: new Array(80).fill(0.3), fracao: 0, tocando: false,
  previaPronta: true, podeContinuar: true, aviso: '', onCapacidade: fn, onDescartar: fn, onPausar: fn, onContinuar: fn, onOuvir: fn, onBuscar: fn, onEnviar: fn,
};
const html = (p: Partial<PropsPilula>) => renderToStaticMarkup(React.createElement(PilulaGravacao, { ...base, ...p }));
const ordem = (h: string, ...marcas: string[]) => { const pos = marcas.map(m => h.indexOf(m)); expect(pos.every(p => p >= 0), `faltou: ${marcas.filter((_, i) => pos[i]! < 0).join(', ')}`).toBe(true); expect([...pos].sort((a, b) => a - b)).toEqual(pos); };

describe('pílula: gravando', () => {
  const h = html({});
  it('ordem: lixeira, ponto, tempo, onda, pausa, enviar', () => {
    ordem(h, 'aria-label="Descartar gravação"', 'data-ponto-rec', 'role="timer"', 'data-onda-viva', 'aria-label="Pausar gravação"', 'aria-label="Enviar mensagem de voz"');
  });
  it('tempo m:ss tabular e ponto pulsa com motion-reduce sem animação', () => {
    expect(h).toContain('0:05');
    expect(h).toContain('tabular-nums');
    expect(h).toMatch(/data-ponto-rec[^>]*animate-pulse[^>]*motion-reduce:animate-none|animate-pulse[^"]*motion-reduce:animate-none[^>]*data-ponto-rec/);
  });
  it('sem o texto fixo "máx. 5 min" e sem ouvir/continuar', () => {
    expect(h).not.toContain('máx.');
    expect(h).not.toContain('Continuar gravando');
    expect(h).not.toContain('Ouvir antes de enviar');
  });
  it('pílula de 56px, itens à direita, raio cheio', () => {
    expect(h).toContain('h-14');
    expect(h).toContain('justify-end');
    expect(h).toContain('rounded-full');
  });
  it('alvos de 44px', () => { expect(h).toContain('size-11'); });
  it('antes de 4:50 o tempo não é âmbar; a partir de 4:50 é warning-text', () => {
    const timer = (x: string) => x.match(/<span role="timer"[^>]*>/)![0];
    expect(timer(html({ segundos: 289 }))).not.toContain('text-warning-text');
    expect(timer(html({ segundos: 290 }))).toContain('text-warning-text');
  });
  it('aria do timer lê o tempo', () => { expect(h).toMatch(/role="timer"[^>]*aria-label="Gravando, 5 segundos"|aria-label="Gravando, 5 segundos"[^>]*role="timer"/); });
});

describe('pílula: pausado (prévia)', () => {
  const h = html({ fase: 'pausado', segundos: 13 });
  it('ordem: lixeira, ouvir, onda com bolinha, duração, continuar, enviar', () => {
    ordem(h, 'aria-label="Descartar gravação"', 'aria-label="Ouvir antes de enviar"', 'role="slider"', 'data-bolinha', '>0:13<', 'aria-label="Continuar gravando"', 'aria-label="Enviar mensagem de voz"');
    expect(h).not.toContain('aria-label="Pausar gravação"');
  });
  it('sem suporte a pausa/retomada esconde "continuar" e mantém o resto', () => {
    const s = html({ fase: 'pausado', segundos: 13, podeContinuar: false });
    expect(s).not.toContain('Continuar gravando');
    expect(s).toContain('Ouvir antes de enviar'); expect(s).toContain('Enviar mensagem de voz'); expect(s).toContain('Descartar gravação');
  });
  it('tocando troca o ouvir por pausar prévia', () => {
    expect(html({ fase: 'pausado', segundos: 13, tocando: true })).toContain('aria-label="Pausar prévia"');
  });
  it('aos 5:00 avisa "Limite de 5 min" em role=status', () => {
    const l = html({ fase: 'pausado', segundos: 300, podeContinuar: false, aviso: 'Limite de 5 min' });
    expect(l).toMatch(/role="status"[^>]*>[^<]*Limite de 5 min/);
  });
  it('codificando: mostra o texto e o enviar fica desabilitado', () => {
    const c = html({ fase: 'parado', previaPronta: false });
    expect(c).toContain('Codificando…');
    expect(c).toMatch(/aria-label="Enviar mensagem de voz"[^>]*disabled|disabled=""[^>]*aria-label="Enviar mensagem de voz"/);
  });
});

describe('composer (reply.tsx) durante a gravação', () => {
  const fonte = fs.readFileSync(path.resolve(__dirname, '..', 'app', '(app)', 'crm', 'atendimento', 'reply.tsx'), 'utf8');
  it('usa controlesDoComposer para esconder + , ⚡ e campo', () => {
    expect(fonte).toContain('controlesDoComposer(gravando)');
    expect(fonte).toMatch(/ctl\.anexar&&<AnexarMenu/);
    expect(fonte).toMatch(/ctl\.atalhos&&<span/);
    expect(fonte).toMatch(/ctl\.campo&&<div/);
  });
});
