// UI da transcrição e da onda no player: marcação estática (o vitest roda em node) e testes de fonte.
import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.stubGlobal('React', React);
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/app/(app)/crm/atendimento/midia-tentar-actions', () => ({ tentarMidiaDeNovo: vi.fn() }));
vi.mock('@/app/(app)/crm/atendimento/transcricao-actions', () => ({ salvarTranscricao: vi.fn(), salvarOnda: vi.fn() }));

import { Bolha, type MensagemExibida } from '@/app/(app)/crm/atendimento/bolha';

const fonte = (f: string) => readFileSync(`src/app/(app)/crm/atendimento/${f}`, 'utf8');
const ID = '3f2b8c1e-5a4d-4e6f-9a7b-1c2d3e4f5a6b';
const msg = (m: Record<string, unknown> = {}): MensagemExibida =>
  ({ id: 1, criadoEm: new Date('2026-10-16T18:03:00Z'), corpo: '[Áudio]', direcao: 'in', origem: 'manual', status: 'entregue', tipo: 'audio',
    midia: { id: ID, tipo: 'audio', status: 'salva', mime: 'audio/ogg', tamanho: 120000, nomeExibicao: null, legenda: null, voz: true, animada: false, ...m } }) as MensagemExibida;
const html = (m: MensagemExibida) => renderToStaticMarkup(React.createElement(Bolha, { m, nomeContato: 'Cliente Teste' }));

describe('transcrição na bolha de áudio', () => {
  it('sem transcrição salva: botão "Transcrever", sem bloco', () => {
    const h = html(msg());
    expect(h).toContain('Transcrever');
    expect(h).toContain('aria-label="Transcrever áudio"');
    expect(h).not.toContain('Transcrição automática');
  });
  it('com transcrição: bloco com o texto e a nota; sem botão', () => {
    const h = html(msg({ transcricao: 'Quero saber da lavadora <b>x</b>' }));
    expect(h).toContain('Transcrição automática');
    expect(h).toContain('Quero saber da lavadora &lt;b&gt;x&lt;/b&gt;'); // texto, nunca HTML
    expect(h).toContain('Gerada no navegador · não verificada · pode conter erros');
    expect(h).not.toContain('aria-label="Transcrever áudio"');
  });
  it('áudio maior que 16 MB não oferece transcrição', () => {
    expect(html(msg({ tamanho: 17 * 1024 * 1024 }))).not.toContain('aria-label="Transcrever áudio"');
  });
});

describe('onda real no player', () => {
  it('com onda do banco: 40 barras com altura vinda dos picos, sem placeholder', () => {
    const onda = Array.from({ length: 40 }, (_, i) => i % 32);
    const h = html(msg({ onda }));
    expect(h.match(/data-barra/g)).toHaveLength(80);
    expect(h).not.toContain('data-onda-esqueleto');
    expect(h).toContain('--s:1'); // pico 31 → escala 1
  });
  it('sem onda: esqueleto uniforme (não finge forma)', () => {
    const h = html(msg());
    expect(h).toContain('data-onda-esqueleto');
    const escalas = new Set(h.match(/--s:[0-9.]+/g));
    expect(escalas.size).toBe(1);
  });
  it('fonte: progresso por requestAnimationFrame, ref + style direto, IntersectionObserver e sem ondaDoId', () => {
    const f = fonte('player-audio.tsx');
    expect(f).toContain('requestAnimationFrame');
    expect(f).toContain('cancelAnimationFrame');
    expect(f).toContain('IntersectionObserver');
    expect(f).toContain('setPointerCapture');
    expect(f).toContain('prefers-reduced-motion');
    expect(f).not.toContain('ondaDoId');
    expect(f).not.toMatch(/onTimeUpdate/);
  });
  it('ondaDoId deixou de existir', () => {
    expect(fonte('status-mensagem.ts')).not.toContain('ondaDoId');
  });
});

describe('onda sob demanda', () => {
  it('regras: play até o teto geral; visível só até 2 MB e com tamanho conhecido', async () => {
    const { podeCalcularOnda, ATRASO_ONDA_VISIVEL_MS, LIMITE_ONDA_VISIVEL_BYTES } = await import('@/app/(app)/crm/atendimento/onda-regras');
    expect(ATRASO_ONDA_VISIVEL_MS).toBe(1500);
    expect(LIMITE_ONDA_VISIVEL_BYTES).toBe(2 * 1024 * 1024);
    expect(podeCalcularOnda('visivel', 2 * 1024 * 1024)).toBe(true);
    expect(podeCalcularOnda('visivel', 2 * 1024 * 1024 + 1)).toBe(false);
    expect(podeCalcularOnda('visivel', null)).toBe(false);
    expect(podeCalcularOnda('play', 5 * 1024 * 1024)).toBe(true);
    expect(podeCalcularOnda('play', 17 * 1024 * 1024)).toBe(false);
    expect(podeCalcularOnda('play', null)).toBe(true);
  });
  it('fonte: temporizador de visibilidade e disparo no play', () => {
    const f = fonte('player-audio.tsx');
    expect(f).toContain('ATRASO_ONDA_VISIVEL_MS');
    expect(f).toContain("iniciarOnda('play')");
    expect(f).toContain("podeCalcularOnda('visivel'");
  });
});
