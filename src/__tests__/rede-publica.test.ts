import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { criarFetchPublico, fetchPublicoPinado, fetchComIpPinado, ipNaoPublico, ErroRedePublica } from '@/lib/rede-publica';

describe('ipNaoPublico', () => {
  it.each([
    // IPv4
    '0.0.0.0', '0.1.2.3', '10.0.0.1', '10.255.255.255', '127.0.0.1', '127.255.0.9', '169.254.169.254',
    '172.16.0.1', '172.31.255.255', '192.168.0.1', '100.64.0.1', '100.127.255.255', '255.255.255.255',
    '224.0.0.1', '239.255.255.250', '240.0.0.1', '192.0.0.1', '192.0.2.5', '198.18.0.1', '198.19.255.255',
    '198.51.100.1', '203.0.113.9',
    // IPv6
    '::', '::1', 'fe80::1', 'febf::1', 'fc00::1', 'fd12:3456::1', 'ff02::1', 'ff0e::1',
    '[::1]', '[fe80::1]', 'fe80::1%en0',
    // IPv4 mapeado (decimal e hex)
    '::ffff:127.0.0.1', '::ffff:10.0.0.1', '::ffff:169.254.169.254', '::ffff:7f00:1', '::ffff:a00:1', '::ffff:a9fe:a9fe',
    '[::ffff:127.0.0.1]', '0:0:0:0:0:ffff:7f00:1',
    // IPv4-compatível, NAT64, 6to4, Teredo, documentação
    '::7f00:1', '::127.0.0.1', '64:ff9b::7f00:1', '64:ff9b::a00:1', '64:ff9b::808:808', '2002:7f00:1::1', '2002:a00:1::', '2002:808:808::1',
    '2001::1', '2001:db8::1', '100::1',
    // lixo: falha fechado
    'abc', '', '999.1.1.1', '1.2.3', 'gggg::1',
  ])('%s é não público', (ip) => expect(ipNaoPublico(ip)).toBe(true));

  it.each(['8.8.8.8', '1.1.1.1', '157.240.1.1', '172.15.255.255', '172.32.0.1', '100.63.255.255', '100.128.0.1', '198.17.0.1', '198.20.0.1', '223.255.255.255', '2a03:2880::1', '2606:4700:4700::1111', '[2606:4700:4700::1111]', '2001:4860:4860::8888'])(
    '%s é público', (ip) => expect(ipNaoPublico(ip)).toBe(false));
});

describe('fetchPublicoPinado', () => {
  let srv: Server; let porta = 0; let acessos = 0;
  beforeAll(async () => {
    srv = createServer((req, res) => {
      acessos++;
      if (req.url === '/grande') { res.setHeader('content-type', 'text/html'); res.end('x'.repeat(5000)); return; }
      if (req.url === '/para-privado') { res.statusCode = 302; res.setHeader('location', 'http://10.0.0.1/segredo'); res.end(); return; }
      if (req.url === '/para-loop') { res.statusCode = 302; res.setHeader('location', '/para-loop'); res.end(); return; }
      if (req.url === '/para-ok') { res.statusCode = 302; res.setHeader('location', '/ok'); res.end(); return; }
      if (req.url === '/para-esquema') { res.statusCode = 302; res.setHeader('location', 'file:///etc/passwd'); res.end(); return; }
      if (req.url === '/para-credencial') { res.statusCode = 302; res.setHeader('location', 'http://u:p@127.0.0.1/'); res.end(); return; }
      if (req.url === '/png') { res.setHeader('content-type', 'image/png'); res.end('png'); return; }
      if (req.url === '/gz') { res.setHeader('content-type', 'text/html'); res.setHeader('content-encoding', 'gzip'); res.end(gzipSync('<title>comprimido</title>')); return; }
      if (req.url === '/br') { res.setHeader('content-type', 'text/html'); res.setHeader('content-encoding', 'br'); res.end(brotliCompressSync('<title>brotli</title>')); return; }
      if (req.url === '/bomba') { res.setHeader('content-type', 'text/html'); res.setHeader('content-encoding', 'gzip'); res.end(gzipSync(Buffer.alloc(20 * 1024 * 1024, 'a'))); return; }
      if (req.url === '/enc-estranho') { res.setHeader('content-type', 'text/html'); res.setHeader('content-encoding', 'zstd'); res.end('x'); return; }
      if (req.url === '/lento') { return; }
      if (req.url === '/eco') { res.setHeader('content-type', 'text/html'); res.end(JSON.stringify({ ae: req.headers['accept-encoding'], ua: req.headers['user-agent'], cookie: req.headers.cookie ?? null, ref: req.headers.referer ?? null })); return; }
      res.setHeader('content-type', 'text/html; charset=utf-8'); res.end('<title>ok</title>');
    });
    await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r));
    porta = (srv.address() as AddressInfo).port;
  });
  afterAll(() => new Promise<void>((r) => { srv.closeAllConnections?.(); srv.close(() => r()); }));

  const url = (p: string) => `http://127.0.0.1:${porta}${p}`;
  const html = (ct: string) => /^text\/html/i.test(ct);

  it('IP literal de loopback é recusado sem conectar', async () => {
    acessos = 0;
    await expect(fetchPublicoPinado('http://127.0.0.1/', { maxBytes: 1000, timeoutMs: 2000, aceitar: html })).rejects.toMatchObject({ codigo: 'ip_nao_publico' });
    expect(acessos).toBe(0);
  });

  it('localhost (resolve para loopback) é recusado', async () => {
    acessos = 0;
    await expect(fetchPublicoPinado(`http://localhost:${porta}/`, { maxBytes: 1000, timeoutMs: 2000, aceitar: html })).rejects.toBeInstanceOf(ErroRedePublica);
    expect(acessos).toBe(0);
  });

  it('porta diferente de 80/443 é recusada', async () => {
    await expect(fetchPublicoPinado('http://example.com:8080/', { maxBytes: 1000, timeoutMs: 2000, aceitar: html })).rejects.toMatchObject({ codigo: 'url_invalida' });
  });

  it.each(['ftp://example.com/', 'file:///etc/passwd', 'javascript:alert(1)', 'https://u:p@example.com/', 'abc'])('URL inválida %s', async (u) => {
    await expect(fetchPublicoPinado(u, { maxBytes: 1000, timeoutMs: 2000, aceitar: html })).rejects.toMatchObject({ codigo: 'url_invalida' });
  });

  // Com o laboratório (127.0.0.1 tratado como público, qualquer porta) dá para exercitar o resto.
  const lab = criarFetchPublico({ naoPublico: (ip) => ip !== '127.0.0.1', portaPermitida: () => true });

  it('não deixa o timer do DNS solto depois de resolver', async () => {
    const criados: unknown[] = []; const limpos = new Set<unknown>();
    const st = globalThis.setTimeout; const ct = globalThis.clearTimeout;
    const espST = vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: () => void, ms?: number, ...a: unknown[]) => { const h = st(fn, ms, ...a); if (ms !== undefined && ms > 7000 && ms <= 7777) criados.push(h); return h; }) as typeof setTimeout);
    const espCT = vi.spyOn(globalThis, 'clearTimeout').mockImplementation(((h: never) => { limpos.add(h); return ct(h); }) as typeof clearTimeout);
    try { await lab(url('/'), { maxBytes: 1000, timeoutMs: 7777, aceitar: html }); } finally { espST.mockRestore(); espCT.mockRestore(); }
    expect(criados.length).toBeGreaterThan(0);
    expect(criados.every((h) => limpos.has(h))).toBe(true);
  });

  it('fetchComIpPinado conecta no IP dado sem resolver o nome (Host preservado) e devolve Response', async () => {
    const r = await fetchComIpPinado(`http://cdn-que-nao-existe.invalid:${porta}/eco`, { headers: { Authorization: 'Bearer x' } }, { address: '127.0.0.1', family: 4 });
    expect(r.status).toBe(200);
    const eco = JSON.parse(await r.text());
    expect(eco.ref).toBeNull();
    const redir = await fetchComIpPinado(`http://cdn-que-nao-existe.invalid:${porta}/para-ok`, {}, { address: '127.0.0.1', family: 4 });
    expect(redir.status).toBe(302);
    expect(redir.headers.get('location')).toBe('/ok');
  });

  it('lê o corpo e devolve tipo e URL final', async () => {
    const r = await lab(url('/'), { maxBytes: 1000, timeoutMs: 2000, aceitar: html });
    expect(r.status).toBe(200);
    expect(r.corpo.toString()).toBe('<title>ok</title>');
    expect(r.truncado).toBe(false);
    expect(r.urlFinal).toBe(url('/'));
  });

  it('corta a leitura em maxBytes e avisa', async () => {
    const r = await lab(url('/grande'), { maxBytes: 100, timeoutMs: 2000, aceitar: html });
    expect(r.corpo.length).toBe(100);
    expect(r.truncado).toBe(true);
  });

  it('content-type não aceito é recusado', async () => {
    await expect(lab(url('/png'), { maxBytes: 1000, timeoutMs: 2000, aceitar: html })).rejects.toMatchObject({ codigo: 'tipo' });
  });

  it('redirect para IP privado é recusado', async () => {
    await expect(lab(url('/para-privado'), { maxBytes: 1000, timeoutMs: 2000, aceitar: html })).rejects.toMatchObject({ codigo: 'ip_nao_publico' });
  });

  it('redirect legítimo é seguido e a URL final é a do destino', async () => {
    const r = await lab(url('/para-ok'), { maxBytes: 1000, timeoutMs: 2000, aceitar: html });
    expect(r.urlFinal).toBe(url('/ok'));
  });

  it('mais de 3 saltos é recusado', async () => {
    await expect(lab(url('/para-loop'), { maxBytes: 1000, timeoutMs: 2000, aceitar: html })).rejects.toMatchObject({ codigo: 'redirect' });
  });

  it('redirect para outro esquema ou com credencial é recusado', async () => {
    await expect(lab(url('/para-esquema'), { maxBytes: 1000, timeoutMs: 2000, aceitar: html })).rejects.toMatchObject({ codigo: 'url_invalida' });
    await expect(lab(url('/para-credencial'), { maxBytes: 1000, timeoutMs: 2000, aceitar: html })).rejects.toMatchObject({ codigo: 'url_invalida' });
  });

  it('redirect para porta fora de 80/443 é recusado (política padrão por salto)', async () => {
    const estrito = criarFetchPublico({ naoPublico: (ip) => ip !== '127.0.0.1', portaPermitida: (p) => p === porta });
    // /para-privado aponta para :80 -> porta não permitida neste laboratório
    await expect(estrito(url('/para-privado'), { maxBytes: 1000, timeoutMs: 2000, aceitar: html })).rejects.toMatchObject({ codigo: 'url_invalida' });
  });

  it('servidor que ignora identity e manda gzip/brotli: descomprime', async () => {
    expect((await lab(url('/gz'), { maxBytes: 1000, timeoutMs: 2000, aceitar: html })).corpo.toString()).toBe('<title>comprimido</title>');
    expect((await lab(url('/br'), { maxBytes: 1000, timeoutMs: 2000, aceitar: html })).corpo.toString()).toBe('<title>brotli</title>');
  });

  it('bomba de descompressão: o teto vale para o corpo já descomprimido', async () => {
    const r = await lab(url('/bomba'), { maxBytes: 1000, timeoutMs: 3000, aceitar: html });
    expect(r.corpo.length).toBe(1000);
    expect(r.truncado).toBe(true);
  });

  it('codificação desconhecida é recusada', async () => {
    await expect(lab(url('/enc-estranho'), { maxBytes: 1000, timeoutMs: 2000, aceitar: html })).rejects.toMatchObject({ codigo: 'tipo' });
  });

  it('timeout total', async () => {
    await expect(lab(url('/lento'), { maxBytes: 1000, timeoutMs: 300, aceitar: html })).rejects.toMatchObject({ codigo: 'timeout' });
  });

  it('cabeçalhos: identity, UA próprio, sem cookie nem Referer', async () => {
    const r = await lab(url('/eco'), { maxBytes: 1000, timeoutMs: 2000, aceitar: html });
    expect(JSON.parse(r.corpo.toString())).toEqual({ ae: 'identity', ua: 'BFXLinkPreview/1.0', cookie: null, ref: null });
  });

  it('DNS devolvendo UM endereço privado entre vários recusa tudo', async () => {
    const f = criarFetchPublico({
      naoPublico: ipNaoPublico,
      resolver: async () => [{ address: '8.8.8.8', family: 4 }, { address: '10.0.0.5', family: 4 }],
    });
    await expect(f('http://exemplo.test/', { maxBytes: 100, timeoutMs: 1000, aceitar: html })).rejects.toMatchObject({ codigo: 'ip_nao_publico' });
  });
});
