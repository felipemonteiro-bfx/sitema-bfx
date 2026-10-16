'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, UserRound, Bot, RotateCw, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { responderConversa, controlarAutomatico } from './actions';
// Textos das respostas prontas: os mesmos de sempre. Escolher um SÓ preenche o campo.
const prontas=[
 {titulo:'Boas-vindas',texto:'Olá! Seja bem-vindo à BFX. Como posso ajudar você hoje?'},
 {titulo:'Pedir modelo',texto:'Qual produto, modelo e quantidade você procura? Vou conferir o estoque e as condições disponíveis.'},
 {titulo:'Pedido / entrega',texto:'Pode informar o número do pedido e o que precisa verificar sobre a entrega ou o pós-venda?'},
 {titulo:'Conferir pagamento',texto:'Recebemos sua mensagem sobre pagamento. Vamos conferir o comprovante e a baixa no sistema antes de confirmar a quitação.'},
 {titulo:'Atendimento humano',texto:'Olá! Sou da equipe BFX e vou continuar seu atendimento por aqui.'},
 {titulo:'Encerrar atendimento',texto:'Obrigado pelo contato com a BFX! Se precisar de mais alguma coisa, estamos à disposição.'},
];
export function Reply({telefone,aberta,estadoAutomatico}:{telefone:string;aberta:boolean;estadoAutomatico:string}) {
 const router=useRouter();const [texto,setTexto]=useState('');const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');const sending=useRef(false);const campo=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{const timer=setInterval(()=>{if(!sending.current&&!document.querySelector('[data-kanban-editor][open]'))router.refresh();},30000);return()=>clearInterval(timer);},[router]);
 async function controle(retomar:boolean){if(sending.current)return;sending.current=true;setBusy(true);try{const r=await controlarAutomatico(telefone,retomar);setNotice(r.message);router.refresh();}catch{setNotice('Não foi possível confirmar a mudança. Atualize antes de repetir.');}finally{sending.current=false;setBusy(false);}}
 const pausado=/pausa|parar|desligado/i.test(estadoAutomatico);
 return <form className="flex flex-col gap-3 border-t border-divisoria p-3 sm:p-4" onSubmit={async e=>{e.preventDefault();if(sending.current)return;sending.current=true;setBusy(true);try{const result=await responderConversa(telefone,texto);setNotice(result.message);if(result.ok)setTexto('');router.refresh();}catch{setNotice('Não foi possível confirmar o envio. Confira o histórico antes de repetir.');}finally{sending.current=false;setBusy(false);}}}>
  <div role="status" className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-controle py-2 pl-3 pr-2 ${pausado?'bg-marca-tint':'bg-controle'}`}>
   {pausado?<UserRound className="size-[18px] shrink-0 text-marca-tint-texto" aria-hidden="true"/>:<Bot className="size-[18px] shrink-0 text-texto-secundario" aria-hidden="true"/>}
   <span className="min-w-[11rem] flex-1 text-sm"><strong className="font-semibold">{pausado?'A equipe está no comando':'Assistente automático'}</strong> <span className="text-texto-secundario">· {estadoAutomatico}</span></span>
   {pausado
    ?<Button type="button" variant="outline" size="sm" disabled={busy} onClick={()=>controle(true)}><Bot className="size-4" aria-hidden="true"/>Retomar automático</Button>
    :<Button type="button" variant="outline" size="sm" disabled={busy} onClick={()=>controle(false)}><UserRound className="size-4" aria-hidden="true"/>Assumir conversa</Button>}
  </div>
  <div role="group" aria-label="Respostas prontas" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
   {prontas.map(p=><Button key={p.titulo} type="button" variant="outline" className="h-10 shrink-0 rounded-full px-3 text-sm font-normal text-texto-secundario" disabled={!aberta||busy} onClick={()=>{setTexto(p.texto);campo.current?.focus();}}>{p.titulo}</Button>)}
  </div>
  <div className="flex items-end gap-2.5">
   <label htmlFor="resposta-whatsapp" className="sr-only">Sua mensagem</label>
   <Textarea ref={campo} id="resposta-whatsapp" aria-label="Sua resposta" rows={1} className="max-h-40 min-h-12 flex-1 resize-y rounded-interno text-base" placeholder="Escreva ou escolha uma resposta pronta…" maxLength={4096} value={texto} onChange={e=>setTexto(e.target.value)} disabled={!aberta||busy}/>
   <Button type="submit" size="icon" aria-label="Enviar mensagem" aria-busy={busy} className="size-12 shrink-0 rounded-full" disabled={!aberta||busy||!texto.trim()}><Send className="size-5" aria-hidden="true"/></Button>
  </div>
  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
   <span className="min-w-0 flex-1">{aberta?'Resposta de atendimento disponível':'Aguarde nova mensagem do cliente'} · {aberta?'Janela aberta. Templates com tarifa continuam bloqueados.':'Janela encerrada. Envio com tarifa bloqueado.'} Escolha, ajuste o texto e envie. Clicar no botão não envia a mensagem.</span>
   <span className="flex items-center gap-2"><span className="font-mono">{texto.length}/4096</span><Button type="button" size="sm" variant="ghost" onClick={()=>router.refresh()}><RotateCw className="size-4" aria-hidden="true"/>Atualizar conversa</Button></span>
  </div>
  {notice&&<p role="status" className="rounded-controle border border-divisoria bg-controle p-3 text-sm font-medium">{notice}</p>}
  <details className="text-xs text-muted-foreground"><summary className="flex min-h-9 cursor-pointer items-center gap-1">Como funciona o automático<ChevronDown className="size-3" aria-hidden="true"/></summary><p className="mt-1 max-w-prose leading-relaxed">Ao assumir, as respostas automáticas ficam pausadas. Retomar pode atender a última entrada de até 30 minutos ainda sem resposta. Respostas já registradas não são repetidas. Mensagens enviadas por outros aplicativos podem não aparecer aqui.</p></details>
 </form>;
}
