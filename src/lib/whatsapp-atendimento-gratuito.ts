import {disponibilidadeIa,ehMenu,humanoOuSaida,respostasAutoLigadas,vaiParaIa} from '@/lib/whatsapp-respostas-auto';
import { prisma } from '@/lib/db';
import { resolveWhatsAppProviders } from '@/lib/whatsapp-provider';
import { dentroDaJanela24h, marcarEnviada, marcarFalha } from '@/lib/whatsapp-mensagem';
import { variantesLocaisDeTelefone } from '@/lib/telefone-busca';
import { termosDeProduto, respostaEstoque } from '@/lib/whatsapp-estoque';
import { inicioDaPausa } from '@/lib/whatsapp-pausa';
import { consultarRespostaManager } from '@/lib/whatsapp-manager-consultas';
import { corpoPlaceholder, type TipoMidia } from '@/lib/whatsapp-midia-politica';
import { responderComAssistente, type MensagemHistorico } from '@/lib/whatsapp-assistente-ia';

const normalizar=(t:string)=>t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

/** Respostas de orientação, sem dados financeiros, catálogo inventado ou IA externa. */
export function respostaPorRegras(texto:string):string|null {
  if(!texto.trim()||texto.startsWith('[')||humanoOuSaida(texto))return null;
  const t=normalizar(texto);
  if(/\b(paguei|pago|pagamento|comprovante|boleto|fatura|parcela)\b/.test(t))return 'Recebemos sua mensagem sobre pagamento. A equipe BFX vai conferir o comprovante e a baixa no sistema; esta resposta não confirma a quitação. Para falar com a equipe, escreva ATENDENTE.';
  if(/\b(pedido|entrega|garantia|troca|defeito|assistencia)\b/.test(t))return 'Olá! Este é o atendimento automático da BFX. Informe o número do pedido e o que precisa verificar sobre entrega ou pós-venda. A equipe vai conferir a situação; não envie senhas ou dados bancários. Para atendimento humano, escreva ATENDENTE.';
  if(/\b(preco|valor|orcamento|comprar|produto|estoque|iphone|celular)\b/.test(t))return 'Olá! Para preparar seu orçamento BFX, informe o produto, modelo, capacidade e quantidade que procura. A equipe vai conferir preço, estoque e condições antes de confirmar a oferta. Para atendimento humano, escreva ATENDENTE.';
  if(/^(oi|ola|bom dia|boa tarde|boa noite|menu|ajuda|voltar)[!?.\s]*$/.test(t.trim()))return 'Olá! Este é o atendimento automático da BFX. Como podemos ajudar: orçamento, pedido/pós-venda ou pagamento? Escreva o assunto ou ATENDENTE para atendimento humano.';
  return null;
}

/** Teto de respostas automáticas por telefone na última hora; acima disso a IA não é chamada. */
export const LIMITE_RESPOSTAS_IA_POR_HORA=20;

/** Resposta de hoje (sem IA): Manager para pagamento/pedido, estoque para produto, ou a regra/fallback inicial. */
async function respostaDeterministica(telefone:string,texto:string,inicial:string|null,termos:string[]):Promise<string|null> {
  let corpo=inicial;
  const contextoManager=await consultarRespostaManager(telefone,texto);
  if(contextoManager)corpo=contextoManager;
  if(termos.length&&!contextoManager){
    try{
      const produtos=await prisma.produto.findMany({where:{AND:termos.map(termo=>({OR:[{nome:{contains:termo,mode:'insensitive' as const}},{marca:{contains:termo,mode:'insensitive' as const}},{categoria:{contains:termo,mode:'insensitive' as const}}]}))},select:{nome:true,qtdEstoque:true},orderBy:{qtdEstoque:{sort:'desc',nulls:'last'}},take:6});
      corpo=respostaEstoque(produtos);
    }catch{corpo='Não consegui consultar o estoque agora. A equipe precisa conferir o produto antes de confirmar disponibilidade. Escreva ATENDENTE para atendimento humano.';}
  }
  return corpo;
}

/** Últimas mensagens da conversa nas últimas 24h (mais antiga primeiro), só as anteriores à entrada respondida. */
async function historicoRecente(telefone:string,entradaId:number):Promise<MensagemHistorico[]> {
  try{
    const linhas=await prisma.whatsAppMensagem.findMany({where:{telefone,direcao:{in:['in','out']},status:{notIn:['gerando','falhou']},criadoEm:{gte:new Date(Date.now()-86_400_000)},id:{lt:entradaId}},orderBy:{id:'desc'},take:6,select:{direcao:true,corpo:true,tipo:true}});
    // Mídia entra só pelo rótulo do tipo (`[Foto]`): legenda e nome de arquivo são texto do cliente e não vão para o modelo.
    return linhas.reverse().map(l=>({papel:l.direcao==='in'?'user' as const:'assistant' as const,texto:l.tipo==='texto'?l.corpo:corpoPlaceholder(l.tipo as TipoMidia)}));
  }catch{return [];}
}

/** Pausa explícita, takeover do cliente ou resposta/pedido humano recente: o automático deve ficar quieto. */
async function atendimentoHumanoAtivo(telefone:string,takeoverMinutos:number):Promise<boolean> {
  const controle=await prisma.whatsAppMensagem.findFirst({where:{telefone,direcao:'sistema',origem:{in:['controle_pausa','controle_retomada']}},orderBy:{criadoEm:'desc'},select:{origem:true,criadoEm:true}});
  const pausa=inicioDaPausa(new Date(),takeoverMinutos||60,controle);
  if(!pausa)return true;
  const aliases=variantesLocaisDeTelefone(telefone).flatMap(t=>[t,'55'+t]);
  const assumido=await prisma.$queryRaw<{id:number}[]>`
    SELECT id FROM clientes
    WHERE regexp_replace(COALESCE(telefone,''),'[^0-9]','','g') = ANY(${aliases}::text[])
    AND atendimento_humano_at > ${pausa} LIMIT 1
  `;
  if(assumido.length)return true;
  // Resposta humana ou solicitação de atendente suspende o bot, inclusive para visitantes.
  const recentes=await prisma.whatsAppMensagem.findFirst({where:{telefone,criadoEm:{gte:pausa},OR:[{direcao:'out',origem:'manual'},{direcao:'in',tipo:'texto',OR:[{corpo:{contains:'atendente',mode:'insensitive'}},{corpo:{contains:'humano',mode:'insensitive'}},{corpo:{contains:'vendedor',mode:'insensitive'}},{corpo:{contains:'SAIR',mode:'insensitive'}},{corpo:{contains:'parar',mode:'insensitive'}}]}]},select:{id:true}});
  return !!recentes;
}

/**
 * Resposta com o assistente de IA (vale quando `disponibilidadeIa` está ok; o interruptor é único e o gateway externo deve ficar desligado). Chamado só depois de TODAS as guardas.
 * A linha da resposta é reservada (`gerando`) dentro do lock por telefone ANTES do modelo: se já há
 * resposta posterior à última entrada, sai sem gastar IA; assim duas mensagens simultâneas ou uma
 * reentrega nunca geram duas respostas. Falha da IA usa a resposta determinística na mesma linha.
 */
async function atenderComIa(a:{telefone:string;texto:string;nome?:string;inicial:string|null;termos:string[];takeoverMinutos:number;primary:{sendText:(t:string,c:string)=>Promise<{ok:boolean;messageId?:string}>}}):Promise<void> {
  const {telefone}=a;
  const reserva=await prisma.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${telefone}))`;
    // Linha "gerando" de processo que morreu no meio: nunca mais será enviada; sai da conversa.
    await tx.whatsAppMensagem.updateMany({where:{telefone,direcao:'out',status:'gerando',criadoEm:{lt:new Date(Date.now()-120_000)}},data:{status:'falhou',erroMsg:'geração interrompida'}});
    const ultimaEntrada=await tx.whatsAppMensagem.findFirst({where:{telefone,direcao:'in'},orderBy:{id:'desc'},select:{id:true,corpo:true,tipo:true}});
    if(ultimaEntrada){
      const jaRespondida=await tx.whatsAppMensagem.findFirst({where:{telefone,direcao:'out',origem:'pre_atendimento',id:{gt:ultimaEntrada.id}},select:{id:true}});
      if(jaRespondida)return null;
    }
    const naHora=await tx.whatsAppMensagem.count({where:{telefone,direcao:'out',origem:'pre_atendimento',criadoEm:{gte:new Date(Date.now()-3_600_000)}}});
    const linha=await tx.whatsAppMensagem.create({data:{telefone,direcao:'out',origem:'pre_atendimento',corpo:'(gerando resposta)',status:'gerando'},select:{id:true}});
    // Sempre a ÚLTIMA entrada sem resposta: é o texto que a IA recebe e o corte do histórico.
    const usaUltima=!!ultimaEntrada&&ultimaEntrada.tipo==='texto'&&!!ultimaEntrada.corpo.trim();
    return {id:linha.id,podeIa:naHora<LIMITE_RESPOSTAS_IA_POR_HORA,texto:usaUltima?ultimaEntrada.corpo:a.texto,entradaId:ultimaEntrada?.id??Number.MAX_SAFE_INTEGER};
  });
  if(!reserva)return;
  let corpo:string|null=null;
  if(reserva.podeIa){
    const historico=await historicoRecente(telefone,reserva.entradaId);
    const ia=await responderComAssistente({telefone,texto:reserva.texto,nome:a.nome,historico}).catch(()=>null);
    corpo=ia?.texto||null;
  }
  if(!corpo){
    // Fallback determinístico: mesma regra do caminho sem IA (mesmo corpo ao mesmo telefone em 24h não se repete).
    const det=await respostaDeterministica(telefone,reserva.texto,a.inicial,a.termos).catch(()=>null);
    const repetida=det?await prisma.whatsAppMensagem.findFirst({where:{telefone,direcao:'out',origem:'pre_atendimento',corpo:det,id:{not:reserva.id},criadoEm:{gte:new Date(Date.now()-86_400_000)}},select:{id:true}}):null;
    corpo=repetida?null:det;
  }
  if(!corpo){
    await prisma.whatsAppMensagem.delete({where:{id:reserva.id}}).catch(()=>null);
    return;
  }
  // A geração leva até ~20-30 s: um atendente pode ter assumido depois das guardas iniciais.
  if(await atendimentoHumanoAtivo(telefone,a.takeoverMinutos).catch(()=>false)){
    await marcarFalha(reserva.id,'atendente assumiu');
    return;
  }
  await prisma.whatsAppMensagem.update({where:{id:reserva.id},data:{corpo,status:'pendente'}});
  try{
    const result=await a.primary.sendText(telefone,corpo);
    if(result.ok)await marcarEnviada(reserva.id,result.messageId);
    else await marcarFalha(reserva.id,'Atendimento automático não aceito; conferir janela/conexão.');
  }catch{
    // Resultado incerto fica pendente; nunca repetir automaticamente.
  }
}

export async function processarAtendimentoGratuito(telefone:string,texto:string,nome?:string):Promise<void> {
  const cfg=await prisma.config.findFirst();
  if(!cfg||!respostasAutoLigadas(cfg)||cfg.whatsappAutoEnabled!==1||!/^\d{10,15}$/.test(telefone))return;
  let corpo=respostaPorRegras(texto);
  const termos=termosDeProduto(texto);
  if(!corpo&&!termos.length&&texto.trim()&&!texto.startsWith('[')&&!humanoOuSaida(texto))corpo='Não consegui identificar seu pedido. Informe o produto/modelo, escreva PAGAMENTO ou PEDIDO, ou ATENDENTE para falar com a equipe.';
  if((!corpo&&!termos.length)||!await dentroDaJanela24h(telefone))return;
  const {primary}=await resolveWhatsAppProviders();
  if(!primary||primary.name!=='meta_cloud')return;
  const escolha=await prisma.whatsAppMensagem.findFirst({where:{telefone,direcao:'in',OR:[{corpo:{equals:'SAIR',mode:'insensitive'}},{corpo:{equals:'PARAR',mode:'insensitive'}},{corpo:{equals:'VOLTAR',mode:'insensitive'}}]},orderBy:{criadoEm:'desc'},select:{corpo:true}});
  if(escolha&&/^(sair|parar)$/i.test(escolha.corpo?.trim()||''))return;
  if(await atendimentoHumanoAtivo(telefone,cfg.whatsappTakeoverMinutos||60))return;
  // Assistente de IA: mesmo ponto da consulta determinística, depois de todas as guardas. Saudação/menu,
  // mídia, vazio e pedidos de humano/SAIR/PARAR seguem determinísticos.
  if(disponibilidadeIa(cfg,process.env).disponivel&&vaiParaIa(texto)){
    await atenderComIa({telefone,texto,nome,inicial:corpo,termos,takeoverMinutos:cfg.whatsappTakeoverMinutos||60,primary});
    return;
  }
  corpo=await respostaDeterministica(telefone,texto,corpo,termos);
  if(!corpo)return;
  const resposta=corpo;
  const registro=await prisma.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${telefone}))`;
    const repetida=await tx.whatsAppMensagem.findFirst({where:{telefone,direcao:'out',origem:'pre_atendimento',corpo:resposta,criadoEm:{gte:new Date(Date.now()-86_400_000)}},select:{id:true}});
    if(repetida)return null;
    return tx.whatsAppMensagem.create({data:{telefone,direcao:'out',origem:'pre_atendimento',corpo:resposta,status:'pendente'},select:{id:true}});
  });
  if(!registro)return;
  try {
    const menu=ehMenu(texto);
    const result=menu&&primary.sendButtons?await primary.sendButtons(telefone,resposta,[{id:'bfx_orcamento',title:'Ver produtos'},{id:'bfx_pedido',title:'Meu pedido'},{id:'bfx_atendente',title:'Falar com a equipe'}]):await primary.sendText(telefone,resposta);
    if(result.ok)await marcarEnviada(registro.id,result.messageId);
    else await marcarFalha(registro.id,'Atendimento automático não aceito; conferir janela/conexão.');
  }catch{
    // Resultado incerto fica pendente; nunca repetir automaticamente.
  }
}
