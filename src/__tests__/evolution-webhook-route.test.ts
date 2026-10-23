import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ config: vi.fn(), recebida: vi.fn(), humano: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: { config: { findFirst: mocks.config } } }));
vi.mock('@/lib/whatsapp-pre-atendimento', () => ({ processarMensagemRecebida: mocks.recebida, marcarAtendimentoHumano: mocks.humano }));
import { POST } from '@/app/api/webhooks/evolution/route';

const req = (data: unknown) => new Request('https://example.test/api/webhooks/evolution', {
  method: 'POST', headers:{apikey:'teste'}, body: JSON.stringify({ event: 'MESSAGES_UPSERT', data }),
});
const entrada = { key: { remoteJid: '5592000000000@s.whatsapp.net', fromMe: false }, message: { conversation: 'oi' }, pushName: 'Maria' };

beforeEach(() => { vi.resetAllMocks(); mocks.config.mockResolvedValue({ whatsappPreAtendimento: 1, evolutionApiKey: 'teste' }); });

describe('webhook Evolution', () => {
  it('valor 1 não chama processarMensagemRecebida: o Evolution só registra a pausa', async () => {
    const res = await POST(req(entrada));
    expect(res.status).toBe(200);
    expect(mocks.recebida).not.toHaveBeenCalled();
  });
  it('mensagem enviada por humano (fromMe) ainda pausa o automático', async () => {
    const res = await POST(req({ ...entrada, key: { ...entrada.key, fromMe: true }, source: 'android' }));
    expect(res.status).toBe(200);
    expect(mocks.humano).toHaveBeenCalledWith('5592000000000');
  });
});

it('recusa webhook sem chave configurada e não pausa atendimento', async () => {
 vi.stubEnv('EVOLUTION_API_KEY','');
 mocks.config.mockResolvedValue({});
 const res=await POST(req({...entrada,key:{...entrada.key,fromMe:true},source:'android'}));
 expect(res.status).toBe(503);
 expect(mocks.humano).not.toHaveBeenCalled();
});
