import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({admin:vi.fn(),config:vi.fn(),messages:vi.fn(),evolution:vi.fn(),flags:vi.fn()}));
vi.mock('@/lib/guards',()=>({requireAdmin:mocks.admin}));
vi.mock('@/lib/db',()=>({prisma:{config:{findFirst:mocks.config},whatsAppMensagem:{findMany:mocks.messages}}}));
vi.mock('@/lib/evolution',()=>({getInstanceState:mocks.evolution}));
vi.mock('@/lib/whatsapp',()=>({getWhatsAppFlags:mocks.flags}));
import { GET } from '@/app/api/whatsapp/diagnostico/route';
beforeEach(()=>{
 vi.resetAllMocks(); mocks.admin.mockResolvedValue(true);
 mocks.config.mockResolvedValue({whatsappProvider:'meta_cloud',metaWhatsappToken:'test-secret',metaWhatsappPhoneNumberId:'1354895454379397',metaWhatsappApiVersion:'v21.0',whatsappAutoEnabled:0});
 mocks.messages.mockResolvedValue([{id:1,criadoEm:new Date('2026-10-16T03:00:00Z')}]);
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,status:200,json:async()=>({id:'1354895454379397',display_phone_number:'+55 92 8477-8250',verified_name:'Bfx Comercio'})}));
});
afterEach(()=>vi.unstubAllGlobals());
describe('diagnóstico Meta sem envio',()=>{
 it('valida token salvo por GET no número correto, sem Evolution ou exposição de credenciais',async()=>{
  const res=await GET(); const data=await res.json();
  expect(data).toMatchObject({provider:'meta_cloud',tokenCheck:{ok:true,phoneMatches:true},sendingEnabled:false,reception:{recentCount:1}});
  expect(JSON.stringify(data)).not.toContain('test-secret');
  expect(mocks.evolution).not.toHaveBeenCalled();
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/1354895454379397?'),expect.objectContaining({method:'GET',headers:{Authorization:'Bearer test-secret'}}));
 });
 it('informa falha de autenticação sem retornar mensagem externa ou token',async()=>{
  vi.mocked(fetch).mockResolvedValue({ok:false,status:401,json:async()=>({error:{code:190,message:'test-secret'}})} as Response);
  const data=await (await GET()).json();
  expect(data.tokenCheck).toMatchObject({ok:false,httpStatus:401,errorCode:190});
  expect(JSON.stringify(data)).not.toContain('test-secret');
 });
 it('não consulta a Meta com token ausente',async()=>{
  mocks.config.mockResolvedValue({whatsappProvider:'meta_cloud',metaWhatsappPhoneNumberId:'1354895454379397'});
  const data=await (await GET()).json();
  expect(data.tokenCheck).toMatchObject({ok:false,reason:'TOKEN_OU_NUMERO_AUSENTE'});
  expect(fetch).not.toHaveBeenCalled();
 });
 it('nega acesso antes de ler configuração',async()=>{
  mocks.admin.mockResolvedValue(false); expect((await GET()).status).toBe(401); expect(mocks.config).not.toHaveBeenCalled();
 });
});
