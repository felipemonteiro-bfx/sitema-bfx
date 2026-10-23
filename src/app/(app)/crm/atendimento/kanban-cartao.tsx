'use client';
import Link from 'next/link';
import {ArrowRight,ContactRound,MessageSquare,UserRound} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {SheetDescription,SheetHeader,SheetTitle} from '@/components/ui/sheet';
import {ETAPAS_ATENDIMENTO,formatarTelefoneBr,type EstadoKanban,type CartaoConversa,type ResponsavelAtendimento} from '@/lib/whatsapp-kanban';
import {OrganizarConversa} from './organizar-conversa';

/** Iniciais para o avatar: até duas palavras com letra, ignorando partículas curtas ("da", "de") e símbolos. */
export function iniciais(nome:string):string{
 const palavras=nome.split(/\s+/).map(p=>p.split('').filter(ch=>ch.toLowerCase()!==ch.toUpperCase()).join('')).filter(p=>p.length>0);
 const uteis=palavras.filter(p=>p.length>2);
 const usadas=(uteis.length?uteis:palavras).slice(0,2);
 return usadas.map(p=>p.charAt(0).toUpperCase()).join('');
}

/** "16/10/2026, 10:00" vira "10:00" se for hoje (Manaus) e "16/10" nos outros dias; texto fora do padrão passa como está. */
export function rotuloHora(texto:string,agora:Date=new Date()):string{
 const [data,hora]=texto.split(', ');
 if(!data||!/^\d{2}\/\d{2}\/\d{4}$/.test(data)||!hora)return texto;
 const hoje=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Manaus',day:'2-digit',month:'2-digit',year:'numeric'}).format(agora);
 return data===hoje?hora:data.slice(0,5);
}

/** "16/10/2026, 09:00" vira "16/10, 09:00" (sem o ano); texto fora do padrão passa como está. */
export function rotuloDataCurta(texto:string):string{
 const [data,hora]=texto.split(', ');
 if(!data||!/^\d{2}\/\d{2}\/\d{4}$/.test(data)||!hora)return texto;
 return `${data.slice(0,5)}, ${hora}`;
}

/** Cartão compacto do quadro: o <article> é o item arrastável; o botão ocupa o cartão e abre os detalhes. */
export function CartaoKanban({cartao,movendo,arrastando,ativo=false,onAbrir,onDragStart,onDragEnd}:{cartao:CartaoConversa;movendo:boolean;arrastando:boolean;ativo?:boolean;onAbrir:(telefone:string)=>void;onDragStart:(e:React.DragEvent<HTMLElement>)=>void;onDragEnd:(e:React.DragEvent<HTMLElement>)=>void}){
 const atribuido=cartao.estado.responsavelId!==null;const acao=cartao.estado.proximaAcao.trim();
 return <article draggable={!movendo} onDragStart={onDragStart} onDragEnd={onDragEnd} aria-label={`Conversa ${cartao.nome}`} className={`min-w-0 cursor-grab ${arrastando?'opacity-50':''}`}>
  <Button data-abrir-cartao data-ativo={ativo?"true":"false"} aria-expanded={ativo} type="button" variant="cartao" size="cartao" onClick={()=>onAbrir(cartao.telefone)}>
   <span className="block w-full truncate text-sm font-semibold">{cartao.nome}</span>
   {cartao.classificado&&acao&&<span className="flex w-full items-start gap-1.5 text-xs leading-snug text-texto-secundario"><ArrowRight className="mt-0.5 size-3 shrink-0" aria-hidden="true"/><span className="min-w-0 flex-1 truncate">{acao}</span></span>}
   <span className="flex min-h-6 w-full items-center gap-1.5">
    {!cartao.classificado&&<Badge variant="warning" size="sm" className="shrink-0 whitespace-nowrap">Sem classificação</Badge>}
    <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">{rotuloHora(cartao.ultimaMensagem)}</span>
    {atribuido
     ?<span role="img" aria-label={`Responsável: ${cartao.estado.responsavelNome}`} className="flex size-6 shrink-0 items-center justify-center rounded-full bg-marca-tint text-xs font-semibold text-marca-tint-texto">{iniciais(cartao.estado.responsavelNome)}</span>
     :<span role="img" aria-label="Sem responsável" className="flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-divisoria text-muted-foreground"><UserRound className="size-3.5" aria-hidden="true"/></span>}
   </span>
  </Button>
 </article>;
}

/** Conteúdo do Sheet de um cartão: identificação, atalhos para conversa/ficha e o editor de organização. */
export function DetalhesCartao({cartao,pessoas,base,busca,onAviso,onSalvo,avisoFechar,disabled}:{cartao:CartaoConversa;pessoas:ResponsavelAtendimento[];base:string;busca:string;onAviso?:(mensagem:string)=>void;onSalvo?:(telefone:string,estado:EstadoKanban,revisao:number)=>void;/** Aviso inline quando o Sheet tentou fechar com edição não salva. */avisoFechar?:string;disabled?:boolean}){
 const etapa=ETAPAS_ATENDIMENTO.find(e=>e.id===cartao.estado.etapa)?.nome??cartao.estado.etapa;
 const conversa=base+'?'+new URLSearchParams({visao:'lista',telefone:cartao.telefone,...(busca?{q:busca}:{})}).toString();
 const nova=base!=='/crm/atendimento'?{target:'_blank',rel:'noopener'}:{};
 return <div className="flex flex-col gap-4">
  <SheetHeader className="gap-1 space-y-0 border-b border-divisoria pb-3 pr-10">
   <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><span aria-hidden="true" className={`size-2 rounded-full ${cartao.classificado?'bg-primary':'bg-warning'}`}/>{etapa}{!cartao.classificado&&' · Sem classificação'}</p>
   <SheetTitle className="font-display text-lg leading-tight">{cartao.nome}</SheetTitle>
   <SheetDescription className="sr-only">Detalhes da conversa e organização do atendimento.</SheetDescription>
   <p className="font-mono text-sm text-texto-secundario">{formatarTelefoneBr(cartao.telefone)}</p>
  </SheetHeader>
  <div className="grid grid-cols-2 gap-2">
   <Button asChild className="w-full"><Link href={conversa}><MessageSquare aria-hidden="true"/>Abrir conversa</Link></Button>
   <Button asChild variant="outline" className="w-full"><Link href={`/crm/atendimento/ficha?telefone=${cartao.telefone}`} {...nova}><ContactRound aria-hidden="true"/>Ficha do cliente</Link></Button>
  </div>
  {cartao.ultimoTexto&&<div className="flex flex-col gap-1.5">
   <p className="text-xs text-muted-foreground">Última mensagem · {rotuloDataCurta(cartao.ultimaMensagem)}</p>
   <p className="break-words rounded-controle bg-popover px-3 py-2 text-sm leading-snug">{cartao.ultimoTexto}</p>
  </div>}
  {avisoFechar&&<p role="alert" className="rounded-controle border border-divisoria bg-controle px-3 py-2 text-sm font-medium">{avisoFechar}</p>}
  <OrganizarConversa cartao={cartao} pessoas={pessoas} onAviso={onAviso} onSalvo={onSalvo} disabled={disabled} aberto classe="rounded-controle"/>
 </div>;
}
