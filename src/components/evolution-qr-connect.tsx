'use client';
import {useCallback,useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Loader2,QrCode,RefreshCw} from 'lucide-react';
type State={state:'unknown'|'close'|'connecting'|'open';qrcode?:string;error?:string};
export function EvolutionQRConnect(){
 const [status,setStatus]=useState<State>({state:'unknown'});
 const [busy,setBusy]=useState(false);const [erro,setErro]=useState('');
 const atualizar=useCallback(async()=>{try{const r=await fetch('/api/whatsapp/evolution',{cache:'no-store'});if(!r.ok)throw Error();const d:State=await r.json();setErro('');setStatus(prev=>({...d,qrcode:d.state==='open'?undefined:prev.qrcode}));}catch{setErro('Não foi possível verificar a conexão. Tente atualizar.');}},[]);
 useEffect(()=>{void atualizar();},[atualizar]);
 useEffect(()=>{if(status.state!=='connecting')return;const id=setInterval(atualizar,5000);return()=>clearInterval(id);},[status.state,atualizar]);
 async function gerar(){setBusy(true);setErro('');try{const r=await fetch('/api/whatsapp/evolution',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create'})});const d:State=await r.json();if(!r.ok||d.error)setErro(d.error||'Não foi possível gerar o QR Code.');setStatus(d);}catch{setErro('Não foi possível gerar o QR Code. Tente novamente.');}finally{setBusy(false);}}
 return <section id="evolution-qr" aria-label="Conectar WhatsApp por QR Code" className="space-y-4">
  <div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-semibold">WhatsApp por QR Code</h3><Badge variant={status.state==='open'?'success':'outline'}>{status.state==='open'?'Conectado':status.state==='connecting'&&status.qrcode?'QR pronto para leitura':'Não conectado'}</Badge></div>
  <p className="text-sm text-muted-foreground">Conecte o WhatsApp do celular para enviar mensagens individuais quando a janela da Meta estiver encerrada. Conectar não envia mensagens nem recupera envios antigos.</p>
  {status.state==='connecting'&&status.qrcode&&<div className="space-y-3"><p className="text-sm">No celular, abra WhatsApp → Dispositivos conectados → Conectar dispositivo e escaneie o código.</p><p className="text-sm text-muted-foreground">Se o celular recusar o código, use Gerar novo QR Code e tente novamente.</p><div className="inline-block rounded-interno bg-white p-3">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={status.qrcode} alt="QR Code para conectar o WhatsApp" className="size-64 max-w-full"/></div></div>}
  {erro&&<p role="alert" className="text-sm text-error-text">{erro}</p>}
  <div className="flex flex-wrap gap-2">{status.state!=='open'&&<Button type="button" onClick={gerar} disabled={busy}>{busy?<Loader2 className="size-4 animate-spin"/>:<QrCode className="size-4"/>}{busy?'Preparando conexão…':status.qrcode?'Gerar novo QR Code':'Gerar QR Code'}</Button>}<Button type="button" variant="outline" onClick={atualizar} disabled={busy}><RefreshCw className="size-4"/>Atualizar conexão</Button></div>
 </section>;
}
