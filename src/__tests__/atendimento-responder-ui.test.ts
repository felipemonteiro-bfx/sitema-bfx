// Responder com citação e novo player de áudio (UI). O vitest roda em `node`: marcação estática,
// funções puras e testes de fonte; clique, arrasto e áudio foram vistos no navegador.
import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.stubGlobal('React', React);
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/app/(app)/crm/atendimento/midia-tentar-actions', () => ({ tentarMidiaDeNovo: vi.fn() }));

import { Bolha, ESTILO_BOLHA, type MensagemExibida } from '@/app/(app)/crm/atendimento/bolha';
import { QTD_BARRAS, VELOCIDADES, proximaVelocidade, rotuloVelocidade, tempoDoTeclado, tempoPorPosicao, textoDoTempo } from '@/app/(app)/crm/atendimento/player-audio-regras';

const lerFonte = (f: string) => readFileSync(`src/app/(app)/crm/atendimento/${f}`, 'utf8');
const base = (o: Partial<MensagemExibida> = {}): MensagemExibida =>
  ({ id: 10, criadoEm: new Date('2026-10-16T18:03:00Z'), corpo: 'Por que o tempo não está correto?', direcao: 'in', origem: 'manual', status: 'entregue', tipo: 'texto', waMessageId: 'wamid.B', ...o });
const html = (m: MensagemExibida) => renderToStaticMarkup(React.createElement(Bolha, { m, nomeContato: 'Cliente Teste' }));

describe('citação na bolha', () => {
  it('sem citação não há bloco', () => {
    expect(html(base())).not.toContain('Ir para a mensagem citada');
  });
  it('cliente citando mensagem de voz sua: autor "Você", resumo com rótulo', () => {
    const h = html(base({ citacao: { id: 4, direcao: 'out', tipo: 'texto', corpoResumo: 'Entendido, houve só um engano' } }));
    expect(h).toContain('Ir para a mensagem citada');
    expect(h).toContain('>Você<');
    expect(h).toContain('Entendido, houve só um engano');
    expect(h).toContain('data-citacao');
  });
  it('você citando áudio do cliente: nome do contato e "Mensagem de voz"', () => {
    const h = html(base({ direcao: 'out', citacao: { id: 5, direcao: 'in', tipo: 'audio', corpoResumo: 'Mensagem de voz', midiaId: 'u-1' } }));
    expect(h).toContain('Cliente Teste');
    expect(h).toContain('Mensagem de voz');
  });
  it('foto citada: rótulo, legenda e miniatura à direita', () => {
    const h = html(base({ direcao: 'out', citacao: { id: 6, direcao: 'in', tipo: 'imagem', corpoResumo: 'Foto', legenda: 'É essa a lavadora?', miniaturaId: 'u-2' } }));
    expect(h).toContain('Foto');
    expect(h).toContain('É essa a lavadora?');
    expect(h).toContain('/api/whatsapp/midias/u-2');
  });
  it('citada fora do banco: "Mensagem indisponível", sem botão de rolagem ativo', () => {
    const h = html(base({ citacao: { id: 0, direcao: '', tipo: 'indisponivel', corpoResumo: 'Mensagem indisponível', indisponivel: true } }));
    expect(h).toContain('Mensagem indisponível');
  });
  it('citação em bolha de mídia (áudio) também aparece', () => {
    const m = base({ tipo: 'audio', corpo: '[Áudio]', midia: { id: 'u-3', tipo: 'audio', status: 'salva', mime: 'audio/ogg', tamanho: 1, nomeExibicao: null, legenda: null, voz: true, animada: false },
      citacao: { id: 4, direcao: 'out', tipo: 'texto', corpoResumo: 'oi' } });
    expect(html(m)).toContain('Ir para a mensagem citada');
  });
});

describe('ação responder', () => {
  it('a bolha é âncora (id msg-N) e tem o botão Responder, sem Reagir', () => {
    const h = html(base());
    expect(h).toContain('id="msg-10"');
    expect(h).toContain('aria-label="Responder"');
    expect(h).not.toContain('Reagir');
  });
  it('mensagem sem wa_message_id não pode ser citada: sem botão', () => {
    expect(html(base({ waMessageId: null }))).not.toContain('aria-label="Responder"');
  });
  it('destaque de 1,2s respeita prefers-reduced-motion', () => {
    expect(ESTILO_BOLHA).toContain('bolha-destaque');
    expect(ESTILO_BOLHA).toContain('1200ms');
    expect(ESTILO_BOLHA).toMatch(/prefers-reduced-motion:reduce\)\{.*bolha-destaque::after\{animation:none/);
  });
});

describe('composer', () => {
  const fonte = lerFonte('reply.tsx');
  it('faixa "Respondendo a", cancelar com X e ESC', () => {
    expect(fonte).toContain('Respondendo a');
    expect(fonte).toContain('Cancelar resposta');
    expect(fonte).toContain("'Escape'");
  });
  it('texto, anexo e áudio levam respondeA e a citação é limpa após o envio', () => {
    expect(fonte).toContain('responderConversa(telefone,texto,citando?.resumo.id,enviarComPrevia(texto,semPrevia))');
    expect(fonte).toContain("fd.set('respondeA'");
    expect(fonte.split('cancelarResposta()').length - 1).toBeGreaterThanOrEqual(2);
  });
  it('o provedor da resposta envolve log e composer', () => {
    const chat = lerFonte('conversa-chat.tsx');
    expect(chat).toContain('RespostaProvider');
  });
});

describe('player de áudio', () => {
  it('o player usa 40 barras, as mesmas da onda real', () => { expect(QTD_BARRAS).toBe(40); });
  it('velocidades 1 → 1,5 → 2 → 1 e rótulos em pt-BR', () => {
    expect(VELOCIDADES).toEqual([1, 1.5, 2]);
    expect(proximaVelocidade(1)).toBe(1.5);
    expect(proximaVelocidade(1.5)).toBe(2);
    expect(proximaVelocidade(2)).toBe(1);
    expect(rotuloVelocidade(1.5)).toBe('1,5×');
    expect(rotuloVelocidade(2)).toBe('2×');
  });
  it('posição por toque limita 0..total', () => {
    expect(tempoPorPosicao(0.5, 40)).toBe(20);
    expect(tempoPorPosicao(-1, 40)).toBe(0);
    expect(tempoPorPosicao(2, 40)).toBe(40);
    expect(tempoPorPosicao(0.5, 0)).toBe(0);
  });
  it('teclado: setas ±5s, Home/End, limites; outras teclas ignoradas', () => {
    expect(tempoDoTeclado('ArrowRight', 10, 41)).toBe(15);
    expect(tempoDoTeclado('ArrowLeft', 3, 41)).toBe(0);
    expect(tempoDoTeclado('ArrowRight', 40, 41)).toBe(41);
    expect(tempoDoTeclado('Home', 10, 41)).toBe(0);
    expect(tempoDoTeclado('End', 10, 41)).toBe(41);
    expect(tempoDoTeclado('a', 10, 41)).toBeNull();
  });
  it('parado mostra a duração total; tocando (ou no meio) o tempo corrido', () => {
    expect(textoDoTempo(false, 0, 41)).toBe('0:41');
    expect(textoDoTempo(true, 16, 41)).toBe('0:16');
    expect(textoDoTempo(false, 16, 41)).toBe('0:16');
    expect(textoDoTempo(false, 0, 0)).toBe('0:00');
  });
  it('slider acessível e metadata antes do play', () => {
    const h = html(base({ tipo: 'audio', corpo: '[Áudio]', midia: { id: 'u-9', tipo: 'audio', status: 'salva', mime: 'audio/ogg', tamanho: 1, nomeExibicao: null, legenda: null, voz: true, animada: false } }));
    expect(h).toMatch(/role="slider"[^>]*aria-label="Posição do áudio"|aria-label="Posição do áudio"[^>]*role="slider"/);
    expect(h).toContain('tabindex="0"');
    expect(h).toContain('preload="metadata"');
  });
  it('só um áudio toca por vez (fonte)', () => {
    expect(lerFonte('player-audio.tsx')).toContain('pause()');
    expect(lerFonte('player-audio.tsx')).toMatch(/audioAtivo/);
  });
});
