import {prisma} from '@/lib/db';
import {resolverEscopo} from '@/lib/mcp-agente';
import {FILTRO_VENDA_VALIDA} from '@/lib/venda-utils';
import {situacaoParaCliente} from '@/lib/baixa-parcelas';

const normalizar=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const data=(d:Date)=>d.toLocaleDateString('pt-BR',{timeZone:'America/Manaus'});
const moeda=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
/** Consulta interna do mesmo Manager; identidade vem do webhook, nunca do texto.
 * Não usa o MCP administrativo, HTTP autenticado de usuário nem modelo externo. */
export async function consultarRespostaManager(telefone:string,texto:string):Promise<string|null>{
 const t=normalizar(texto);
 const financeiro=/\b(paguei|pago|pagamento|pagamentos|comprovante|boleto|fatura|parcela|parcelas)\b/.test(t)||(/\bsaldo\b/.test(t)&&!/\b(estoque|produto|catalogo)\b/.test(t));
 const compras=/\b(pedido|pedidos|compras|historico|cadastro)\b/.test(t)||/\b(minha|minhas|meu|meus|ultima|ultimas)\s+compra/.test(t);
 if(!financeiro&&!compras)return null;
 try{
  const r=await resolverEscopo(telefone);
  if(!r.ok)return 'Não consegui confirmar seu cadastro com segurança por este número. A equipe BFX precisa conferir o vínculo antes de mostrar compras ou pagamentos. Escreva ATENDENTE para falar com a equipe.';
  const vendas=await prisma.venda.findMany({
   where:{clienteId:r.escopo.clienteId,...FILTRO_VENDA_VALIDA},
   orderBy:[{dataVenda:'desc'},{id:'desc'}],take:5,
   select:{id:true,dataVenda:true,produtoNome:true,itens:{take:3,select:{produtoNome:true}},
    parcelasVencimento:{orderBy:{numeroParcela:'asc'},take:12,select:{numeroParcela:true,valorParcela:true,dataVencimento:true,paga:true,origemPagamento:true,liquidadaEm:true}}},
  });
  const linhas=['Consultei o Manager para o cadastro vinculado a este número (até 5 compras recentes).'];
  if(!vendas.length)linhas.push('Não encontrei compras válidas nesse recorte. Isso não confirma quitação nem ausência de outras obrigações.');
  // Limite de saída explícito: não cortar no meio de um registro ou da ressalva.
  let usados=0;
  for(const v of vendas){
   const produtos=(v.itens.map(i=>i.produtoNome).join(', ')||v.produtoNome||'Produto não informado').replace(/[\r\n]/g,' ').slice(0,110);
   const titulo=`Pedido ${v.id} · ${data(v.dataVenda)} · ${produtos}`;
   if(!financeiro){linhas.push(titulo);continue;}
   const parcelas=v.parcelasVencimento.slice(0,3).map(p=>{
    const situacao=situacaoParaCliente(p,new Date());
    const estado=p.origemPagamento==='prudent'&&situacao==='a_vencer'?'a vencer — antecipação à BFX não quita o desconto do cliente':p.liquidadaEm?'Liquidação registrada no sistema':p.paga?`Baixa registrada (${p.origemPagamento==='manual'?'manual':p.origemPagamento==='asaas'?'Asaas':'origem não informada'})`:'Sem baixa confirmada; conferir com a equipe';
    return `Parcela ${p.numeroParcela}: ${moeda(p.valorParcela)} · vence ${data(p.dataVencimento)} · ${estado}`;
   });
   const bloco=titulo+'\n'+(parcelas.join('\n')||'Sem parcelas registradas nesta compra; não presumir quitação.');
   if(usados+bloco.length>1000){linhas.push('Há mais registros; a equipe pode detalhar.');break;}
   linhas.push(bloco);usados+=bloco.length;
   if(v.parcelasVencimento.length>3)linhas.push('Exibidas apenas as 3 primeiras parcelas dessa compra.');
  }
  linhas.push(financeiro?'Esta consulta não confirma a conciliação do seu comprovante nem altera pagamentos. Se enviou comprovante ou houver divergência, a equipe precisa conferir. Escreva ATENDENTE.':'Compra registrada não confirma envio, entrega ou prazo. A equipe precisa conferir essas informações. Escreva ATENDENTE para detalhar.');
  return linhas.join('\n');
 }catch{
  return 'Não consegui consultar seus registros no Manager agora. A equipe precisa conferir compras e pagamentos; não vou confirmar valores ou quitação sem essa consulta. Escreva ATENDENTE.';
 }
}
