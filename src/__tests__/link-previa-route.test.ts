import { beforeEach, describe, expect, it, vi } from 'vitest';

const sessionMock = { getSession: vi.fn() };
const fetchMock = vi.fn();
vi.mock('@/lib/session', () => sessionMock);
vi.mock('@/lib/rede-publica', async (orig) => ({ ...(await orig<typeof import('@/lib/rede-publica')>()), fetchPublicoPinado: fetchMock }));

process.env.SESSION_SECRET = 'segredo-de-teste-link-previa-0000000000';
const rotaPrevia = await import('@/app/api/whatsapp/link-previa/route');
const rotaImagem = await import('@/app/api/whatsapp/link-previa/imagem/route');
const { ErroRedePublica } = await import('@/lib/rede-publica');
const { assinarImagem } = await import('@/lib/link-previa');

const admin = { id: 4, username: 'admin', role: 'admin' };
const get = (url: string) => new Request(url);
const previa = (u: string) => get(`http://local/api/whatsapp/link-previa?url=${encodeURIComponent(u)}`);
const HTML = `<title>x</title><meta property="og:title" content="Catálogo &amp; Cia"><meta property="og:description" content="Desc"><meta property="og:image" content="/i.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">`;
const ok = (corpo: string | Buffer, extra: object = {}) => ({ status: 200, urlFinal: 'https://loja.exemplo.com.br/p', contentType: 'text/html', corpo: Buffer.from(corpo), truncado: false, ...extra });

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.getSession.mockResolvedValue(admin);
});

describe('GET /api/whatsapp/link-previa', () => {
  it('runtime nodejs', () => {
    expect(rotaPrevia.runtime).toBe('nodejs');
    expect(rotaImagem.runtime).toBe('nodejs');
  });

  it('sem sessão: 401; vendedor: 403; sem buscar nada', async () => {
    sessionMock.getSession.mockResolvedValue(null);
    expect((await rotaPrevia.GET(previa('https://a.exemplo.com/1'))).status).toBe(401);
    sessionMock.getSession.mockResolvedValue({ id: 9, username: 'v', role: 'vendedor' });
    expect((await rotaPrevia.GET(previa('https://a.exemplo.com/1'))).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['javascript:alert(1)', 'file:///etc/passwd', 'https://u:p@a.com/', '', 'abc'])('URL inválida %s: 400', async (u) => {
    expect((await rotaPrevia.GET(previa(u))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('devolve os metadados, com a imagem pelo proxy assinado', async () => {
    fetchMock.mockResolvedValue(ok(HTML));
    const r = await rotaPrevia.GET(previa('https://loja.exemplo.com.br/p'));
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j).toMatchObject({ titulo: 'Catálogo & Cia', descricao: 'Desc', dominio: 'loja.exemplo.com.br', seguro: true, larga: true });
    expect(j.imagem.startsWith('/api/whatsapp/link-previa/imagem?u=')).toBe(true);
    expect(decodeURIComponent(j.imagem)).toContain('https://loja.exemplo.com.br/i.png');
    expect(r.headers.get('cache-control')).toMatch(/private/);
    const [, opts] = fetchMock.mock.calls[0]!;
    expect(opts.maxBytes).toBe(512 * 1024);
    expect(opts.aceitar('text/html')).toBe(true);
    expect(opts.aceitar('application/xhtml+xml')).toBe(true);
    expect(opts.aceitar('application/pdf')).toBe(false);
    expect(opts.aceitar('image/png')).toBe(false);
  });

  it('redirect para outro host: sem metadados, só o domínio original; cache pela URL original', async () => {
    fetchMock.mockResolvedValue(ok(HTML, { urlFinal: 'https://outro.exemplo.net/x' }));
    const j = await (await rotaPrevia.GET(previa('https://encurta.exemplo.com.br/abc'))).json();
    expect(j).toEqual({ semPrevia: true, dominio: 'encurta.exemplo.com.br', seguro: true });
    await rotaPrevia.GET(previa('https://encurta.exemplo.com.br/abc'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('redirect só entre www e apex do mesmo host mantém a prévia', async () => {
    fetchMock.mockResolvedValue(ok(HTML, { urlFinal: 'https://www.loja2.exemplo.com.br/p' }));
    const j = await (await rotaPrevia.GET(previa('https://loja2.exemplo.com.br/p'))).json();
    expect(j).toMatchObject({ titulo: 'Catálogo & Cia', dominio: 'loja2.exemplo.com.br' });
  });

  it('http: seguro=false', async () => {
    fetchMock.mockResolvedValue(ok(HTML, { urlFinal: 'http://velho.exemplo.com.br/' }));
    const j = await (await rotaPrevia.GET(previa('http://velho.exemplo.com.br/'))).json();
    expect(j).toMatchObject({ seguro: false, dominio: 'velho.exemplo.com.br' });
  });

  it('cache: a segunda consulta não busca de novo', async () => {
    fetchMock.mockResolvedValue(ok(HTML));
    await rotaPrevia.GET(previa('https://cache.exemplo.com.br/1'));
    await rotaPrevia.GET(previa('https://cache.exemplo.com.br/1'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falha de rede/bloqueio: 200 com semPrevia e domínio (e a falha também é cacheada)', async () => {
    fetchMock.mockRejectedValue(new ErroRedePublica('ip_nao_publico'));
    const r = await rotaPrevia.GET(previa('http://falha.exemplo.com.br/x'));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ semPrevia: true, dominio: 'falha.exemplo.com.br', seguro: false });
    await rotaPrevia.GET(previa('http://falha.exemplo.com.br/x'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('página sem título nem descrição nem imagem vira semPrevia', async () => {
    fetchMock.mockResolvedValue(ok('<html><body>oi</body></html>'));
    expect(await (await rotaPrevia.GET(previa('https://vazia.exemplo.com.br/'))).json()).toMatchObject({ semPrevia: true });
  });

  it('limite por usuário: a 31ª em um minuto vira 429', async () => {
    sessionMock.getSession.mockResolvedValue({ id: 777, username: 'x', role: 'admin' });
    fetchMock.mockResolvedValue(ok(HTML));
    let ultimo = 200;
    for (let i = 0; i < 31; i++) ultimo = (await rotaPrevia.GET(previa(`https://lim.exemplo.com.br/${i}`))).status;
    expect(ultimo).toBe(429);
  });

  it('um fetch em voo por usuário: o segundo simultâneo vira 429', async () => {
    sessionMock.getSession.mockResolvedValue({ id: 888, username: 'y', role: 'admin' });
    let solta!: (v: unknown) => void;
    fetchMock.mockImplementationOnce(() => new Promise((r) => { solta = r; }));
    const a = rotaPrevia.GET(previa('https://voo.exemplo.com.br/a'));
    await new Promise((r) => setTimeout(r, 10));
    expect((await rotaPrevia.GET(previa('https://voo.exemplo.com.br/b'))).status).toBe(429);
    solta(ok(HTML));
    expect((await a).status).toBe(200);
  });
});

describe('GET /api/whatsapp/link-previa/imagem', () => {
  const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
  const img = (rota: string) => get(`http://local${rota}`);
  const rota = () => assinarImagem('https://loja.exemplo.com.br/i.png');

  it('sem sessão 401; vendedor 403', async () => {
    sessionMock.getSession.mockResolvedValue(null);
    expect((await rotaImagem.GET(img(rota()))).status).toBe(401);
    sessionMock.getSession.mockResolvedValue({ id: 9, username: 'v', role: 'vendedor' });
    expect((await rotaImagem.GET(img(rota()))).status).toBe(403);
  });

  it('assinatura inválida, adulterada ou expirada: 403 e nada é buscado', async () => {
    const r = rota();
    expect((await rotaImagem.GET(img(r.replace(/sig=[0-9a-f]{4}/, 'sig=0000')))).status).toBe(403);
    expect((await rotaImagem.GET(img(r.replace('loja.exemplo', 'interno.exemplo')))).status).toBe(403);
    expect((await rotaImagem.GET(img(assinarImagem('https://loja.exemplo.com.br/i.png', Date.now() - 48 * 3600_000)))).status).toBe(403);
    expect((await rotaImagem.GET(img('/api/whatsapp/link-previa/imagem'))).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('serve PNG com o tipo detectado e os cabeçalhos de segurança', async () => {
    fetchMock.mockResolvedValue(ok(PNG, { contentType: 'image/jpeg' })); // o cabeçalho mente; vale o conteúdo
    const r = await rotaImagem.GET(img(rota()));
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('image/png');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('content-security-policy')).toBe("sandbox; default-src 'none'");
    expect(r.headers.get('cross-origin-resource-policy')).toBe('same-origin');
    expect(r.headers.get('cache-control')).toBe('private, max-age=86400');
    expect(Buffer.from(await r.arrayBuffer()).equals(PNG)).toBe(true);
    expect(fetchMock.mock.calls[0]![1].maxBytes).toBe(2 * 1024 * 1024);
  });

  it('SVG e HTML são recusados mesmo com content-type de imagem', async () => {
    fetchMock.mockResolvedValue(ok('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', { contentType: 'image/png' }));
    expect((await rotaImagem.GET(img(rota()))).status).toBe(415);
  });

  it('acima de 2 MB (leitura cortada): 413', async () => {
    fetchMock.mockResolvedValue(ok(PNG, { truncado: true }));
    expect((await rotaImagem.GET(img(rota()))).status).toBe(413);
  });

  it('falha de rede: 502 sem detalhes', async () => {
    fetchMock.mockRejectedValue(new ErroRedePublica('ip_nao_publico'));
    const r = await rotaImagem.GET(img(rota()));
    expect(r.status).toBe(502);
    expect(JSON.stringify(await r.json())).not.toMatch(/ip_nao_publico|10\.|127\./);
  });
});
