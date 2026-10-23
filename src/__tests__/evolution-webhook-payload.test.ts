import {expect,it} from 'vitest';
import {mensagemNovaEvolution,statusEvolution,eventoEvolution} from '@/lib/evolution-webhook';
const now=Date.now();const msg={key:{id:'A',remoteJid:'5592000000000@s.whatsapp.net'},messageTimestamp:now/1000,message:{conversation:'oi'}};
it('normaliza os nomes reais dos eventos v2',()=>expect(eventoEvolution('messages.upsert')).toBe('MESSAGES_UPSERT'));
it('aceita texto novo, identifica canal e rejeita grupo ou histórico',()=>{expect(mensagemNovaEvolution(msg,now)).toMatchObject({id:'evolution:A',texto:'oi'});expect(mensagemNovaEvolution({...msg,messageTimestamp:1},now)).toBeNull();expect(mensagemNovaEvolution({...msg,key:{...msg.key,remoteJid:'123@g.us'}},now)).toBeNull();});
it('correlaciona aceite, entrega e leitura sem marcar pendente como entregue',()=>{expect(statusEvolution({keyId:'A',status:'SERVER_ACK'})).toEqual({id:'evolution:A',status:'enviado'});expect(statusEvolution({key:{id:'A'},update:{status:3}})).toEqual({id:'evolution:A',status:'entregue'});expect(statusEvolution({messageId:'A',status:'READ'})).toEqual({id:'evolution:A',status:'lido'});expect(statusEvolution({keyId:'A',status:'PENDING'})).toBeNull();});
