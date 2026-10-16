'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowUpRight,ContactRound,MessageSquare,UserRound,ArrowRight,Settings2,RotateCw} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {ETAPAS_ATENDIMENTO,type CartaoConversa,type ResponsavelAtendimento} from '@/lib/whatsapp-kanban';
import {salvarOrganizacaoConversa} from './kanban-actions';

export function OrganizarConversa({cartao,pessoas,onAviso}:{cartao:CartaoConversa;pessoas:ResponsavelAtendimento[];onAviso?:(mensagem:string)=>void}){
 const router=useRouter();const detalhes=useRef<HTMLDetailsElement>(null);
 const [busy,setBusy]=useState(false);const [aviso,setAviso]=useState('');
 return <div className="mt-3 border-t pt-3"><details ref={detalhes} data-kanban-editor><summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium"><Settings2 className="size-4"/>Organizar atendimento</summary>
  <form key={cartao.revisao} className="mt-3 space-y-3" onSubmit={async e=>{e.preventDefault();if(busy)return;const f=new FormData(e.currentTarget);setBusy(true);setAviso('');try{const id=String(f.get('responsavel')||'');const r=await salvarOrganizacaoConversa({telefone:cartao.telefone,etapa:String(f.get('etapa')),responsavelId:id?Number(id):null,proximaAcao:String(f.get('acao')||''),revisao:cartao.revisao});setAviso(r.message);onAviso?.(`${cartao.nome}: ${r.message}`);if(r.ok){if(detalhes.current)detalhes.current.open=false;router.refresh();}}catch{setAviso('Não foi possível confirmar o salvamento. Atualize e confira antes de repetir.');onAviso?.('Não foi possível confirmar o salvamento. Atualize e confira antes de repetir.');}finally{setBusy(false);}}}>
   <fieldset disabled={busy} className="space-y-3">
    <label className="block text-sm font-medium">Etapa<select name="etapa" defaultValue={cartao.estado.etapa} className="mt-1 min-h-11 w-full rounded-md border bg-background p-2 text-foreground">{ETAPAS_ATENDIMENTO.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}</select></label>
    <label className="block text-sm font-medium">Responsável<select name="responsavel" defaultValue={cartao.estado.responsavelId??''} className="mt-1 min-h-11 w-full rounded-md border bg-background p-2 text-foreground"><option value="">Não atribuído</option>{cartao.estado.responsavelId&&!pessoas.some(p=>p.id===cartao.estado.responsavelId)&&<option value={cartao.estado.responsavelId}>{cartao.estado.responsavelNome} (revisar atribuição)</option>}{pessoas.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>
    <label className="block text-sm font-medium">Próxima ação<Textarea className="mt-1 min-h-24" name="acao" defaultValue={cartao.estado.proximaAcao} maxLength={500} required/></label>
    <div className="flex flex-wrap gap-2"><Button size="sm" type="submit">{busy?'Salvando…':'Salvar cartão'}</Button><Button size="sm" type="button" variant="ghost" onClick={e=>{e.currentTarget.form?.reset();if(detalhes.current)detalhes.current.open=false;setAviso('');}}>Cancelar</Button></div>
   </fieldset>
  </form>
 </details>{aviso&&<p role="status" className="mt-2 text-sm leading-relaxed">{aviso}</p>}</div>;
}

export function KanbanConversas({cartoes,pessoas,busca}:{cartoes:CartaoConversa[];pessoas:ResponsavelAtendimento[];busca:string}){
 const router=useRouter();const [filtro,setFiltro]=useState('todas');const [aviso,setAviso]=useState('');
 useEffect(()=>{const timer=setInterval(()=>{if(!document.querySelector('[data-kanban-editor][open]'))router.refresh();},30000);return()=>clearInterval(timer);},[router]);
 const link=(telefone:string)=>'/crm/atendimento?'+new URLSearchParams({visao:'lista',telefone,...(busca?{q:busca}:{})}).toString();
 return <section aria-label="Kanban de conversas" className="space-y-4">
  <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-prose text-sm leading-relaxed text-muted-foreground">Organize o próximo passo de cada atendimento. Alterar o cartão não envia mensagens nem muda o automático.</p><Button variant="outline" size="sm" onClick={()=>{if(!document.querySelector('[data-kanban-editor][open]'))router.refresh();}}><RotateCw className="mr-2 size-4"/>Atualizar quadro</Button></div>
  {aviso&&<p role="status" className="rounded-lg border bg-muted p-3 text-sm font-medium leading-relaxed">{aviso}</p>}
  <label className="block max-w-sm text-sm font-medium">Mostrar etapa<select value={filtro} onChange={e=>setFiltro(e.target.value)} className="mt-1 min-h-11 w-full rounded-md border bg-background p-2 text-foreground"><option value="todas">Todas as etapas</option>{ETAPAS_ATENDIMENTO.map(e=><option key={e.id} value={e.id}>{e.nome} ({cartoes.filter(c=>c.estado.etapa===e.id).length})</option>)}</select></label>
  <div className={filtro==='todas'?'grid gap-4 md:grid-cols-2 xl:grid-cols-5':'grid max-w-2xl gap-4'}>{ETAPAS_ATENDIMENTO.filter(e=>filtro==='todas'||e.id===filtro).map(etapa=>{
   const cards=cartoes.filter(c=>c.estado.etapa===etapa.id);
   return <section key={etapa.id} aria-label={etapa.nome} className="min-w-0 rounded-xl border bg-muted/30 p-3"><h2 className="mb-4 flex min-h-11 items-center justify-between gap-2 border-b pb-3 text-sm font-semibold"><span>{etapa.nome}</span><span className="rounded-full bg-background px-2 py-1 text-xs tabular-nums">{cards.length}</span></h2>
    <div className="space-y-3">{cards.map(c=><article key={c.telefone} className="min-w-0 rounded-lg border bg-background p-4 shadow-sm">
     <Link href={link(c.telefone)} className="group block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="flex items-start justify-between gap-2"><h3 className="break-words text-base font-semibold leading-snug group-hover:underline">{c.nome}</h3><ArrowUpRight className="size-4 shrink-0 text-muted-foreground"/></div><p className="mt-2 break-all text-xs text-muted-foreground">+{c.telefone}</p><p className="mt-1 text-xs text-muted-foreground">Última mensagem: {c.ultimaMensagem}</p></Link>
     {!c.classificado&&<p className="mt-3 rounded-md bg-muted px-2 py-1 text-xs font-medium">Sem classificação da equipe</p>}
     <dl className="mt-4 space-y-3 text-sm"><div><dt className="flex items-center gap-1 text-xs text-muted-foreground"><UserRound className="size-3"/>Responsável</dt><dd className="mt-1 break-words font-medium">{c.estado.responsavelNome}</dd></div><div><dt className="flex items-center gap-1 text-xs text-muted-foreground"><ArrowRight className="size-3"/>Próxima ação</dt><dd className="mt-1 whitespace-pre-wrap break-words leading-relaxed">{c.estado.proximaAcao}</dd></div></dl>
     <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm"><Link href={link(c.telefone)} className="inline-flex min-h-11 items-center gap-1 font-medium underline underline-offset-4"><MessageSquare className="size-4"/>Conversa</Link><Link href={`/crm/atendimento/ficha?telefone=${c.telefone}`} className="inline-flex min-h-11 items-center gap-1 font-medium underline underline-offset-4"><ContactRound className="size-4"/>Ficha</Link></div>
     <OrganizarConversa cartao={c} pessoas={pessoas} onAviso={setAviso}/>
    </article>)}{!cards.length&&<p className="py-8 text-center text-sm text-muted-foreground">Nenhuma conversa nesta etapa.</p>}</div>
   </section>;
  })}</div>
 </section>;
}
