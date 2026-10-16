import { prisma } from '@/lib/db';
import { resolveWhatsAppProviders } from '@/lib/whatsapp-provider';
import { dentroDaJanela24h, marcarEnviada, marcarFalha } from '@/lib/whatsapp-mensagem';
import { variantesLocaisDeTelefone } from '@/lib/telefone-busca';
import { termosDeProduto, respostaEstoque } from '@/lib/whatsapp-estoque';
import { inicioDaPausa } from '@/lib/whatsapp-pausa';
import { consultarRespostaManager } from '@/lib/whatsapp-manager-consultas';

const normalizar=(t:string)=>t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const humanoOuSaida=(t:string)=>/\b(humano|atendente|vendedor|parar|sair|cancelar mensagens)\b/.test(normalizar(t));

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

export async function processarAtendimentoGratuito(telefone:string,texto:string):Promise<void> {
  const cfg=await prisma.config.findFirst();
  if(cfg?.whatsappPreAtendimento!==2||cfg.whatsappAutoEnabled!==1||!/^\d{10,15}$/.test(telefone))return;
  let corpo=respostaPorRegras(texto);
  const termos=termosDeProduto(texto);
  if(!corpo&&!termos.length&&texto.trim()&&!texto.startsWith('[')&&!humanoOuSaida(texto))corpo='Não consegui identificar seu pedido. Informe o produto/modelo, escreva PAGAMENTO ou PEDIDO, ou ATENDENTE para falar com a equipe.';
  if((!corpo&&!termos.length)||!await dentroDaJanela24h(telefone))return;
  const {primary}=await resolveWhatsAppProviders();
  if(!primary||primary.name!=='meta_cloud')return;
  const escolha=await prisma.whatsAppMensagem.findFirst({where:{telefone,direcao:'in',OR:[{corpo:{equals:'SAIR',mode:'insensitive'}},{corpo:{equals:'PARAR',mode:'insensitive'}},{corpo:{equals:'VOLTAR',mode:'insensitive'}}]},orderBy:{criadoEm:'desc'},select:{corpo:true}});
  if(escolha&&/^(sair|parar)$/i.test(escolha.corpo?.trim()||''))return;
  const controle=await prisma.whatsAppMensagem.findFirst({where:{telefone,direcao:'sistema',origem:{in:['controle_pausa','controle_retomada']}},orderBy:{criadoEm:'desc'},select:{origem:true,criadoEm:true}});
  const pausa=inicioDaPausa(new Date(),cfg.whatsappTakeoverMinutos||60,controle);
  if(!pausa)return;
  const aliases=variantesLocaisDeTelefone(telefone).flatMap(t=>[t,'55'+t]);
  const assumido=await prisma.$queryRaw<{id:number}[]>`
    SELECT id FROM clientes
    WHERE regexp_replace(COALESCE(telefone,''),'[^0-9]','','g') = ANY(${aliases}::text[])
    AND atendimento_humano_at > ${pausa} LIMIT 1
  `;
  if(assumido.length)return;
  // Resposta humana ou solicitação de atendente suspende o bot, inclusive para visitantes.
  const recentes=await prisma.whatsAppMensagem.findFirst({where:{telefone,criadoEm:{gte:pausa},OR:[{direcao:'out',origem:'manual'},{direcao:'in',OR:[{corpo:{contains:'atendente',mode:'insensitive'}},{corpo:{contains:'humano',mode:'insensitive'}},{corpo:{contains:'vendedor',mode:'insensitive'}},{corpo:{contains:'SAIR',mode:'insensitive'}},{corpo:{contains:'parar',mode:'insensitive'}}]}]},select:{id:true}});
  if(recentes)return;
  const contextoManager=await consultarRespostaManager(telefone,texto);
  if(contextoManager)corpo=contextoManager;
  if(termos.length&&!contextoManager){
    try{
      const produtos=await prisma.produto.findMany({where:{AND:termos.map(termo=>({OR:[{nome:{contains:termo,mode:'insensitive' as const}},{marca:{contains:termo,mode:'insensitive' as const}},{categoria:{contains:termo,mode:'insensitive' as const}}]}))},select:{nome:true,qtdEstoque:true},orderBy:{qtdEstoque:{sort:'desc',nulls:'last'}},take:6});
      corpo=respostaEstoque(produtos);
    }catch{corpo='Não consegui consultar o estoque agora. A equipe precisa conferir o produto antes de confirmar disponibilidade. Escreva ATENDENTE para atendimento humano.';}
  }
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
    const menu=/^(oi|ola|bom dia|boa tarde|boa noite|menu|ajuda|voltar)[!?.\s]*$/.test(normalizar(texto).trim());
    const result=menu&&primary.sendButtons?await primary.sendButtons(telefone,resposta,[{id:'bfx_orcamento',title:'Ver produtos'},{id:'bfx_pedido',title:'Meu pedido'},{id:'bfx_atendente',title:'Falar com a equipe'}]):await primary.sendText(telefone,resposta);
    if(result.ok)await marcarEnviada(registro.id,result.messageId);
    else await marcarFalha(registro.id,'Atendimento automático não aceito; conferir janela/conexão.');
  }catch{
    // Resultado incerto fica pendente; nunca repetir automaticamente.
  }
}
