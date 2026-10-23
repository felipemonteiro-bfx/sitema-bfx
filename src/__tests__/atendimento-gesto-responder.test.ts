// Gesto de responder (deslizar), menu de contexto (segurar / botão direito) e setinha em todas as bolhas.
// O vitest roda em `node`: função pura do gesto, marcação estática e leitura da fonte; o gesto de verdade foi visto no navegador.
import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.stubGlobal('React', React);
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/app/(app)/crm/atendimento/midia-tentar-actions', () => ({ tentarMidiaDeNovo: vi.fn() }));

import { LIMIAR, MAXIMO, progressoGesto } from '@/app/(app)/crm/atendimento/gesto-responder';
import { itensMenu } from '@/app/(app)/crm/atendimento/menu-mensagem';
import { Bolha, type MensagemExibida } from '@/app/(app)/crm/atendimento/bolha';

const DIR = join(process.cwd(), 'src/app/(app)/crm/atendimento');
const fonte = (n: string) => readFileSync(join(DIR, n), 'utf8');
const ID = '3f2b8c1e-5a4d-4e6f-9a7b-1c2d3e4f5a6b';
const base = (o: Partial<MensagemExibida> = {}): MensagemExibida =>
  ({ id: 7, criadoEm: new Date('2026-10-16T18:03:00Z'), corpo: 'Olá', direcao: 'in', origem: 'whatsapp', status: 'recebido', tipo: 'texto', midia: null, waMessageId: 'wamid.X', citacao: null, ...o }) as MensagemExibida;
const pdf = (o: Partial<MensagemExibida> = {}) => base({ tipo: 'documento', corpo: '[Documento]', midia: { id: ID, tipo: 'documento', status: 'salva', mime: 'application/pdf', tamanho: 1000, nomeExibicao: 'a.pdf', legenda: null, voz: false, animada: false }, ...o });
const html = (m: MensagemExibida) => renderToStaticMarkup(React.createElement(Bolha, { m, nomeContato: 'Cliente' }));

describe('progressoGesto (função pura)', () => {
  it('abaixo do limiar acompanha o dedo 1:1 e não dispara', () => {
    const r = progressoGesto(32, 2);
    expect(r.deslocamento).toBe(32);
    expect(r.progresso).toBeCloseTo(0.5);
    expect(r.disparar).toBe(false);
    expect(r.cancelarPorVertical).toBe(false);
  });
  it('no limiar de 64px dispara e o progresso chega a 1', () => {
    const r = progressoGesto(LIMIAR, 0);
    expect(LIMIAR).toBe(64);
    expect(r.disparar).toBe(true);
    expect(r.progresso).toBe(1);
  });
  it('depois do limiar há resistência e o deslocamento nunca passa do máximo (~96px)', () => {
    const r = progressoGesto(100, 0);
    expect(r.deslocamento).toBeGreaterThan(LIMIAR);
    expect(r.deslocamento).toBeLessThan(100);
    expect(progressoGesto(900, 0).deslocamento).toBe(MAXIMO);
    expect(MAXIMO).toBe(96);
    expect(progressoGesto(900, 0).progresso).toBe(1);
  });
  it('para a esquerda não desloca nem dispara', () => {
    const r = progressoGesto(-80, 0);
    expect(r.deslocamento).toBe(0);
    expect(r.progresso).toBe(0);
    expect(r.disparar).toBe(false);
  });
  it('movimento mais vertical que horizontal nos primeiros 10px libera para o scroll', () => {
    expect(progressoGesto(3, 12).cancelarPorVertical).toBe(true);
    expect(progressoGesto(12, 3).cancelarPorVertical).toBe(false);
    expect(progressoGesto(4, 6).cancelarPorVertical).toBe(false); // ainda não andou 10px
  });
});

describe('itensMenu', () => {
  it('Responder e Baixar quando há resposta possível e mídia salva', () => {
    expect(itensMenu({ podeResponder: true, midiaId: ID }).map(i => i.chave)).toEqual(['responder', 'baixar']);
    expect(itensMenu({ podeResponder: true, midiaId: ID })[1]).toMatchObject({ href: `/api/whatsapp/midias/${ID}?baixar=1` });
  });
  it('texto: só Responder; sem waMessageId e sem mídia: nada', () => {
    expect(itensMenu({ podeResponder: true, midiaId: null }).map(i => i.chave)).toEqual(['responder']);
    expect(itensMenu({ podeResponder: false, midiaId: ID }).map(i => i.chave)).toEqual(['baixar']);
    expect(itensMenu({ podeResponder: false, midiaId: null })).toEqual([]);
  });
});

describe('bolhas', () => {
  it('toda bolha com ação tem a setinha "Mais opções da mensagem"', () => {
    expect(html(base())).toContain('aria-label="Mais opções da mensagem"');
    expect(html(base({ direcao: 'out' }))).toContain('aria-label="Mais opções da mensagem"');
  });
  it('bolha de texto sem waMessageId não tem gesto; o menu existe só por causa do Copiar (e some sem texto)', () => {
    const h = html(base({ waMessageId: null }));
    expect(h).toContain('Mais opções da mensagem');
    expect(h).not.toContain('data-gesto-responder');
    expect(html(base({ waMessageId: null, corpo: '' }))).not.toContain('Mais opções da mensagem');
  });
  it('bolha com waMessageId é alvo do gesto', () => {
    expect(html(base())).toContain('data-gesto-responder');
  });
  it('PDF mantém a setinha própria, sem duplicar a da bolha', () => {
    const h = html(pdf());
    expect(h).toContain('aria-label="Mais opções de a.pdf"');
    expect(h).not.toContain('Mais opções da mensagem');
  });
  it('mídia sem waMessageId ainda tem a setinha (Baixar)', () => {
    const h = html(base({ tipo: 'imagem', corpo: '[Foto]', waMessageId: null, midia: { id: ID, tipo: 'imagem', status: 'salva', mime: 'image/jpeg', tamanho: 10, nomeExibicao: null, legenda: null, voz: false, animada: false } }));
    expect(h).toContain('aria-label="Mais opções da mensagem"');
  });
});

describe('fonte', () => {
  it('gesto só com toque e scroll vertical liberado', () => {
    const g = fonte('gesto-responder.ts');
    expect(g).toContain("pointerType === 'touch'");
    expect(g).toContain('navigator.vibrate');
    expect(g).toContain('prefers-reduced-motion');
    expect(fonte('bolha-interativa.tsx')).toMatch(/touch-pan-y|touch-action:\s*pan-y|touchAction:\s*'pan-y'/);
  });
  it('PDF usa o menu comum (Responder acima de Baixar)', () => {
    expect(fonte('bolha-pdf.tsx')).toContain('SetaMenuMensagem');
    expect(fonte('menu-mensagem.tsx').indexOf('Responder')).toBeLessThan(fonte('menu-mensagem.tsx').indexOf('Baixar'));
  });
  it('botão direito e segurar abrem o menu', () => {
    const b = fonte('bolha-interativa.tsx');
    expect(b).toContain('onContextMenu');
    expect(fonte('gesto-responder.ts')).toContain('450');
  });
});
