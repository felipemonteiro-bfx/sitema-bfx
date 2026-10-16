'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, UserRound, Bot, RotateCw, CircleHelp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { responderConversa, controlarAutomatico } from './actions';
import { edicaoPendente } from './refresh-regras';
import { PRONTAS, acaoDaTecla, filtrarProntas, termoDeBarra, type Pronta } from './composer-regras';

/** Contador de caracteres só aparece perto do limite de 4096. */
const LIMITE_AVISO = 3500;

/** Destaque sutil do botão do estado atual (borda e texto verdes; nunca preenchido). Aplicado no invólucro: o Button não aceita classes. */
const DESTAQUE_ATIVO = '[&>button]:border-marca-tint-texto/40 [&>button]:text-marca-tint-texto';

/** Lista de respostas prontas aberta pelo "/". Escolher SÓ preenche o campo; nunca envia. */
function ListaProntas({ itens, indice, onEscolher }: { itens: readonly Pronta[]; indice: number; onEscolher: (p: Pronta) => void }) {
  if (!itens.length) return <p className="px-3 py-2 text-sm text-muted-foreground">Nenhuma resposta pronta com esse termo.</p>;
  return <ul role="listbox" aria-label="Respostas prontas" className="flex max-h-64 flex-col overflow-y-auto">
    {itens.map((p, i) => <li key={p.titulo} role="option" aria-selected={i === indice} className="aria-selected:[&>button]:bg-controle [&>button]:h-auto [&>button]:w-full [&>button]:flex-col [&>button]:items-start [&>button]:gap-0.5 [&>button]:px-3 [&>button]:py-2 [&>button]:text-left [&>button]:font-normal">
      <Button type="button" variant="ghost" onClick={() => onEscolher(p)}>
        <span className="text-sm font-semibold">{p.titulo}</span>
        <span className="line-clamp-2 whitespace-normal text-xs text-texto-secundario">{p.texto}</span>
      </Button>
    </li>)}
  </ul>;
}

export function Reply({telefone,aberta,estadoAutomatico}:{telefone:string;aberta:boolean;estadoAutomatico:string}) {
 const router=useRouter();const [texto,setTexto]=useState('');const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');const sending=useRef(false);const campo=useRef<HTMLTextAreaElement>(null);
 const [indice,setIndice]=useState(0);const [barraFechada,setBarraFechada]=useState(false);
 useEffect(()=>{const timer=setInterval(()=>{if(!sending.current&&!edicaoPendente(document))router.refresh();},30000);return()=>clearInterval(timer);},[router]);
 async function controle(retomar:boolean){if(sending.current)return;sending.current=true;setBusy(true);try{const r=await controlarAutomatico(telefone,retomar);setNotice(r.message);router.refresh();}catch{setNotice('Não foi possível confirmar a mudança. Atualize antes de repetir.');}finally{sending.current=false;setBusy(false);}}
 // Envio único (botão e Enter): mesmas guardas de sempre — janela aberta, texto não vazio e anti-duplo-envio.
 async function enviar(){if(sending.current||!aberta||busy||!texto.trim())return;sending.current=true;setBusy(true);try{const result=await responderConversa(telefone,texto);setNotice(result.message);if(result.ok)setTexto('');router.refresh();}catch{setNotice('Não foi possível confirmar o envio. Confira o histórico antes de repetir.');}finally{sending.current=false;setBusy(false);}}
 // "/" no início do campo abre a lista e filtra pelo que vem depois dela.
 const termo=termoDeBarra(texto);
 const filtradasBarra=termo===null?[]:filtrarProntas(PRONTAS,termo);
 const barraAberta=termo!==null&&!barraFechada&&filtradasBarra.length>0&&aberta;
 function escolher(p:Pronta){setTexto(p.texto);setIndice(0);setBarraFechada(false);campo.current?.focus();}
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
  {/* Faixa fina do assistente (como no artboard): estado + as DUAS ações sempre visíveis; o botão do estado atual ganha borda e texto verdes. */}
  <div role="status" className={`mx-3 mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-controle py-2 pl-3 pr-2 ${pausado?'bg-marca-tint':'bg-card-elevated'}`}>
   {pausado?<UserRound className="size-4 shrink-0 text-marca-tint-texto" aria-hidden="true"/>:<Bot className="size-4 shrink-0 text-texto-secundario" aria-hidden="true"/>}
   <span title={estadoAutomatico} className="min-w-40 flex-1 truncate text-sm"><strong className="font-semibold">{pausado?'A equipe está no comando':'Assistente automático'}</strong> <span className="text-texto-secundario max-sm:sr-only">· {estadoAutomatico}</span>
    {!aberta&&<span className="block truncate text-xs text-texto-secundario">Aguarde nova mensagem do cliente · envio com tarifa bloqueado</span>}
    {aberta&&<span className="sr-only"> · Resposta de atendimento disponível · templates com tarifa bloqueados</span>}</span>
   <div className="flex flex-wrap items-center gap-1.5">
    <span className={pausado?DESTAQUE_ATIVO:undefined}><Button type="button" variant="outline" size="sm" aria-pressed={pausado} disabled={busy} onClick={()=>controle(false)}><UserRound className="size-4" aria-hidden="true"/>Assumir conversa</Button></span>
    <span className={pausado?undefined:DESTAQUE_ATIVO}><Button type="button" variant="outline" size="sm" aria-pressed={!pausado} disabled={busy} onClick={()=>controle(true)}><Bot className="size-4" aria-hidden="true"/>Retomar automático</Button></span>
    <Button type="button" variant="ghost" size="iconSm" aria-label="Atualizar conversa" title="Atualizar conversa" onClick={()=>router.refresh()}><RotateCw className="size-4 text-muted-foreground" aria-hidden="true"/></Button>
    <Popover>
     <PopoverTrigger asChild><Button type="button" variant="ghost" size="iconSm" aria-label="Como funciona o automático" aria-describedby="ajuda-automatico" title="Como funciona o automático"><CircleHelp className="size-4 text-muted-foreground" aria-hidden="true"/></Button></PopoverTrigger>
     <PopoverContent align="end" aria-label="Como funciona o automático"><div className="text-xs leading-relaxed">{ajuda}</div></PopoverContent>
    </Popover>
   </div>
  </div>
  <div id="ajuda-automatico" className="sr-only">{ajuda}</div>
  {/* Respostas prontas em chips roláveis: clicar SÓ preenche o campo (nunca envia). Também abrem com "/". */}
  <div role="group" aria-label="Respostas prontas" className="flex gap-1.5 overflow-x-auto px-3 pb-0.5 pt-2.5 [&>button]:shrink-0 [&>button]:rounded-full [&>button]:font-normal [&>button]:text-texto-secundario">
   {PRONTAS.map(p=><Button key={p.titulo} type="button" variant="outline" size="sm" title={p.texto} disabled={!aberta||busy} onClick={()=>escolher(p)}>{p.titulo}</Button>)}
  </div>
  {/* Barra de escrita: atalhos rápidos (em breve), campo em pílula e enviar redondo. */}
  <div className="relative flex items-end gap-2 px-3 py-2.5">
   <span className="shrink-0 [&>button]:rounded-full"><Button type="button" variant="ghost" size="icon" aria-label="Atalhos rápidos (em breve)" title="Atalhos rápidos (em breve)" disabled><Zap className="size-5 text-muted-foreground" aria-hidden="true"/></Button></span>
   {barraAberta&&<div className="absolute bottom-full left-3 z-20 mb-1 w-96 max-w-full rounded-painel border border-painel-borda bg-popover p-2 shadow-md"><ListaProntas itens={filtradasBarra} indice={indice} onEscolher={escolher}/></div>}
   {/* Campo como no artboard (borda e fundo do Textarea); o invólucro só ajusta a altura mínima e tira o puxador de redimensionar. */}
   <div className="min-w-0 flex-1 [&_textarea]:max-h-36 [&_textarea]:min-h-12 [&_textarea]:resize-none">
    <span className="sr-only"><Label htmlFor="resposta-whatsapp">Sua mensagem</Label></span>
    <Textarea ref={campo} id="resposta-whatsapp" aria-label="Sua resposta" rows={1} autoResize placeholder="Escreva uma mensagem" maxLength={4096} value={texto} onChange={e=>aoDigitar(e.target.value)} onKeyDown={aoTeclar} disabled={!aberta||busy}/>
   </div>
   <span className="shrink-0 [&>button]:size-12 [&>button]:rounded-full"><Button type="submit" size="icon" aria-label="Enviar mensagem" aria-busy={busy} disabled={!aberta||busy||!texto.trim()}><Send className="size-5" aria-hidden="true"/></Button></span>
  </div>
  {texto.length>LIMITE_AVISO&&<p className="-mt-1.5 px-5 pb-2 text-right font-mono text-xs text-muted-foreground">{texto.length}/4096</p>}
  {notice&&<p role="status" className="mx-3 mb-3 rounded-controle border border-divisoria bg-controle p-3 text-sm font-medium">{notice}</p>}
 </form>;
}
