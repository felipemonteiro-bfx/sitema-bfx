// Links clicáveis e prévia na bolha/composer. O vitest roda em `node`: marcação estática e testes de
// fonte; a busca sob demanda, o clique e a nova aba foram vistos no navegador.
import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.stubGlobal('React', React);
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/app/(app)/crm/atendimento/midia-tentar-actions', () => ({ tentarMidiaDeNovo: vi.fn() }));

import { Bolha, type MensagemExibida } from '@/app/(app)/crm/atendimento/bolha';
import { CartaoPrevia, TextoComLinks, type Previa } from '@/app/(app)/crm/atendimento/link-previa-ui';

const fonte = (f: string) => readFileSync(`src/app/(app)/crm/atendimento/${f}`, 'utf8');
const msg = (corpo: string, o: Partial<MensagemExibida> = {}): MensagemExibida =>
  ({ id: 1, criadoEm: new Date('2026-10-16T18:03:00Z'), corpo, direcao: 'in', origem: 'manual', status: 'entregue', tipo: 'texto', ...o });
const html = (m: MensagemExibida) => renderToStaticMarkup(React.createElement(Bolha, { m, nomeContato: 'Cliente' }));

describe('bolha: links', () => {
  it('URL vira âncora com target e rel de segurança, sem Referer', () => {
    const h = html(msg('Veja https://bfxshop.com.br/catalogo, ok?'));
    expect(h).toContain('href="https://bfxshop.com.br/catalogo"');
    expect(h).toContain('target="_blank"');
    expect(h).toContain('rel="noopener noreferrer nofollow"');
    expect(h).toContain('referrerPolicy="no-referrer"');
    expect(h).toContain('>https://bfxshop.com.br/catalogo</a><span>, ok?</span>');
  });
  it('www. leva https no href e mantém o texto digitado', () => {
    const h = html(msg('acesse www.bfxshop.com.br'));
    expect(h).toContain('href="https://www.bfxshop.com.br/"');
    expect(h).toContain('>www.bfxshop.com.br</a>');
  });
  it('javascript:, data: e credenciais não viram âncora', () => {
    for (const t of ['javascript:alert(1)', 'data:text/html,<b>x</b>', 'https://u:p@a.com/x']) expect(html(msg(t))).not.toContain('<a ');
  });
  it('HTML no texto continua escapado', () => {
    const h = html(msg('<img src=x onerror=alert(1)> https://a.com'));
    expect(h).not.toContain('<img');
    expect(h).toContain('&lt;img');
  });
  it('mensagem sem link não ganha âncora nem aviso', () => {
    const h = html(msg('oi, tudo bem?'));
    expect(h).not.toContain('<a ');
    expect(h).not.toContain('Sem prévia');
  });
  it('TextoComLinks (legenda de mídia) usa o mesmo componente', () => {
    expect(renderToStaticMarkup(React.createElement(TextoComLinks, { texto: 'foto http://a.com' }))).toContain('rel="noopener noreferrer nofollow"');
    expect(fonte('bolha-midia.tsx')).toContain('TextoComLinks');
  });
});

const pv = (o: Partial<Extract<Previa, { semPrevia?: false }>> = {}): Extract<Previa, { semPrevia?: false }> =>
  ({ titulo: 'Lavadora', descricao: 'Cesto inox', site: 'Loja', dominio: 'loja.exemplo.com.br', seguro: true, imagem: '/api/whatsapp/link-previa/imagem?u=x&exp=1&sig=y', larga: false, ...o });
const cartao = (p: Extract<Previa, { semPrevia?: false }>) => renderToStaticMarkup(React.createElement(CartaoPrevia, { url: 'https://loja.exemplo.com.br/p', p }));

describe('cartão da prévia', () => {
  it('é uma âncora única para a URL validada, em nova aba', () => {
    const h = cartao(pv());
    expect(h.startsWith('<a ')).toBe(true);
    expect(h).toContain('href="https://loja.exemplo.com.br/p"');
    expect(h).toContain('target="_blank"');
    expect(h).toContain('rel="noopener noreferrer nofollow"');
    expect(h).toContain('abre em nova aba');
  });
  it('grande (larga): imagem em cima; compacta: miniatura ao lado', () => {
    expect(cartao(pv({ larga: true }))).toContain('h-44 w-full');
    const c = cartao(pv());
    expect(c).toContain('w-21 shrink-0');
    expect(c).not.toContain('h-44');
  });
  it('a imagem vem do proxy assinado e não carrega Referer', () => {
    const h = cartao(pv());
    expect(h).toContain('src="/api/whatsapp/link-previa/imagem?');
    expect(h).toContain('referrerPolicy="no-referrer"');
  });
  it('sem imagem: só textos e domínio', () => {
    const h = cartao(pv({ imagem: null }));
    expect(h).not.toContain('<img');
    expect(h).toContain('Lavadora');
    expect(h).toContain('loja.exemplo.com.br');
  });
  it('og:* é texto: tags viram entidades', () => {
    const h = cartao(pv({ titulo: '<script>alert(1)</script>', descricao: '"><img src=x onerror=1>', imagem: null }));
    expect(h).not.toContain('<script>');
    expect(h).not.toContain('<img');
    expect(h).toContain('&lt;script&gt;');
  });
  it('http: sem aviso de conexão (o WhatsApp também não mostra)', () => {
    expect(cartao(pv({ seguro: false }))).not.toContain('não segura');
  });
  it('avatar de voz de contato sem nome usa o ícone de telefone, não "#"', () => {
    const f = readFileSync('src/app/(app)/crm/atendimento/player-audio.tsx', 'utf8');
    expect(f).toContain('<Phone');
  });
  it('sem prévia: nada além do link (nenhuma linha "Sem prévia", nenhum esqueleto)', () => {
    const f = readFileSync('src/app/(app)/crm/atendimento/link-previa-ui.tsx', 'utf8');
    expect(f).not.toContain('Sem prévia');
    expect(f).not.toContain('AvisoSemPrevia');
    expect(f).not.toContain('Skeleton');
  });
  it('imagem que falha ou chega vazia cai para o cartão sem imagem', () => {
    const f = readFileSync('src/app/(app)/crm/atendimento/link-previa-ui.tsx', 'utf8');
    expect(f).toContain('onError={onErro}');
    expect(f).toContain('naturalWidth');
    // sem imagem, mesmo "larga" vira o cartão compacto só com texto
    const h = cartao(pv({ imagem: null, larga: true }));
    expect(h).not.toContain('<img');
    expect(h).not.toContain('h-44');
    expect(h).toContain('flex items-stretch');
  });
});

describe('composer', () => {
  const reply = fonte('reply.tsx');
  it('mostra a prévia com atraso de 700 ms e o X "Enviar sem prévia"', () => {
    expect(reply).toContain('useUrlComAtraso(texto)');
    expect(reply).toContain('<PreviaComposer');
    const ui = fonte('link-previa-ui.tsx');
    expect(ui).toContain('ATRASO_PREVIA_MS = 700');
    expect(ui).toContain('aria-label="Enviar sem prévia"');
  });
  it('o envio passa o flag da prévia para a action (preview_url:false)', () => {
    expect(reply).toContain('responderConversa(telefone,texto,citando?.resumo.id,enviarComPrevia(texto,semPrevia))');
  });
  it('sem busca automática de IA/MCP: a rota só é chamada pela UI', () => {
    const fontes = ['ai.ts', 'ai-actions.ts', 'mcp-agente.ts'].map((f) => readFileSync(`src/lib/${f}`, 'utf8')).join('\n');
    expect(fontes).not.toContain('link-previa');
  });
});

describe('prévia: só imagem do proxy assinado', () => {
  const base: Extract<Previa, { semPrevia?: false }> = { titulo: 'T', descricao: '', site: 'S', dominio: 'exemplo.com', seguro: true, imagem: null, larga: true };
  it('URL absoluta ou rota diferente não vira <img>', () => {
    for (const imagem of ['https://evil.example/x.png', '//evil.example/x.png', '/api/outra?x=1', '/api/whatsapp/link-previa/imagem', 'javascript:alert(1)']) {
      expect(renderToStaticMarkup(React.createElement(CartaoPrevia, { url: 'https://exemplo.com', p: { ...base, imagem } }))).not.toContain('<img');
    }
    const ok = renderToStaticMarkup(React.createElement(CartaoPrevia, { url: 'https://exemplo.com', p: { ...base, imagem: '/api/whatsapp/link-previa/imagem?u=a&exp=1&sig=b' } }));
    expect(ok).toContain('<img');
  });
  it('composer também filtra', () => {
    expect(readFileSync('src/app/(app)/crm/atendimento/link-previa-ui.tsx', 'utf8')).toContain('imagemDoProxy(previa.imagem)');
  });
});
