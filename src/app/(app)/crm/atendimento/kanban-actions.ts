'use server';
import {requireAdmin} from '@/lib/guards';
import {prisma} from '@/lib/db';
import {revalidatePath} from 'next/cache';
import {ETAPAS_ATENDIMENTO,ORIGEM_KANBAN} from '@/lib/whatsapp-kanban';

export async function salvarOrganizacaoConversa(input:{telefone:string;etapa:string;responsavelId:number|null;proximaAcao:string;revisao:number}):Promise<{ok:boolean;message:string}>{
 if(!await requireAdmin())return {ok:false,message:'Acesso restrito ao atendimento autorizado.'};
 if(!input||typeof input.telefone!=='string'||!/^\d{10,15}$/.test(input.telefone)||!ETAPAS_ATENDIMENTO.some(e=>e.id===input.etapa)||typeof input.proximaAcao!=='string'||!input.proximaAcao.trim()||input.proximaAcao.trim().length>500||!Number.isSafeInteger(input.revisao)||input.revisao<0||!(input.responsavelId===null||Number.isSafeInteger(input.responsavelId)&&input.responsavelId>0))return {ok:false,message:'Confira a etapa, o responsável e uma próxima ação de até 500 caracteres.'};
 try{
  const responsavel=input.responsavelId===null?null:await prisma.usuario.findUnique({where:{id:input.responsavelId},select:{id:true,username:true,nomeExibicao:true}});
  if(input.responsavelId!==null&&!responsavel)return {ok:false,message:'Responsável não encontrado. Atualize e selecione uma pessoa da equipe.'};
  const resultado=await prisma.$transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'kanban:'+input.telefone}))`;
   const conversa=await tx.whatsAppMensagem.findFirst({where:{telefone:input.telefone,direcao:{in:['in','out']}},select:{id:true}});
   if(!conversa)return {ok:false,message:'Conversa não encontrada. Atualize a página.'};
   const atual=await tx.whatsAppMensagem.findFirst({where:{telefone:input.telefone,direcao:'sistema',origem:ORIGEM_KANBAN},orderBy:[{criadoEm:'desc'},{id:'desc'}],select:{id:true}});
   if((atual?.id??0)!==input.revisao)return {ok:false,message:'Outra pessoa atualizou este cartão. Atualize a página e confira os dados antes de salvar novamente.'};
   await tx.whatsAppMensagem.create({data:{telefone:input.telefone,direcao:'sistema',origem:ORIGEM_KANBAN,status:'controle',corpo:JSON.stringify({versao:1,etapa:input.etapa,responsavelId:responsavel?.id??null,responsavelNome:(responsavel?.nomeExibicao||responsavel?.username||'Não atribuído').slice(0,160),proximaAcao:input.proximaAcao.trim()})},select:{id:true}});
   return {ok:true,message:'Cartão salvo. Etapa, responsável e próxima ação foram atualizados; nenhuma mensagem foi enviada.'};
  });
  if(resultado.ok)revalidatePath('/crm/atendimento');
  return resultado;
 }catch{return {ok:false,message:'Não foi possível confirmar o salvamento. Atualize e confira o cartão antes de repetir.'};}
}
