'use server';
import { reservarSaidaEvolution } from '@/lib/whatsapp-anti-spam';
import { requireAdmin } from '@/lib/guards';
import { prisma } from '@/lib/db';
import { marcarEnviada, marcarFalha } from '@/lib/whatsapp-mensagem';
import { JANELA_DEDUPE_MS, MSG_ACESSO_RESTRITO, predicadoCitacao, telefoneValido, travarTelefone, verificarCanalManual } from '@/lib/whatsapp-atendimento-guardas';
import { processarAtendimentoGratuito } from '@/lib/whatsapp-atendimento-gratuito';
import { waIdDaCitada } from '@/lib/whatsapp-citacao';

export async function controlarAutomatico(telefone:string,retomar:boolean):Promise<{ok:boolean;message:string}> {
  if(!await requireAdmin()||!/^\d{10,15}$/.test(telefone))return {ok:false,message:'Acesso ou contato inválido.'};
  await prisma.whatsAppMensagem.create({data:{telefone,direcao:'sistema',origem:retomar?'controle_retomada':'controle_pausa',corpo:retomar?'Automático retomado pela equipe.':'Atendimento assumido pela equipe; automático pausado.',status:'controle'}});
  if(retomar){
    const ultima=await prisma.whatsAppMensagem.findFirst({where:{telefone,direcao:{in:['in','out']},status:{not:'gerando'}},orderBy:{criadoEm:'desc'},select:{direcao:true,tipo:true,corpo:true,criadoEm:true}});
    // Mídia nunca vai ao automático (corte por tipo, não pelo prefixo do corpo).
    if(ultima?.direcao==='in'&&(ultima.tipo??'texto')==='texto'&&Date.now()-ultima.criadoEm.getTime()<30*60_000)await processarAtendimentoGratuito(telefone,ultima.corpo);
  }
  return {ok:true,message:retomar?'Automático retomado. Confira no histórico o resultado da mensagem recente; não há reenvio automático de respostas já registradas.':'Automático pausado nesta conversa até a equipe retomar.'};
}

/** `comPrevia=false`: "enviar sem prévia" (preview_url:false). `respondeA`: id interno da mensagem citada. Sem wa_message_id ela não pode ser citada: envia sem citação. */
export async function responderConversa(telefone:string, texto:string, respondeA?:number, comPrevia:boolean=true):Promise<{ok:boolean;message:string}> {
  if (!await requireAdmin()) return {ok:false,message:MSG_ACESSO_RESTRITO};
  const corpo=texto.trim();
  if (!telefoneValido(telefone)||!corpo||corpo.length>4096) return {ok:false,message:'Confira o contato e escreva uma mensagem de até 4.096 caracteres.'};
  const canal=await verificarCanalManual(telefone,'texto');
  if (!canal.ok) return {ok:false,message:canal.message};
  const {primary}=canal;
  const citadaWaId=Number.isInteger(respondeA)&&(respondeA as number)>0?await waIdDaCitada(telefone,respondeA as number):null;
  if (primary.name==='evolution' && citadaWaId) return {ok:false,message:'Remova a citação para enviar pelo WhatsApp conectado.'};
  // Serializa a reserva por destinatário; uma segunda requisição encontra o
  // registro pendente e não envia novamente, inclusive após resultado incerto.
  const reservaEvolution=primary.name==='evolution'?await reservarSaidaEvolution({telefone,corpo,origem:'manual'}):null;
  if(reservaEvolution&&!reservaEvolution.ok)return {ok:false,message:reservaEvolution.motivo==='aguarde_entre_envios'?'Aguarde alguns segundos antes de enviar outra mensagem.':'Esta mensagem já foi registrada. Confira o histórico antes de repetir.'};
  const registro=reservaEvolution?.ok?{id:reservaEvolution.id}:await prisma.$transaction(async tx=>{
    await travarTelefone(tx,telefone);
    const repetida=await tx.whatsAppMensagem.findFirst({where:{telefone,direcao:'out',status:{not:'falhou'},corpo,...predicadoCitacao(citadaWaId),criadoEm:{gte:new Date(Date.now()-JANELA_DEDUPE_MS)}},select:{id:true}});
    if (repetida) return null;
    return tx.whatsAppMensagem.create({data:{telefone,direcao:'out',origem:'manual',corpo,status:'pendente',provedor:'meta_cloud',...(citadaWaId?{respondeAWaId:citadaWaId}:{})},select:{id:true}});
  });
  if (!registro) return {ok:false,message:'Esta mensagem já foi registrada recentemente. Confira o histórico antes de repetir.'};
  try {
    const result=await primary.sendText(telefone,corpo,primary.name==='evolution'?{previewUrl:false}:citadaWaId||!comPrevia?{...(citadaWaId?{respondeAWaId:citadaWaId}:{}),...(!comPrevia?{previewUrl:false}:{})}:undefined);
    if (!result.ok) {
      if(result.incerto)return {ok:false,message:'Não foi possível confirmar o envio. A mensagem ficou pendente; confira o histórico antes de repetir.'};
      await marcarFalha(registro.id,'Resposta não aceita pelo provedor; confira a conexão e a janela de atendimento.');
      return {ok:false,message:'A mensagem não foi aceita. Confira o histórico e a conexão antes de tentar novamente.'};
    }
    await marcarEnviada(registro.id,result.messageId);
    return {ok:true,message:primary.name==='evolution'?'Mensagem aceita pelo WhatsApp conectado. O aceite não confirma a entrega.':'Mensagem aceita pela Meta. A entrega será atualizada quando houver confirmação.'};
  } catch {
    // Resultado incerto: manter pendente, sem nova tentativa automática.
    return {ok:false,message:'Não foi possível confirmar o resultado. A mensagem ficou pendente; confira o histórico antes de reenviar.'};
  }
}
