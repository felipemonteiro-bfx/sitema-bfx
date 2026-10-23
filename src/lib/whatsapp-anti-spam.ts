import { prisma } from '@/lib/db';
import type { OrigemMensagem } from '@/lib/whatsapp-mensagem';

type Reserva = {ok:true;id:number} | {ok:false;motivo:string;id?:number};
/** Reserva persistida antes do HTTP; resultado incerto nunca libera uma segunda tentativa. */
export async function reservarSaidaEvolution(input:{telefone:string;clienteId?:number|null;origem:OrigemMensagem;corpo:string}):Promise<Reserva> {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.telefone}))`;
    const manual=input.origem==='manual';
    const desde=new Date(Date.now()-(manual?90_000:86_400_000));
    const repetida=await tx.whatsAppMensagem.findFirst({where:{telefone:input.telefone,direcao:'out',origem:input.origem,corpo:input.corpo,OR:[{provedor:'evolution'},{status:{not:'falhou'}}],criadoEm:{gte:desde}},select:{id:true}});
    if(repetida)return {ok:false,motivo:'mensagem_duplicada',id:repetida.id};
    if(manual){
      const recente=await tx.whatsAppMensagem.findFirst({where:{telefone:input.telefone,direcao:'out',provedor:'evolution',criadoEm:{gte:new Date(Date.now()-2000)}},select:{id:true}});
      if(recente)return {ok:false,motivo:'aguarde_entre_envios'};
    }else{
      const escolha=await tx.whatsAppMensagem.findFirst({where:{telefone:input.telefone,direcao:'in',OR:[{corpo:{equals:'SAIR',mode:'insensitive'}},{corpo:{equals:'PARAR',mode:'insensitive'}},{corpo:{equals:'VOLTAR',mode:'insensitive'}}]},orderBy:{criadoEm:'desc'},select:{corpo:true}});
      if(escolha&&/^(sair|parar)$/i.test(escolha.corpo.trim()))return {ok:false,motivo:'cliente_pediu_parar'};
      const total=await tx.whatsAppMensagem.count({where:{telefone:input.telefone,direcao:'out',provedor:'evolution',origem:{not:'manual'},criadoEm:{gte:new Date(Date.now()-86_400_000)}}});
      if(total>=3)return {ok:false,motivo:'limite_por_contato'};
    }
    const r=await tx.whatsAppMensagem.create({data:{telefone:input.telefone,clienteId:input.clienteId??null,direcao:'out',origem:input.origem,corpo:input.corpo,status:'pendente',provedor:'evolution'},select:{id:true}});
    return {ok:true,id:r.id};
  });
}
