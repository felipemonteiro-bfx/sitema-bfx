import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assinarImagem, verificarImagem, extrairMeta, CacheLru, LimitadorPrevia, detectarImagem, aguardarVaga, TTL_IMAGEM_MS } from '@/lib/link-previa';

const FINAL = 'https://loja.exemplo.com.br/produtos/lavadora?id=1';

describe('extrairMeta', () => {
  it('og:* tem prioridade; entidades decodificadas; site e domínio', () => {
    const html = `<html><head><title>Titulo da aba</title>
      <meta property="og:title" content="Lavadora &amp; Secadora &quot;Pro&quot; &#233; &#x41;">
      <meta property="og:description" content="Cesto inox &lt;12&gt; programas&nbsp;de lavagem">
      <meta property="og:site_name" content="Magazine Exemplo">
      <meta property="og:image" content="/img/lavadora.jpg">
      <meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"></head></html>`;
    const m = extrairMeta(html, FINAL);
    expect(m.titulo).toBe('Lavadora & Secadora "Pro" é A');
    expect(m.descricao).toBe('Cesto inox <12> programas de lavagem');
    expect(m.site).toBe('Magazine Exemplo');
    expect(m.imagem).toBe('https://loja.exemplo.com.br/img/lavadora.jpg');
    expect(m.larga).toBe(true);
  });

  it('cai para twitter:*, <title> e meta description', () => {
    expect(extrairMeta('<meta name="twitter:title" content="TW"><meta name="twitter:description" content="D">', FINAL)).toMatchObject({ titulo: 'TW', descricao: 'D' });
    expect(extrairMeta('<title>\n  Só o título  </title><meta name="description" content="Desc normal">', FINAL)).toMatchObject({ titulo: 'Só o título', descricao: 'Desc normal' });
  });

  it('aceita aspas simples, atributos fora de ordem e maiúsculas', () => {
    const m = extrairMeta(`<META CONTENT='Oi' PROPERTY='og:title'>`, FINAL);
    expect(m.titulo).toBe('Oi');
  });

  it('trunca título a 200 e descrição a 300', () => {
    const m = extrairMeta(`<meta property="og:title" content="${'t'.repeat(500)}"><meta property="og:description" content="${'d'.repeat(900)}">`, FINAL);
    expect(m.titulo.length).toBeLessThanOrEqual(200);
    expect(m.descricao.length).toBeLessThanOrEqual(300);
  });

  it('imagem relativa resolve contra a URL final; só http(s)', () => {
    expect(extrairMeta('<meta property="og:image" content="//cdn.exemplo.com/a.png">', FINAL).imagem).toBe('https://cdn.exemplo.com/a.png');
    expect(extrairMeta('<meta property="og:image" content="a.png">', FINAL).imagem).toBe('https://loja.exemplo.com.br/produtos/a.png');
    expect(extrairMeta('<meta property="og:image" content="javascript:alert(1)">', FINAL).imagem).toBeNull();
    expect(extrairMeta('<meta property="og:image" content="data:image/png;base64,AAAA">', FINAL).imagem).toBeNull();
    expect(extrairMeta('<meta property="og:image" content="https://u:p@x.com/a.png">', FINAL).imagem).toBeNull();
    expect(extrairMeta('<meta property="og:image" content="file:///etc/passwd">', FINAL).imagem).toBeNull();
  });

  it('sem dimensões -> não é larga; quadrada -> não é larga', () => {
    expect(extrairMeta('<meta property="og:image" content="/a.png">', FINAL).larga).toBe(false);
    expect(extrairMeta('<meta property="og:image" content="/a.png"><meta property="og:image:width" content="600"><meta property="og:image:height" content="600">', FINAL).larga).toBe(false);
  });

  it('é texto: HTML dentro do conteúdo vira texto literal, sem tags executáveis na saída bruta decodificada', () => {
    const m = extrairMeta('<meta property="og:title" content="&lt;img src=x onerror=alert(1)&gt;">', FINAL);
    expect(m.titulo).toBe('<img src=x onerror=alert(1)>'); // string de texto; a UI nunca usa innerHTML
  });

  it('não decodifica duas vezes', () => {
    expect(extrairMeta('<meta property="og:title" content="&amp;lt;">', FINAL).titulo).toBe('&lt;');
  });

  it('página sem nada devolve vazios', () => {
    expect(extrairMeta('<html></html>', FINAL)).toMatchObject({ titulo: '', descricao: '', site: '', imagem: null });
  });
});

describe('assinatura da imagem (HMAC)', () => {
  const OLD = process.env.SESSION_SECRET;
  beforeEach(() => { process.env.SESSION_SECRET = 'segredo-de-teste-link-previa-0000000000'; });
  afterEach(() => { process.env.SESSION_SECRET = OLD; vi.useRealTimers(); });

  const IMG = 'https://cdn.exemplo.com/a.png';

  it('assina e verifica; a URL aponta para o proxy', () => {
    const rota = assinarImagem(IMG, 1_000_000);
    expect(rota.startsWith('/api/whatsapp/link-previa/imagem?')).toBe(true);
    const q = new URL(rota, 'http://x').searchParams;
    expect(verificarImagem(q.get('u'), q.get('exp'), q.get('sig'), 1_000_001)).toBe(IMG);
  });

  it('expirada é recusada', () => {
    const q = new URL(assinarImagem(IMG, 1_000_000), 'http://x').searchParams;
    expect(verificarImagem(q.get('u'), q.get('exp'), q.get('sig'), 1_000_000 + TTL_IMAGEM_MS + 1)).toBeNull();
  });

  it('adulterada (u, exp ou sig) é recusada', () => {
    const q = new URL(assinarImagem(IMG, 1_000_000), 'http://x').searchParams;
    expect(verificarImagem('https://interno.local/x', q.get('exp'), q.get('sig'), 1_000_001)).toBeNull();
    expect(verificarImagem(q.get('u'), String(Number(q.get('exp')) + 99999), q.get('sig'), 1_000_001)).toBeNull();
    expect(verificarImagem(q.get('u'), q.get('exp'), 'a'.repeat(64), 1_000_001)).toBeNull();
    expect(verificarImagem(q.get('u'), q.get('exp'), 'curta', 1_000_001)).toBeNull();
    expect(verificarImagem(null, null, null, 1)).toBeNull();
    expect(verificarImagem(q.get('u'), 'abc', q.get('sig'), 1)).toBeNull();
  });

  it('segredo diferente invalida a assinatura', () => {
    const q = new URL(assinarImagem(IMG, 1_000_000), 'http://x').searchParams;
    process.env.SESSION_SECRET = 'outro-segredo-completamente-diferente-000';
    expect(verificarImagem(q.get('u'), q.get('exp'), q.get('sig'), 1_000_001)).toBeNull();
  });
});

describe('detectarImagem (magic bytes)', () => {
  it('JPEG, PNG e WebP', () => {
    expect(detectarImagem(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe('image/jpeg');
    expect(detectarImagem(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('image/png');
    expect(detectarImagem(Buffer.concat([Buffer.from('RIFF'), Buffer.from([1, 2, 3, 4]), Buffer.from('WEBPVP8 ')]))).toBe('image/webp');
  });
  it('recusa SVG, GIF, HTML e vazio', () => {
    expect(detectarImagem(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(detectarImagem(Buffer.from('GIF89a....'))).toBeNull();
    expect(detectarImagem(Buffer.from('<html><script>'))).toBeNull();
    expect(detectarImagem(Buffer.alloc(0))).toBeNull();
  });
});

describe('CacheLru', () => {
  it('expulsa o menos usado e respeita TTL', () => {
    let agora = 0;
    const c = new CacheLru<string>(2, () => agora);
    c.set('a', '1', 1000); c.set('b', '2', 1000);
    expect(c.get('a')).toBe('1'); // a vira o mais recente
    c.set('c', '3', 1000); // expulsa b
    expect(c.get('b')).toBeUndefined();
    expect(c.get('a')).toBe('1');
    agora = 1001;
    expect(c.get('a')).toBeUndefined();
    expect(c.size).toBeLessThanOrEqual(2);
  });
});

describe('LimitadorPrevia', () => {
  it('30 por minuto por usuário', () => {
    let agora = 0;
    const l = new LimitadorPrevia({ porMinuto: 30, global: 100, now: () => agora });
    for (let i = 0; i < 30; i++) { const r = l.adquirir(1); expect(r.ok).toBe(true); if (r.ok) r.liberar(); }
    expect(l.adquirir(1)).toEqual({ ok: false, motivo: 'limite' });
    expect(l.adquirir(2).ok).toBe(true); // outro usuário não é afetado
    agora = 61_000;
    expect(l.adquirir(1).ok).toBe(true);
  });

  it('1 em voo por usuário', () => {
    const l = new LimitadorPrevia({ porMinuto: 30, global: 100 });
    const a = l.adquirir(1); expect(a.ok).toBe(true);
    expect(l.adquirir(1)).toEqual({ ok: false, motivo: 'ocupado' });
    if (a.ok) a.liberar();
    expect(l.adquirir(1).ok).toBe(true);
  });

  it('teto global de 4', () => {
    const l = new LimitadorPrevia({ porMinuto: 30, global: 4 });
    const rs = [1, 2, 3, 4].map((u) => l.adquirir(u));
    expect(rs.every((r) => r.ok)).toBe(true);
    expect(l.adquirir(5)).toEqual({ ok: false, motivo: 'global' });
    const r0 = rs[0]!; if (r0.ok) r0.liberar();
    expect(l.adquirir(5).ok).toBe(true);
  });

  it('liberar duas vezes não libera duas vagas', () => {
    const l = new LimitadorPrevia({ porMinuto: 30, global: 1 });
    const a = l.adquirir(1); if (a.ok) { a.liberar(); a.liberar(); }
    const b = l.adquirir(2); expect(b.ok).toBe(true);
    expect(l.adquirir(3)).toEqual({ ok: false, motivo: 'global' });
  });
});

describe('aguardarVaga', () => {
  it('espera a vaga abrir (imagens simultâneas na abertura da conversa)', async () => {
    const l = new LimitadorPrevia({ porMinuto: 100, global: 1 });
    const a = l.adquirir(1); expect(a.ok).toBe(true);
    setTimeout(() => { if (a.ok) a.liberar(); }, 60);
    const b = await aguardarVaga(l, 2, 1000, 10);
    expect(b.ok).toBe(true);
  });
  it('desiste depois do prazo', async () => {
    const l = new LimitadorPrevia({ porMinuto: 100, global: 1 });
    l.adquirir(1);
    expect(await aguardarVaga(l, 2, 50, 10)).toEqual({ ok: false, motivo: 'global' });
  });
  it('estouro do limite por minuto não espera', async () => {
    const l = new LimitadorPrevia({ porMinuto: 1, global: 5 });
    const a = l.adquirir(1); if (a.ok) a.liberar();
    const t = Date.now();
    expect(await aguardarVaga(l, 1, 1000, 10)).toEqual({ ok: false, motivo: 'limite' });
    expect(Date.now() - t).toBeLessThan(200);
  });
});
