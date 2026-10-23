import { describe, expect, it } from 'vitest';
import { partirTexto, primeiraUrl } from '@/lib/linkificar';

const links = (t: string) => partirTexto(t).filter((p) => p.tipo === 'link');

describe('linkificar', () => {
  it('texto sem link volta inteiro como texto', () => {
    expect(partirTexto('oi, tudo bem?')).toEqual([{ tipo: 'texto', texto: 'oi, tudo bem?' }]);
    expect(partirTexto('')).toEqual([]);
  });

  it('divide texto, link e texto', () => {
    expect(partirTexto('veja https://a.com/x agora')).toEqual([
      { tipo: 'texto', texto: 'veja ' },
      { tipo: 'link', texto: 'https://a.com/x', url: 'https://a.com/x' },
      { tipo: 'texto', texto: ' agora' },
    ]);
  });

  it('www. vira https:// no href, mas o texto exibido não muda', () => {
    expect(links('acesse www.bfxshop.com.br/catalogo')).toEqual([
      { tipo: 'link', texto: 'www.bfxshop.com.br/catalogo', url: 'https://www.bfxshop.com.br/catalogo' },
    ]);
  });

  it('http e https são aceitos', () => {
    expect(links('http://a.com.br e https://b.com')).toHaveLength(2);
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'ftp://a.com/x',
    'vbscript:msgbox(1)',
  ])('recusa esquema perigoso: %s', (t) => {
    expect(links(t)).toEqual([]);
    expect(links(`veja ${t}`)).toEqual([]);
  });

  it('recusa credenciais embutidas na URL', () => {
    expect(links('https://user:senha@a.com/x')).toEqual([]);
    expect(links('https://user@a.com/x')).toEqual([]);
  });

  it('não vira link no meio de palavra ou e-mail', () => {
    expect(links('xhttp://a.com')).toEqual([]);
    expect(links('fulano@www.a.com')).toEqual([]);
  });

  it.each([
    ['veja https://a.com.', 'https://a.com'],
    ['(https://a.com/x)', 'https://a.com/x'],
    ['https://a.com/x, depois', 'https://a.com/x'],
    ['"https://a.com/x"', 'https://a.com/x'],
    ["'https://a.com/x'", 'https://a.com/x'],
    ['https://a.com/x?!', 'https://a.com/x'],
    ['https://a.com/x;', 'https://a.com/x'],
    ['https://a.com/x:', 'https://a.com/x'],
    ['[https://a.com/x]', 'https://a.com/x'],
    ['{https://a.com/x}', 'https://a.com/x'],
    ['https://a.com/x)).', 'https://a.com/x'],
  ])('tira pontuação final de %s', (t, esperado) => {
    expect(links(t)[0]).toMatchObject({ texto: esperado });
  });

  it('parêntese balanceado faz parte da URL', () => {
    expect(links('https://pt.wikipedia.org/wiki/Foo_(bar)')[0]).toMatchObject({ texto: 'https://pt.wikipedia.org/wiki/Foo_(bar)' });
    expect(links('(veja https://pt.wikipedia.org/wiki/Foo_(bar))')[0]).toMatchObject({ texto: 'https://pt.wikipedia.org/wiki/Foo_(bar)' });
  });

  it('a pontuação cortada volta para o texto seguinte', () => {
    expect(partirTexto('ver https://a.com.')).toEqual([
      { tipo: 'texto', texto: 'ver ' },
      { tipo: 'link', texto: 'https://a.com', url: 'https://a.com/' },
      { tipo: 'texto', texto: '.' },
    ]);
  });

  it('não decodifica: percent-encoding fica como veio', () => {
    expect(links('https://a.com/a%20b%2Fc')[0]).toMatchObject({ url: 'https://a.com/a%20b%2Fc' });
  });

  it('reconstruir as partes devolve o texto original', () => {
    const t = 'a https://x.com/y, b www.z.com. c\nhttp://q.com/(1)';
    expect(partirTexto(t).map((p) => p.texto).join('')).toBe(t);
  });

  it('múltiplos links: primeiraUrl devolve o primeiro (href validado)', () => {
    expect(primeiraUrl('x https://a.com/1 e https://b.com/2')).toBe('https://a.com/1');
    expect(primeiraUrl('www.a.com')).toBe('https://www.a.com/');
    expect(primeiraUrl('sem link')).toBeNull();
    expect(primeiraUrl('javascript:alert(1)')).toBeNull();
  });

  it('URL gigante ou malformada não quebra', () => {
    expect(() => partirTexto('https://' + 'a'.repeat(100000))).not.toThrow();
    expect(links('http://')).toEqual([]);
    expect(links('https://.')).toEqual([]);
  });
});
