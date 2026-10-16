import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ admin: vi.fn(), config: vi.fn(), state: vi.fn(), create: vi.fn(), logout: vi.fn() }));
vi.mock('@/lib/guards', () => ({ requireAdmin: mocks.admin }));
vi.mock('@/lib/db', () => ({ prisma: { config: { findFirst: mocks.config } } }));
vi.mock('@/lib/evolution', () => ({ getInstanceState: mocks.state, createInstance: mocks.create, logoutInstance: mocks.logout }));
import { GET, POST } from '@/app/api/whatsapp/route';
beforeEach(() => {
  vi.resetAllMocks();
  mocks.admin.mockResolvedValue(true);
  mocks.config.mockResolvedValue({ whatsappProvider: 'meta_cloud', metaWhatsappPhoneNumberId: '123', metaAppSecret: 'private-secret', metaWebhookVerifyToken: 'private-verify', whatsappAutoEnabled: 0 });
  mocks.state.mockResolvedValue({ state: 'close' });
});
describe('conexão respeita o provedor selecionado', () => {
  it('Meta informa configuração pendente sem consultar ou criar Evolution nem revelar segredos', async () => {
    const res = await GET();
    const data = await res.json();
    expect(data).toMatchObject({ provider: 'meta_cloud', state: 'unknown', meta: { phoneConfigured: true, tokenConfigured: false, appSecretConfigured: true, verifyTokenConfigured: true, sendingEnabled: false } });
    expect(JSON.stringify(data)).not.toContain('private-');
    expect(mocks.state).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it.each(['create', 'logout'])('bloqueia ação Evolution %s quando Meta selecionada', async action => {
    const res = await POST(new Request('https://example.test/api/whatsapp', { method: 'POST', body: JSON.stringify({ action }) }));
    expect(res.status).toBe(409);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.logout).not.toHaveBeenCalled();
  });
  it('consultar Evolution desconectada não inicia reconexão', async () => {
    mocks.config.mockResolvedValue({ whatsappProvider: 'evolution' });
    expect(await (await GET()).json()).toMatchObject({ state: 'close', provider: 'evolution' });
    expect(mocks.state).toHaveBeenCalledOnce();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('exige administrador antes de ler configuração', async () => {
    mocks.admin.mockResolvedValue(false);
    expect((await GET()).status).toBe(401);
    expect(mocks.config).not.toHaveBeenCalled();
  });
});
