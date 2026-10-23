import {NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {prisma} from '@/lib/db';
import {marcarAtendimentoHumano} from '@/lib/whatsapp-pre-atendimento';
import {registrarEntrada,avancarStatusPorWaMessageId} from '@/lib/whatsapp-mensagem';
import {eventoEvolution,mensagemNovaEvolution,statusEvolution} from '@/lib/evolution-webhook';
export async function POST(req:Request){
 try{
  const cfg=await prisma.config.findFirst();
  const secret=process.env.EVOLUTION_WEBHOOK_SECRET?.trim()||cfg?.evolutionApiKey?.trim()||process.env.EVOLUTION_API_KEY?.trim();
  if(!secret)return NextResponse.json({error:'Webhook não configurado.'},{status:503});
  const received=req.headers.get('x-evolution-apikey')||req.headers.get('apikey')||'';
  const a=Buffer.from(secret);const b=Buffer.from(received);
  if(a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({error:'Não autorizado.'},{status:401});
  const body=await req.json().catch(()=>null);
  const instance=cfg?.evolutionInstance?.trim()||process.env.EVOLUTION_INSTANCE?.trim()||'bfx';
  if(!body||body.instance!==instance)return NextResponse.json({ok:true});
  const evento=eventoEvolution(body.event);
  const dados=Array.isArray(body.data)?body.data:[body.data];
  for(const data of dados.slice(0,100)){
   if(!data||typeof data!=='object')continue;
   if(evento==='MESSAGES_UPDATE'){
    const status=statusEvolution(data);
    if(status)await avancarStatusPorWaMessageId(status.id,status.status);
   }else if(evento==='MESSAGES_UPSERT'){
    const m=mensagemNovaEvolution(data);if(!m)continue;
    if(m.fromMe){
      // A API também pode emitir source=web. Reconhecer o aceite/eco pendente
      // evita pausar o bot por causa de um documento automático do próprio BFX.
      if(m.humano){
        const whereId={telefone:m.telefone,direcao:'out',provedor:'evolution',waMessageId:m.id};
        let propria=await prisma.whatsAppMensagem.findFirst({where:whereId,select:{id:true}});
        if(!propria){
          const pendente=await prisma.whatsAppMensagem.findFirst({where:{telefone:m.telefone,direcao:'out',provedor:'evolution',status:'pendente',corpo:m.texto,criadoEm:{gte:new Date(Date.now()-30000)}},select:{id:true}});
          if(pendente){
            // Dá tempo para o aceite gravar o ID. Corpo igual, sozinho, não
            // prova eco: sem ID confirmado, tratar como resposta humana.
            await new Promise(resolve=>setTimeout(resolve,250));
            propria=await prisma.whatsAppMensagem.findFirst({where:whereId,select:{id:true}});
          }
        }
        if(!propria)await marcarAtendimentoHumano(m.telefone);
      }
      continue;
    }
    // Não chama bot, não abre janela Meta e não importa histórico.
    await registrarEntrada({telefone:m.telefone,waMessageId:m.id,corpo:m.texto,provedor:'evolution'});
   }
  }
  return NextResponse.json({ok:true});
 }catch{
  console.error('[Webhook Evolution] Falha ao persistir evento');
  return NextResponse.json({error:'Falha temporária ao registrar evento.'},{status:503});
 }
}
