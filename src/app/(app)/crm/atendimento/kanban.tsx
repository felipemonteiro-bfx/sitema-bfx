'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowUpRight,ContactRound,MessageSquare,UserRound,ArrowRight,Settings2,RotateCw,GripVertical} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Label} from '@/components/ui/label';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {FormSelect} from '@/components/form-select';
import {ETAPAS_ATENDIMENTO,movimentoKanban,type EtapaAtendimento,type CartaoConversa,type ResponsavelAtendimento} from '@/lib/whatsapp-kanban';
import {salvarOrganizacaoConversa} from './kanban-actions';
import {edicaoPendente,formularioSujo} from './refresh-regras';

/**
 * "Organizar atendimento". `aberto`: formulário sempre aberto (painel de dados do contato, como no artboard);
 * sem `aberto`: recolhível em <details> (cartões do kanban). Nos dois, o wrapper leva `data-kanban-editor` e
 * `data-sujo="true"` enquanto há alteração não salva — é só isso que pausa o refresh de 30s.
 */
export function OrganizarConversa({cartao,pessoas,onAviso,disabled=false,aberto=false}:{cartao:CartaoConversa;pessoas:ResponsavelAtendimento[];onAviso?:(mensagem:string)=>void;disabled?:boolean;aberto?:boolean}){
 // Remonta quando o cartão é salvo/atualizado (revisão nova): os campos voltam a refletir o que está gravado.
 return <OrganizarInterno key={`${cartao.telefone}-${cartao.revisao}`} cartao={cartao} pessoas={pessoas} onAviso={onAviso} disabled={disabled} aberto={aberto}/>;
}

function OrganizarInterno({cartao,pessoas,onAviso,disabled,aberto}:{cartao:CartaoConversa;pessoas:ResponsavelAtendimento[];onAviso?:(mensagem:string)=>void;disabled:boolean;aberto:boolean}){
 const router=useRouter();const detalhes=useRef<HTMLDetailsElement>(null);
 const [busy,setBusy]=useState(false);const [aviso,setAviso]=useState('');const sufixo=cartao.telefone;
 const original={etapa:cartao.estado.etapa as string,responsavel:String(cartao.estado.responsavelId??''),acao:cartao.estado.proximaAcao};
 // Campos controlados: o FormSelect guarda o valor em estado e o "sujo" sai da comparação com o que está salvo.
 const [atual,setAtual]=useState(original);const sujo=formularioSujo(atual,original);
 const opcoesResponsavel=[{value:'',label:'Não atribuído'},...(cartao.estado.responsavelId&&!pessoas.some(p=>p.id===cartao.estado.responsavelId)?[{value:String(cartao.estado.responsavelId),label:`${cartao.estado.responsavelNome} (revisar atribuição)`}]:[]),...pessoas.map(p=>({value:String(p.id),label:p.nome}))];
 const formulario=<form className={aberto?'space-y-3':'mt-3 space-y-3'} onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setAviso('');try{const id=atual.responsavel;const r=await salvarOrganizacaoConversa({telefone:cartao.telefone,etapa:atual.etapa,responsavelId:id?Number(id):null,proximaAcao:atual.acao,revisao:cartao.revisao});setAviso(r.message);onAviso?.(`${cartao.nome}: ${r.message}`);if(r.ok){if(detalhes.current)detalhes.current.open=false;router.refresh();}}catch{setAviso('Não foi possível confirmar o salvamento. Atualize e confira antes de repetir.');onAviso?.('Não foi possível confirmar o salvamento. Atualize e confira antes de repetir.');}finally{setBusy(false);}}}>
   <fieldset disabled={busy||disabled} className="space-y-3">
    <div className="flex flex-col gap-1.5"><Label htmlFor={`etapa-${sufixo}`}>Etapa</Label><FormSelect id={`etapa-${sufixo}`} name="etapa" value={atual.etapa} onValueChange={v=>setAtual(a=>({...a,etapa:v}))} searchable={false} options={ETAPAS_ATENDIMENTO.map(e=>({value:e.id,label:e.nome}))}/></div>
    <div className="flex flex-col gap-1.5"><Label htmlFor={`responsavel-${sufixo}`}>Responsável</Label><FormSelect id={`responsavel-${sufixo}`} name="responsavel" value={atual.responsavel} onValueChange={v=>setAtual(a=>({...a,responsavel:v}))} searchable={false} options={opcoesResponsavel}/></div>
    <div className="flex flex-col gap-1.5 [&_textarea]:min-h-16"><Label htmlFor={`acao-${sufixo}`}>Próxima ação</Label><Textarea id={`acao-${sufixo}`} name="acao" value={atual.acao} onChange={e=>{const v=e.target.value;setAtual(a=>({...a,acao:v}));}} maxLength={500} required/></div>
    <div className={aberto?'grid gap-2':'flex flex-wrap gap-2'}><Button size="sm" type="submit" variant={aberto?'secondary':'default'}>{busy?'Salvando…':'Salvar cartão'}</Button>{(!aberto||sujo)&&<Button size="sm" type="button" variant="ghost" onClick={()=>{setAtual(original);if(detalhes.current)detalhes.current.open=false;setAviso('');}}>Cancelar</Button>}</div>
   </fieldset>
  </form>;
 const nota=aviso&&<p role="status" className="mt-2 text-sm leading-relaxed text-texto-secundario">{aviso}</p>;
 if(aberto)return <div data-kanban-editor data-sujo={sujo?'true':'false'} className="mx-3 mb-3 rounded-interno bg-poco p-3.5"><h3 className="mb-3 text-sm font-semibold">Organizar atendimento</h3>{formulario}{nota}</div>;
 return <div className="mt-3 border-t border-divisoria pt-3"><details ref={detalhes} data-kanban-editor data-sujo={sujo?'true':'false'}><summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold"><Settings2 className="size-4"/>Organizar atendimento</summary>
  {formulario}
 </details>{nota}</div>;
}

export function KanbanConversas({cartoes,pessoas,busca,base='/crm/atendimento'}:{cartoes:CartaoConversa[];pessoas:ResponsavelAtendimento[];busca:string;/** Rota da tela: o quadro também roda na tela própria (janela). */base?:string}){
 const router=useRouter();const [filtro,setFiltro]=useState('todas');const [aviso,setAviso]=useState('');
 const arrastando=useRef<CartaoConversa|null>(null);const gravando=useRef(false);
 const [destino,setDestino]=useState<string|null>(null);const [movendo,setMovendo]=useState(false);
 const [alteracoes,setAlteracoes]=useState<Record<string,{etapa:EtapaAtendimento;revisao:number}>>({});
 const cartoesAtuais=cartoes.map(c=>{const a=alteracoes[c.telefone];return a&&a.revisao>c.revisao?{...c,revisao:a.revisao,classificado:true,estado:{...c.estado,etapa:a.etapa}}:c;});
 async function soltar(etapa:EtapaAtendimento){
  const c=arrastando.current;arrastando.current=null;setDestino(null);
  if(!c||gravando.current||edicaoPendente(document))return;
  const input=movimentoKanban(c,etapa);if(!input)return;
  gravando.current=true;setMovendo(true);setAviso('Salvando movimentação…');
  try{const r=await salvarOrganizacaoConversa(input);setAviso(`${c.nome}: ${r.message}`);if(r.ok&&r.revisao){setAlteracoes(a=>({...a,[c.telefone]:{etapa,revisao:r.revisao!}}));router.refresh();}}
  catch{setAviso('Não foi possível confirmar a movimentação. Atualize antes de tentar novamente.');}
  finally{gravando.current=false;setMovendo(false);}
 }

 useEffect(()=>{const timer=setInterval(()=>{if(!arrastando.current&&!gravando.current&&!edicaoPendente(document))router.refresh();},30000);return()=>clearInterval(timer);},[router]);
 const abrir=base!=='/crm/atendimento'?{target:'_blank',rel:'noopener'}:{};
 const link=(telefone:string)=>base+'?'+new URLSearchParams({visao:'lista',telefone,...(busca?{q:busca}:{})}).toString();
 return <section aria-label="Kanban de conversas" className="space-y-4">
  <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-prose text-sm leading-relaxed text-muted-foreground">Organize o próximo passo de cada atendimento. Arraste os cartões entre as colunas ou use Organizar atendimento. Mover não envia mensagens nem muda o automático.</p><Button variant="outline" size="sm" disabled={movendo} onClick={()=>{if(!arrastando.current&&!gravando.current&&!edicaoPendente(document))router.refresh();}}><RotateCw className="size-4" aria-hidden="true"/>Atualizar quadro</Button></div>
  {aviso&&<p role="status" className="rounded-controle border border-divisoria bg-controle p-3 text-sm font-medium leading-relaxed">{aviso}</p>}
  <div className="flex max-w-sm flex-col gap-1.5"><Label htmlFor="kanban-filtro-etapa">Mostrar etapa</Label><Select value={filtro} onValueChange={setFiltro}><SelectTrigger id="kanban-filtro-etapa"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="todas">Todas as etapas</SelectItem>{ETAPAS_ATENDIMENTO.map(e=><SelectItem key={e.id} value={e.id}>{e.nome} ({cartoesAtuais.filter(c=>c.estado.etapa===e.id).length})</SelectItem>)}</SelectContent></Select></div>
  <div className={filtro==='todas'?'flex items-start gap-4 overflow-x-auto pb-4':'grid max-w-2xl gap-4'}>{ETAPAS_ATENDIMENTO.filter(e=>filtro==='todas'||e.id===filtro).map(etapa=>{
   const cards=cartoesAtuais.filter(c=>c.estado.etapa===etapa.id);
   return <section key={etapa.id} aria-label={etapa.nome} onDragOver={e=>{if(arrastando.current&&!gravando.current){e.preventDefault();e.dataTransfer.dropEffect='move';setDestino(etapa.id);}}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setDestino(null);}} onDrop={e=>{if(arrastando.current){e.preventDefault();void soltar(etapa.id);}}} className={`min-h-56 min-w-0 rounded-painel border border-painel-borda bg-card p-3 ${filtro==='todas'?'max-h-176 w-80 shrink-0 overflow-y-auto':''} ${destino===etapa.id?'ring-2 ring-primary':''}`}><h2 className="mb-3 flex min-h-11 items-center justify-between gap-2 border-b border-divisoria pb-3 text-base font-semibold"><span>{etapa.nome}</span><span className="rounded-full bg-controle px-2.5 py-1 font-mono text-xs tabular-nums">{cards.length}</span></h2>
    <div className="space-y-3">{cards.map(c=><article key={c.telefone} draggable={!movendo} onDragStart={e=>{if(gravando.current||edicaoPendente(document)||(e.target instanceof Element&&e.target.closest('a,input,textarea,select,button,summary'))){e.preventDefault();return;}arrastando.current=c;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',c.telefone);}} onDragEnd={()=>{arrastando.current=null;setDestino(null);}} aria-label={`Conversa ${c.nome}`} className="min-w-0 rounded-interno border border-divisoria bg-card-elevated p-4">
     <p className="mb-3 flex cursor-grab items-center gap-1 text-xs text-muted-foreground"><GripVertical className="size-4" aria-hidden="true"/>Arraste para mover</p>
     <Link href={link(c.telefone)} className="group -mx-4 block bg-marca-tint px-4 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="flex items-start justify-between gap-2"><h3 className="break-words text-lg font-semibold leading-snug text-marca-tint-texto group-hover:underline">{c.nome}</h3><ArrowUpRight className="size-4 shrink-0 text-muted-foreground"/></div><p className="mt-3 break-all font-mono text-sm">+{c.telefone}</p><p className="mt-1 text-xs text-muted-foreground">Última mensagem: {c.ultimaMensagem}</p></Link>
     {!c.classificado&&<p className="mt-3 rounded-controle bg-controle px-2 py-1 text-xs font-medium">Sem classificação da equipe</p>}
     <dl className="mt-4 space-y-3 text-sm"><div><dt className="flex items-center gap-1 text-xs text-muted-foreground"><UserRound className="size-3"/>Responsável</dt><dd className="mt-1 break-words font-medium">{c.estado.responsavelNome}</dd></div><div><dt className="flex items-center gap-1 text-xs text-muted-foreground"><ArrowRight className="size-3"/>Próxima ação</dt><dd className="mt-1 whitespace-pre-wrap break-words leading-relaxed">{c.estado.proximaAcao}</dd></div></dl>
     <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm"><Link href={link(c.telefone)} className="inline-flex min-h-11 items-center gap-1 font-medium text-primary underline underline-offset-4"><MessageSquare className="size-4"/>Conversa</Link><Link href={`/crm/atendimento/ficha?telefone=${c.telefone}`} {...abrir} className="inline-flex min-h-11 items-center gap-1 font-medium text-primary underline underline-offset-4"><ContactRound className="size-4"/>Ficha</Link></div>
     <OrganizarConversa cartao={c} pessoas={pessoas} onAviso={setAviso} disabled={movendo}/>
    </article>)}{!cards.length&&<p className="py-8 text-center text-sm text-muted-foreground">Nenhuma conversa nesta etapa.</p>}</div>
   </section>;
  })}</div>
 </section>;
}
