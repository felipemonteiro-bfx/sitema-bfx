'use server';
import { requireAdmin } from '@/lib/guards';
import { prisma } from '@/lib/db';
import { dentroDaJanela24h, marcarEnviada, marcarFalha } from '@/lib/whatsapp-mensagem';
import { resolveWhatsAppProviders } from '@/lib/whatsapp-provider';
import { processarAtendimentoGratuito } from '@/lib/whatsapp-atendimento-gratuito';

export async function controlarAutomatico(telefone:string,retomar:boolean):Promise<{ok:boolean;message:string}> {
  if(!await requireAdmin()||!/^\d{10,15}$/.test(telefone))return {ok:false,message:'Acesso ou contato inválido.'};
  await prisma.whatsAppMensagem.create({data:{telefone,direcao:'sistema',origem:retomar?'controle_retomada':'controle_pausa',corpo:retomar?'Automático retomado pela equipe.':'Atendimento assumido pela equipe; automático pausado.',status:'controle'}});
  if(retomar){
    const ultima=await prisma.whatsAppMensagem.findFirst({where:{telefone,direcao:{in:['in','out']}},orderBy:{criadoEm:'desc'},select:{direcao:true,corpo:true,criadoEm:true}});
    if(ultima?.direcao==='in'&&Date.now()-ultima.criadoEm.getTime()<30*60_000)await processarAtendimentoGratuito(telefone,ultima.corpo);
  }
  return {ok:true,message:retomar?'Automático retomado. Confira no histórico o resultado da mensagem recente; não há reenvio automático de respostas já registradas.':'Automático pausado nesta conversa até a equipe retomar.'};
}

export async function responderConversa(telefone:string, texto:string):Promise<{ok:boolean;message:string}> {
  if (!await requireAdmin()) return {ok:false,message:'Acesso restrito ao atendimento autorizado.'};
  const corpo=texto.trim();
  if (!/^\d{10,15}$/.test(telefone)||!corpo||corpo.length>4096) return {ok:false,message:'Confira o contato e escreva uma mensagem de até 4.096 caracteres.'};
  if (!await dentroDaJanela24h(telefone)) return {ok:false,message:'Janela de resposta encerrada. Aguarde uma nova mensagem do cliente. Envio com tarifa permanece bloqueado.'};
  const {primary}=await resolveWhatsAppProviders();
  if (!primary||primary.name!=='meta_cloud') return {ok:false,message:'O envio oficial está indisponível. Confira a conexão nas configurações.'};
  // Serializa a reserva por destinatário; uma segunda requisição encontra o
  // registro pendente e não envia novamente, inclusive após resultado incerto.
  const registro=await prisma.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${telefone}))`;
    const repetida=await tx.whatsAppMensagem.findFirst({where:{telefone,direcao:'out',corpo,criadoEm:{gte:new Date(Date.now()-90_000)}},select:{id:true}});
    if (repetida) return null;
    return tx.whatsAppMensagem.create({data:{telefone,direcao:'out',origem:'manual',corpo,status:'pendente'},select:{id:true}});
  });
  if (!registro) return {ok:false,message:'Esta mensagem já foi registrada recentemente. Confira o histórico antes de repetir.'};
  try {
    const result=await primary.sendText(telefone,corpo);
    if (!result.ok) {
      await marcarFalha(registro.id,'Resposta não aceita pelo provedor; confira a conexão e a janela de atendimento.');
      return {ok:false,message:'A mensagem não foi aceita. Confira o histórico e a conexão antes de tentar novamente.'};
    }
    await marcarEnviada(registro.id,result.messageId);
    return {ok:true,message:'Mensagem aceita pela Meta. A entrega será atualizada quando houver confirmação.'};
  } catch {
    // Resultado incerto: manter pendente, sem nova tentativa automática.
    return {ok:false,message:'Não foi possível confirmar o resultado. A mensagem ficou pendente; confira o histórico antes de reenviar.'};
  }
}
