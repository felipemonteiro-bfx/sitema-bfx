import {beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({janela:vi.fn(),resolve:vi.fn()}));
vi.mock('@/lib/whatsapp-mensagem',()=>({dentroDaJanela24h:m.janela}));
vi.mock('@/lib/whatsapp-provider',()=>({resolveWhatsAppProviders:m.resolve}));
import {verificarCanalManual} from '@/lib/whatsapp-atendimento-guardas';
const evo={name:'evolution',isConnected:vi.fn().mockResolvedValue(true)};
beforeEach(()=>{vi.stubEnv('WHATSAPP_EVOLUTION_OUTSIDE_WINDOW','1');m.janela.mockResolvedValue(false);m.resolve.mockResolvedValue({primary:{name:'meta_cloud'},fallback:evo});});
it('libera só texto manual quando QR está conectado fora da janela',async()=>{expect(await verificarCanalManual('5592000000000','texto')).toMatchObject({ok:true,primary:evo});});
it('não libera anexos com a mesma permissão de texto',async()=>{expect(await verificarCanalManual('5592000000000')).toMatchObject({ok:false});});
