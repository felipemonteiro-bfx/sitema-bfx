import {beforeEach,expect,it,vi} from 'vitest';
import {EvolutionProvider} from '@/lib/providers/whatsapp-evolution';
const provider=new EvolutionProvider({baseUrl:'http://evo',apiKey:'test',instance:'bfx'});
beforeEach(()=>vi.restoreAllMocks());
it('guarda ID do aceite sem tratar como entrega e respeita prévia desligada',async()=>{const fetchMock=vi.fn().mockResolvedValue({ok:true,json:async()=>({key:{id:'ABC'},status:'PENDING'})});vi.stubGlobal('fetch',fetchMock);const r=await provider.sendText('5592000000000','link',{previewUrl:false});expect(r).toMatchObject({ok:true,messageId:'evolution:ABC'});expect(JSON.parse(fetchMock.mock.calls[0][1].body).linkPreview).toBe(false);});
it('HTTP200 sem ID é incerto e não pode ser repetido automaticamente',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({})}));expect(await provider.sendText('5592000000000','oi')).toMatchObject({ok:false,incerto:true});});
it('timeout é incerto sem vazar dados do erro',async()=>{vi.spyOn(console,'error').mockImplementation(()=>{});vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('segredo-corpo-telefone')));const r=await provider.sendText('5592000000000','oi');expect(r).toMatchObject({ok:false,incerto:true});expect(JSON.stringify(r)).not.toContain('segredo');expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('segredo');});
