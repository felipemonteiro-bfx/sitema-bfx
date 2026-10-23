import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ config: vi.fn(), recebida: vi.fn(), humano: vi.fn(), entrada:vi.fn(), status:vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: { config: { findFirst: mocks.config } } }));
vi.mock('@/lib/whatsapp-pre-atendimento', () => ({ processarMensagemRecebida: mocks.recebida, marcarAtendimentoHumano: mocks.humano }));
vi.mock('@/lib/whatsapp-mensagem',()=>({registrarEntrada:mocks.entrada,avancarStatusPorWaMessageId:mocks.status}));
import { POST } from '@/app/api/webhooks/evolution/route';

const req = (data: unknown) => new Request('https://example.test/api/webhooks/evolution', {
  method: 'POST', headers:{apikey:'teste'}, body: JSON.stringify({ instance:'bfx',event: 'MESSAGES_UPSERT', data }),
});
const entrada = { messageTimestamp:Date.now()/1000, key: { id:'TEST', remoteJid: '5592000000000@s.whatsapp.net', fromMe: false }, message: { conversation: 'oi' }, pushName: 'Maria' };

beforeEach(() => { vi.unstubAllEnvs();vi.resetAllMocks(); mocks.config.mockResolvedValue({ whatsappPreAtendimento: 1, evolutionApiKey: 'teste' }); });

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

it('recebe texto novo sem acionar o bot nem abrir janela da Meta',async()=>{
 const res=await POST(req(entrada));expect(res.status).toBe(200);expect(mocks.entrada).toHaveBeenCalledWith(expect.objectContaining({provedor:'evolution',waMessageId:'evolution:TEST',corpo:'oi'}));expect(mocks.recebida).not.toHaveBeenCalled();
});
it('ignora histórico antigo sem registrar ou pausar contatos',async()=>{
 await POST(req({...entrada,messageTimestamp:1}));expect(mocks.entrada).not.toHaveBeenCalled();expect(mocks.humano).not.toHaveBeenCalled();
});
it('nega chave errada antes de ler eventos',async()=>{
 const res=await POST(new Request('https://bfx.test',{method:'POST',headers:{apikey:'errado'},body:JSON.stringify({instance:'bfx',event:'MESSAGES_UPSERT',data:entrada})}));expect(res.status).toBe(401);expect(mocks.entrada).not.toHaveBeenCalled();
});
