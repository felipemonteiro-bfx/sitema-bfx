// Envio com/sem prévia: o X do composer vira preview_url:false no sendText da Meta.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ admin: vi.fn(), window: vi.fn(), resolve: vi.fn(), send: vi.fn(), find: vi.fn(), create: vi.fn(), sent: vi.fn(), fail: vi.fn(), lock: vi.fn(), waId: vi.fn() }));
vi.mock('@/lib/guards', () => ({ requireAdmin: m.admin }));
vi.mock('@/lib/whatsapp-mensagem', () => ({ dentroDaJanela24h: m.window, marcarEnviada: m.sent, marcarFalha: m.fail }));
vi.mock('@/lib/whatsapp-provider', () => ({ resolveWhatsAppProviders: m.resolve }));
vi.mock('@/lib/whatsapp-citacao', async (orig) => ({ ...(await orig<typeof import('@/lib/whatsapp-citacao')>()), waIdDaCitada: m.waId }));
vi.mock('@/lib/db', () => ({ prisma: { $transaction: async (fn: (tx: unknown) => unknown) => fn({ $executeRaw: m.lock, whatsAppMensagem: { findFirst: m.find, create: m.create } }) } }));
import { responderConversa } from '@/app/(app)/crm/atendimento/actions';
import { MetaProvider } from '@/lib/providers/whatsapp-meta';
import { enviarComPrevia } from '@/lib/linkificar';

const TEL = '559200000000';
beforeEach(() => {
  vi.resetAllMocks();
  m.admin.mockResolvedValue(true); m.window.mockResolvedValue(true);
  m.resolve.mockResolvedValue({ primary: { name: 'meta_cloud', sendText: m.send } });
  m.find.mockResolvedValue(null); m.create.mockResolvedValue({ id: 12 });
  m.send.mockResolvedValue({ ok: true, messageId: 'wamid.t' });
});
afterEach(() => vi.unstubAllGlobals());

describe('MetaProvider.sendText: preview_url', () => {
  const prov = new MetaProvider({ token: 't', phoneNumberId: '1', apiVersion: 'v21.0' });
  const corpo = (f: ReturnType<typeof vi.fn>) => JSON.parse((f.mock.calls[0]![1] as RequestInit).body as string);
  const ok = () => vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ messages: [{ id: 'w' }] }) } as Response);
  it('padrão: preview_url true', async () => {
    const f = ok(); vi.stubGlobal('fetch', f);
    await prov.sendText(TEL, 'veja https://a.com');
    expect(corpo(f).text.preview_url).toBe(true);
  });
  it('previewUrl:false desliga a prévia', async () => {
    const f = ok(); vi.stubGlobal('fetch', f);
    await prov.sendText(TEL, 'veja https://a.com', { previewUrl: false });
    expect(corpo(f).text).toEqual({ body: 'veja https://a.com', preview_url: false });
  });
  it('previewUrl:false convive com a citação', async () => {
    const f = ok(); vi.stubGlobal('fetch', f);
    await prov.sendText(TEL, 'x', { previewUrl: false, respondeAWaId: 'wamid.A' });
    expect(corpo(f)).toMatchObject({ text: { preview_url: false }, context: { message_id: 'wamid.A' } });
  });
});

describe('responderConversa: comPrevia', () => {
  it('sem o parâmetro, nada muda (opções undefined)', async () => {
    await responderConversa(TEL, 'oi https://a.com');
    expect(m.send).toHaveBeenCalledWith(TEL, 'oi https://a.com', undefined);
  });
  it('comPrevia=false manda previewUrl:false', async () => {
    await responderConversa(TEL, 'oi https://a.com', undefined, false);
    expect(m.send).toHaveBeenCalledWith(TEL, 'oi https://a.com', { previewUrl: false });
  });
  it('comPrevia=false junto com a citação', async () => {
    m.waId.mockResolvedValue('wamid.Q');
    await responderConversa(TEL, 'oi https://a.com', 5, false);
    expect(m.send).toHaveBeenCalledWith(TEL, 'oi https://a.com', { respondeAWaId: 'wamid.Q', previewUrl: false });
  });
  it('só citação: igual a antes', async () => {
    m.waId.mockResolvedValue('wamid.Q');
    await responderConversa(TEL, 'oi', 5);
    expect(m.send).toHaveBeenCalledWith(TEL, 'oi', { respondeAWaId: 'wamid.Q' });
  });
});

describe('enviarComPrevia (composer)', () => {
  it('sem X: envia com prévia', () => expect(enviarComPrevia('veja https://a.com/x', null)).toBe(true));
  it('X na URL atual: sem prévia', () => expect(enviarComPrevia('veja https://a.com/x', 'https://a.com/x')).toBe(false));
  it('X numa URL que já não é a primeira: volta a enviar com prévia', () => expect(enviarComPrevia('veja https://b.com/y', 'https://a.com/x')).toBe(true));
  it('texto sem link: com prévia (irrelevante)', () => expect(enviarComPrevia('oi', 'https://a.com/x')).toBe(true));
});
