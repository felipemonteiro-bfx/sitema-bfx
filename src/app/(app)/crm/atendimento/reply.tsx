'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Send, UserRound, Bot, RotateCw, PackageSearch, CreditCard, Truck, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { responderConversa, controlarAutomatico } from './actions';
const prontas=[
 {titulo:'Boas-vindas',icone:MessageSquare,texto:'Olá! Seja bem-vindo à BFX. Como posso ajudar você hoje?'},
 {titulo:'Pedir modelo',icone:PackageSearch,texto:'Qual produto, modelo e quantidade você procura? Vou conferir o estoque e as condições disponíveis.'},
 {titulo:'Pedido / entrega',icone:Truck,texto:'Pode informar o número do pedido e o que precisa verificar sobre a entrega ou o pós-venda?'},
 {titulo:'Conferir pagamento',icone:CreditCard,texto:'Recebemos sua mensagem sobre pagamento. Vamos conferir o comprovante e a baixa no sistema antes de confirmar a quitação.'},
 {titulo:'Atendimento humano',icone:UserRound,texto:'Olá! Sou da equipe BFX e vou continuar seu atendimento por aqui.'},
 {titulo:'Encerrar atendimento',icone:Check,texto:'Obrigado pelo contato com a BFX! Se precisar de mais alguma coisa, estamos à disposição.'},
];
export function Reply({telefone,aberta,estadoAutomatico}:{telefone:string;aberta:boolean;estadoAutomatico:string}) {
 const router=useRouter();const [texto,setTexto]=useState('');const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');const sending=useRef(false);const campo=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{const timer=setInterval(()=>{if(!sending.current&&!document.querySelector('[data-kanban-editor][open]'))router.refresh();},30000);return()=>clearInterval(timer);},[router]);
 async function controle(retomar:boolean){if(sending.current)return;sending.current=true;setBusy(true);try{const r=await controlarAutomatico(telefone,retomar);setNotice(r.message);router.refresh();}catch{setNotice('Não foi possível confirmar a mudança. Atualize antes de repetir.');}finally{sending.current=false;setBusy(false);}}
 const pausado=/pausa|parar|desligado/i.test(estadoAutomatico);
 return <form className="space-y-5 border-t pt-5" onSubmit={async e=>{e.preventDefault();if(sending.current)return;sending.current=true;setBusy(true);try{const result=await responderConversa(telefone,texto);setNotice(result.message);if(result.ok)setTexto('');router.refresh();}catch{setNotice('Não foi possível confirmar o envio. Confira o histórico antes de repetir.');}finally{sending.current=false;setBusy(false);}}}>
  <div className="flex flex-col gap-4 rounded-xl bg-muted/60 p-4 sm:flex-row sm:items-center sm:justify-between">
   <div className="flex items-start gap-3"><Bot className="mt-1 size-5 shrink-0 text-primary"/><div><strong className="block text-sm">{pausado?'A equipe está no comando':'Assistente automático'}</strong><p className="mt-1 text-sm text-muted-foreground">{estadoAutomatico}</p></div></div>
   <div className="flex shrink-0 flex-wrap gap-2"><Button type="button" variant={pausado?'outline':'default'} disabled={busy} onClick={()=>controle(false)}><UserRound className="mr-2 size-4"/>Assumir conversa</Button><Button type="button" variant={pausado?'default':'outline'} disabled={busy} onClick={()=>controle(true)}><Bot className="mr-2 size-4"/>Retomar automático</Button></div>
  </div>
  <div><h3 className="font-semibold">Respostas prontas</h3><p className="mt-1 text-sm text-muted-foreground">Escolha, ajuste o texto e envie. Clicar no botão não envia a mensagem.</p><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{prontas.map(p=><Button key={p.titulo} type="button" variant="outline" className="h-auto min-h-11 justify-start whitespace-normal px-3 py-3 text-left" disabled={!aberta||busy} onClick={()=>{setTexto(p.texto);campo.current?.focus();}}><p.icone className="mr-2 size-4 shrink-0 text-primary"/>{p.titulo}</Button>)}</div></div>
  <div className="overflow-hidden rounded-xl border bg-background"><label htmlFor="resposta-whatsapp" className="block px-4 pt-4 text-sm font-semibold">Sua mensagem</label><Textarea ref={campo} id="resposta-whatsapp" aria-label="Sua resposta" className="min-h-28 resize-y border-0 shadow-none focus-visible:ring-0" placeholder="Escreva ou escolha uma resposta pronta acima…" maxLength={4096} value={texto} onChange={e=>setTexto(e.target.value)} disabled={!aberta||busy}/><div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30 p-3"><span className="text-xs text-muted-foreground">{aberta?'Resposta de atendimento disponível':'Aguarde nova mensagem do cliente'} · {texto.length}/4096</span><Button type="submit" disabled={!aberta||busy||!texto.trim()}><Send className="mr-2 size-4"/>{busy?'Enviando…':'Enviar mensagem'}</Button></div></div>
  <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{aberta?'Janela aberta. Templates com tarifa continuam bloqueados.':'Janela encerrada. Envio com tarifa bloqueado.'}</p><Button type="button" size="sm" variant="ghost" onClick={()=>router.refresh()}><RotateCw className="mr-2 size-4"/>Atualizar conversa</Button></div>
  {notice&&<p role="status" className="rounded-lg border bg-muted p-3 text-sm font-medium">{notice}</p>}
  <details className="text-xs text-muted-foreground"><summary className="flex cursor-pointer items-center gap-1">Como funciona o automático<ChevronDown className="size-3"/></summary><p className="mt-2 max-w-prose leading-relaxed">Ao assumir, as respostas automáticas ficam pausadas. Retomar pode atender a última entrada de até 30 minutos ainda sem resposta. Respostas já registradas não são repetidas. Mensagens enviadas por outros aplicativos podem não aparecer aqui.</p></details>
 </form>;
}
