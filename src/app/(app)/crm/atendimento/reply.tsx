'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, UserRound, Bot, RotateCw, CircleHelp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { responderConversa, controlarAutomatico } from './actions';
import { PRONTAS, acaoDaTecla, filtrarProntas, termoDeBarra, type Pronta } from './composer-regras';

/** Contador de caracteres só aparece perto do limite de 4096. */
const LIMITE_AVISO = 3500;

/** Lista de respostas prontas (botão de raio e "/"). Escolher SÓ preenche o campo; nunca envia. */
function ListaProntas({ itens, indice, onEscolher }: { itens: readonly Pronta[]; indice: number; onEscolher: (p: Pronta) => void }) {
  if (!itens.length) return <p className="px-3 py-2 text-sm text-muted-foreground">Nenhuma resposta pronta com esse termo.</p>;
  return <ul role="listbox" aria-label="Respostas prontas" className="flex max-h-64 flex-col overflow-y-auto">
    {itens.map((p, i) => <li key={p.titulo} role="option" aria-selected={i === indice}>
      <Button type="button" variant="ghost" onClick={() => onEscolher(p)} className={`h-auto w-full flex-col items-start gap-0.5 rounded-controle px-3 py-2 text-left font-normal ${i === indice ? 'bg-controle' : ''}`}>
        <span className="text-sm font-semibold">{p.titulo}</span>
        <span className="line-clamp-2 whitespace-normal text-xs text-texto-secundario">{p.texto}</span>
      </Button>
    </li>)}
  </ul>;
}

export function Reply({telefone,aberta,estadoAutomatico}:{telefone:string;aberta:boolean;estadoAutomatico:string}) {
 const router=useRouter();const [texto,setTexto]=useState('');const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');const sending=useRef(false);const campo=useRef<HTMLTextAreaElement>(null);
 const [menu,setMenu]=useState(false);const [buscaMenu,setBuscaMenu]=useState('');const [indice,setIndice]=useState(0);const [barraFechada,setBarraFechada]=useState(false);
 useEffect(()=>{const timer=setInterval(()=>{if(!sending.current&&!document.querySelector('[data-kanban-editor][open]'))router.refresh();},30000);return()=>clearInterval(timer);},[router]);
 async function controle(retomar:boolean){if(sending.current)return;sending.current=true;setBusy(true);try{const r=await controlarAutomatico(telefone,retomar);setNotice(r.message);router.refresh();}catch{setNotice('Não foi possível confirmar a mudança. Atualize antes de repetir.');}finally{sending.current=false;setBusy(false);}}
 // Envio único (botão e Enter): mesmas guardas de sempre — janela aberta, texto não vazio e anti-duplo-envio.
 async function enviar(){if(sending.current||!aberta||busy||!texto.trim())return;sending.current=true;setBusy(true);try{const result=await responderConversa(telefone,texto);setNotice(result.message);if(result.ok)setTexto('');router.refresh();}catch{setNotice('Não foi possível confirmar o envio. Confira o histórico antes de repetir.');}finally{sending.current=false;setBusy(false);}}
 // "/" no início do campo abre a lista e filtra pelo que vem depois dela.
 const termo=termoDeBarra(texto);
 const filtradasBarra=termo===null?[]:filtrarProntas(PRONTAS,termo);
 const barraAberta=termo!==null&&!barraFechada&&!menu&&filtradasBarra.length>0&&aberta;
 const filtradasMenu=filtrarProntas(PRONTAS,buscaMenu);
 function escolher(p:Pronta){setTexto(p.texto);setMenu(false);setBuscaMenu('');setIndice(0);setBarraFechada(false);campo.current?.focus();}
 function aoDigitar(v:string){setTexto(v);setIndice(0);setBarraFechada(false);}
 function aoTeclar(e:React.KeyboardEvent<HTMLTextAreaElement>){
  if(barraAberta){
   if(e.key==='ArrowDown'){e.preventDefault();setIndice(i=>(i+1)%filtradasBarra.length);return;}
   if(e.key==='ArrowUp'){e.preventDefault();setIndice(i=>(i-1+filtradasBarra.length)%filtradasBarra.length);return;}
   if(e.key==='Escape'){e.preventDefault();setBarraFechada(true);return;}
   if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();escolher(filtradasBarra[Math.min(indice,filtradasBarra.length-1)]);return;}
  }
  if(acaoDaTecla({key:e.key,shiftKey:e.shiftKey,isComposing:e.nativeEvent.isComposing,keyCode:e.keyCode})==='enviar'){e.preventDefault();void enviar();}
 }
 const pausado=/pausa|parar|desligado/i.test(estadoAutomatico);
 // Regra de uso do automático: mora no Popover do ícone de ajuda (e fica no leitor de tela via aria-describedby).
 const ajuda=<><p>{aberta?'Janela aberta. Templates com tarifa continuam bloqueados.':'Janela encerrada. Envio com tarifa bloqueado.'} Escolha, ajuste o texto e envie. Clicar no botão não envia a mensagem. Enter envia; Shift+Enter quebra a linha; &quot;/&quot; abre as respostas prontas.</p><p className="mt-2">Ao assumir, as respostas automáticas ficam pausadas. Retomar pode atender a última entrada de até 30 minutos ainda sem resposta. Respostas já registradas não são repetidas. Mensagens enviadas por outros aplicativos podem não aparecer aqui.</p></>;
 return <form className="shrink-0 border-t border-divisoria" onSubmit={e=>{e.preventDefault();void enviar();}}>
  {/* Banner fino acima da barra, como os avisos do WhatsApp Web: estado do automático + as DUAS ações sempre visíveis. */}
  <div role="status" className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 px-3 py-1.5 ${pausado?'bg-marca-tint':'bg-card-elevated'}`}>
   {pausado?<UserRound className="size-4 shrink-0 text-marca-tint-texto" aria-hidden="true"/>:<Bot className="size-4 shrink-0 text-texto-secundario" aria-hidden="true"/>}
   <span className="min-w-[10rem] flex-1 text-xs"><strong className="font-semibold">{pausado?'A equipe está no comando':'Assistente automático'}</strong> <span className="text-texto-secundario max-sm:sr-only">· {estadoAutomatico}</span>
    {!aberta&&<span className="block text-texto-secundario">Aguarde nova mensagem do cliente · envio com tarifa bloqueado</span>}
    {aberta&&<span className="sr-only"> · Resposta de atendimento disponível · templates com tarifa bloqueados</span>}</span>
   <div className="flex flex-wrap items-center gap-1.5">
    <Button type="button" variant={pausado?'outline':'default'} size="sm" disabled={busy} onClick={()=>controle(false)}><UserRound className="size-4" aria-hidden="true"/>Assumir conversa</Button>
    <Button type="button" variant={pausado?'default':'outline'} size="sm" disabled={busy} onClick={()=>controle(true)}><Bot className="size-4" aria-hidden="true"/>Retomar automático</Button>
    <Button type="button" variant="ghost" size="iconSm" aria-label="Atualizar conversa" title="Atualizar conversa" onClick={()=>router.refresh()}><RotateCw className="size-4 text-muted-foreground" aria-hidden="true"/></Button>
    <Popover>
     <PopoverTrigger asChild><Button type="button" variant="ghost" size="iconSm" aria-label="Como funciona o automático" aria-describedby="ajuda-automatico" title="Como funciona o automático"><CircleHelp className="size-4 text-muted-foreground" aria-hidden="true"/></Button></PopoverTrigger>
     <PopoverContent align="end" className="w-80 p-4 text-xs leading-relaxed" aria-label="Como funciona o automático">{ajuda}</PopoverContent>
    </Popover>
   </div>
  </div>
  <div id="ajuda-automatico" className="sr-only">{ajuda}</div>
  {/* Uma barra só: respostas prontas, campo em pílula e enviar redondo. */}
  <div className="relative flex items-end gap-2 px-3 py-2.5">
   <Popover open={menu} onOpenChange={o=>{setMenu(o);if(!o)setBuscaMenu('');}}>
    <PopoverTrigger asChild><Button type="button" variant="ghost" size="icon" aria-label="Respostas prontas" title="Respostas prontas" className="shrink-0 rounded-full" disabled={!aberta||busy}><Zap className="size-5 text-muted-foreground" aria-hidden="true"/></Button></PopoverTrigger>
    <PopoverContent side="top" align="start" className="w-[min(24rem,calc(100vw-2rem))] p-2" aria-label="Respostas prontas">
     <Input type="search" aria-label="Buscar resposta pronta" placeholder="Buscar resposta pronta" value={buscaMenu} onChange={e=>setBuscaMenu(e.target.value)} className="mb-2 rounded-full"/>
     <ListaProntas itens={filtradasMenu} indice={-1} onEscolher={escolher}/>
    </PopoverContent>
   </Popover>
   {barraAberta&&<div className="absolute bottom-full left-3 z-20 mb-1 w-[min(24rem,calc(100%-1.5rem))] rounded-painel border border-painel-borda bg-popover p-2 shadow-[var(--shadow-md)]"><ListaProntas itens={filtradasBarra} indice={indice} onEscolher={escolher}/></div>}
   <div className="flex min-w-0 flex-1 items-end rounded-[1.5rem] bg-poco px-4 focus-within:ring-2 focus-within:ring-ring/60">
    <Label htmlFor="resposta-whatsapp" className="sr-only">Sua mensagem</Label>
    <Textarea ref={campo} id="resposta-whatsapp" aria-label="Sua resposta" rows={1} autoResize className="max-h-36 min-h-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-0 py-3 text-sm leading-normal shadow-none focus-visible:shadow-none focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="Escreva ou use / para respostas" maxLength={4096} value={texto} onChange={e=>aoDigitar(e.target.value)} onKeyDown={aoTeclar} disabled={!aberta||busy}/>
   </div>
   <Button type="submit" size="icon" aria-label="Enviar mensagem" aria-busy={busy} className="size-11 shrink-0 rounded-full" disabled={!aberta||busy||!texto.trim()}><Send className="size-5" aria-hidden="true"/></Button>
  </div>
  {texto.length>LIMITE_AVISO&&<p className="-mt-1.5 px-5 pb-2 text-right font-mono text-xs text-muted-foreground">{texto.length}/4096</p>}
  {notice&&<p role="status" className="mx-3 mb-3 rounded-controle border border-divisoria bg-controle p-3 text-sm font-medium">{notice}</p>}
 </form>;
}
