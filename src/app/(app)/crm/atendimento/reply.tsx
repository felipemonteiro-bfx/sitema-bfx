'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { responderConversa } from './actions';

export function Reply({telefone,aberta}:{telefone:string;aberta:boolean}) {
  const router=useRouter(); const [texto,setTexto]=useState('');const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');const sending=useRef(false);
  useEffect(()=>{const timer=setInterval(()=>{if(!sending.current)router.refresh();},30000);return()=>clearInterval(timer);},[router]);
  return <form className="space-y-3 border-t pt-4" onSubmit={async e=>{e.preventDefault();if(sending.current)return;sending.current=true;setBusy(true);try{const result=await responderConversa(telefone,texto);setNotice(result.message);if(result.ok)setTexto('');router.refresh();}catch{setNotice('Não foi possível confirmar o envio. Confira o histórico antes de repetir.');}finally{sending.current=false;setBusy(false);}}}>
    <p className="text-sm text-muted-foreground">{aberta?'Janela aberta: resposta de atendimento sem template pago.':'Janela encerrada: aguarde uma nova mensagem do cliente. Envios com tarifa bloqueados.'}</p>
    <Textarea aria-label="Sua resposta" placeholder="Escreva sua resposta…" maxLength={4096} value={texto} onChange={e=>setTexto(e.target.value)} disabled={!aberta||busy}/>
    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!aberta||busy||!texto.trim()}>{busy?'Enviando…':'Enviar resposta'}</Button><Button type="button" variant="outline" onClick={()=>router.refresh()}>Atualizar conversa</Button></div>
    {notice&&<p role="status" className="text-sm font-medium">{notice}</p>}
  </form>;
}
