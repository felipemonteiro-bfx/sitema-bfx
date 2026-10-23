'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Send, TriangleAlert, Zap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { responderConversa } from './actions';
import { avisoDeEnvio } from './quem-responde-regras';
import { PreviaComposer, useUrlComAtraso } from './link-previa-ui';
import { enviarComPrevia } from '@/lib/linkificar';
import { edicaoPendente } from './refresh-regras';
import { PainelAtalhos } from './atalhos-painel';
import { AnexarMenu } from './anexar-menu';
import { AnexoPrevia } from './anexo-previa';
import { GravadorAudio } from './gravador-audio';
import { enviarMidiaConversa } from './midia-actions';
import { LinhaResumo, corAutor, useResposta } from './citacao-ui';
import type { TipoMidia } from '@/lib/whatsapp-midia-politica';
import { decidirInsercao } from './atalhos-regras';
import { controlesDoComposer } from './gravador-regras';
import { PRONTAS, acaoDaTecla, botaoPrincipal, filtrarProntas, termoDeBarra, tipoDoAnexo, validarAnexo, type NomeOpcaoAnexo, type Pronta } from './composer-regras';

/** Contador de caracteres só aparece perto do limite de 4096. */
const LIMITE_AVISO = 3500;

/** Raio ativo (painel aberto): tint de marca como no artboard. Aplicado no invólucro: o Button não aceita classes. */
const RAIO_ABERTO = '[&>button]:border [&>button]:border-marca-tint-texto/40 [&>button]:bg-marca-tint [&>button]:text-marca-tint-texto';

/** Celular: o painel vira Sheet de baixo (abaixo de 640px). No servidor assume desktop. */
const MQ_CELULAR = '(max-width: 639px)';
function useCelular() {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia(MQ_CELULAR); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); },
    () => window.matchMedia(MQ_CELULAR).matches,
    () => false,
  );
}

/** Lista de respostas prontas aberta pelo "/". Escolher SÓ preenche o campo; nunca envia. */
function ListaProntas({ itens, indice, onEscolher }: { itens: readonly Pronta[]; indice: number; onEscolher: (p: Pronta) => void }) {
  if (!itens.length) return <p className="px-3 py-2 text-sm text-muted-foreground">Nenhuma resposta pronta com esse termo.</p>;
  return <>
    <p className="px-3 pb-1.5 pt-1 text-xs font-semibold uppercase tracking-wide text-texto-secundario">Respostas prontas · digite / para buscar</p>
    <ul role="listbox" aria-label="Respostas prontas" className="flex max-h-64 flex-col overflow-y-auto">
      {itens.map((p, i) => <li key={p.titulo} role="option" aria-selected={i === indice} className="aria-selected:[&>button]:bg-controle [&>button]:h-auto [&>button]:w-full [&>button]:flex-col [&>button]:items-stretch [&>button]:gap-0.5 [&>button]:px-3 [&>button]:py-2 [&>button]:text-left [&>button]:font-normal">
        <Button type="button" variant="ghost" onClick={() => onEscolher(p)}>
          <span className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">{p.titulo}</span><span className="font-mono text-xs text-texto-secundario">/{p.atalho}</span></span>
          <span className="line-clamp-1 whitespace-normal text-xs text-texto-secundario">{p.texto}</span>
        </Button>
      </li>)}
    </ul>
  </>;
}

export function Reply({telefone,aberta,envioIndisponivel=false}:{telefone:string;aberta:boolean;estadoAutomatico?:string;envioIndisponivel?:boolean}) {
 const router=useRouter();const [texto,setTexto]=useState('');const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');const sending=useRef(false);const campo=useRef<HTMLTextAreaElement>(null);
 // Mensagem que está sendo respondida (citação): vem do botão Responder da bolha.
 const {citando,cancelarResposta}=useResposta();
 // Prévia do link digitado: busca após 700 ms parado; o X guarda a URL dispensada (envia com preview_url:false).
 const urlPrevia=useUrlComAtraso(texto);const [semPrevia,setSemPrevia]=useState<string|null>(null);
 const [indice,setIndice]=useState(0);const [barraFechada,setBarraFechada]=useState(false);
 // Atalhos rápidos: painel aberto, texto aguardando confirmação de substituição e se o fechamento veio de uma inserção.
 const [atalhosAberto,setAtalhosAberto]=useState(false);const [pendente,setPendente]=useState<string|null>(null);const inseriu=useRef(false);const raio=useRef<HTMLButtonElement>(null);const celular=useCelular();
 // Anexo escolhido (aguardando prévia/legenda) e se o gravador de áudio está em uso.
 const [anexo,setAnexo]=useState<{arquivo:File;tipo:TipoMidia}|null>(null);const [legenda,setLegenda]=useState('');const [gravando,setGravando]=useState(false);
 useEffect(()=>{if(citando)campo.current?.focus();},[citando]);
 // Ao descartar ou enviar a gravação, o foco volta ao campo de mensagem (o botão focado da pílula some; nada de foco perdido no body).
 const voltarAoCampo=useRef(false);
 useEffect(()=>{if(gravando){voltarAoCampo.current=true;return;}if(!voltarAoCampo.current||busy)return;voltarAoCampo.current=false;const a=document.activeElement;if(!a||a===document.body)campo.current?.focus();},[gravando,busy]);
 useEffect(()=>{const timer=setInterval(()=>{if(!sending.current&&!edicaoPendente(document))router.refresh();},30000);return()=>clearInterval(timer);},[router]);
 // Envio único (botão e Enter): mesmas guardas de sempre — janela aberta, texto não vazio e anti-duplo-envio.
 async function enviar(){if(sending.current||!aberta||busy||!texto.trim())return;sending.current=true;setBusy(true);try{const result=await responderConversa(telefone,texto,citando?.resumo.id,enviarComPrevia(texto,semPrevia));setNotice(result.message);if(result.ok){setTexto('');setSemPrevia(null);cancelarResposta();}router.refresh();}catch{setNotice('Não foi possível confirmar o envio. Confira o histórico antes de repetir.');}finally{sending.current=false;setBusy(false);}}
 // Envio de mídia (anexo e áudio): mesmas guardas do texto (janela, anti-duplo-envio); mostra o retorno da action.
 async function enviarArquivo(tipo:TipoMidia,arquivo:File,leg?:string){if(sending.current||!aberta||busy)return{ok:false,message:'Aguarde o envio em andamento.'};sending.current=true;setBusy(true);try{const fd=new FormData();fd.set('telefone',telefone);fd.set('tipo',tipo);fd.set('arquivo',arquivo);if(leg?.trim())fd.set('legenda',leg.trim());if(citando)fd.set('respondeA',String(citando.resumo.id));const r=await enviarMidiaConversa(fd);setNotice(r.message);if(r.ok)cancelarResposta();router.refresh();return r;}catch{const m='Não foi possível confirmar o envio. Confira o histórico antes de repetir.';setNotice(m);return{ok:false,message:m};}finally{sending.current=false;setBusy(false);}}
 function aoAnexar(opcao:NomeOpcaoAnexo,arquivo:File){const tipo=tipoDoAnexo(opcao,arquivo);const v=validarAnexo(tipo,arquivo);if(!v.ok){setNotice(v.message);return;}setNotice('');setLegenda('');setAnexo({arquivo,tipo});}
 async function enviarAnexo(){if(!anexo)return;const r=await enviarArquivo(anexo.tipo,anexo.arquivo,legenda);if(r.ok){setAnexo(null);setLegenda('');}}
 // "/" no início do campo abre a lista e filtra pelo que vem depois dela.
 const termo=termoDeBarra(texto);
 const filtradasBarra=termo===null?[]:filtrarProntas(PRONTAS,termo);
 const barraAberta=termo!==null&&!barraFechada&&filtradasBarra.length>0&&aberta;
 function escolher(p:Pronta){setTexto(p.texto);setIndice(0);setBarraFechada(false);campo.current?.focus();}
 // Inserir SÓ preenche o campo (nunca envia). Com texto no campo, pergunta antes de substituir.
 function inserir(novo:string){if(decidirInsercao(texto,novo)==='confirmar'){setPendente(novo);return;}aplicarInsercao(novo);}
 function aplicarInsercao(novo:string){inseriu.current=true;setTexto(novo);setIndice(0);setBarraFechada(false);setPendente(null);setAtalhosAberto(false);}
 // Ao fechar: foco no campo se inseriu; senão volta ao raio.
 function aoFecharFoco(e:Event){e.preventDefault();(inseriu.current?campo.current:raio.current)?.focus();inseriu.current=false;}
 function aoDigitar(v:string){setTexto(v);setIndice(0);setBarraFechada(false);}
 function aoTeclar(e:React.KeyboardEvent<HTMLTextAreaElement>){
  if(barraAberta){
   if(e.key==='ArrowDown'){e.preventDefault();setIndice(i=>(i+1)%filtradasBarra.length);return;}
   if(e.key==='ArrowUp'){e.preventDefault();setIndice(i=>(i-1+filtradasBarra.length)%filtradasBarra.length);return;}
   if(e.key==='Escape'){e.preventDefault();setBarraFechada(true);return;}
   if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();escolher(filtradasBarra[Math.min(indice,filtradasBarra.length-1)]);return;}
  }
  if(e.key==='Escape'&&citando){e.preventDefault();cancelarResposta();return;}
  if(acaoDaTecla({key:e.key,shiftKey:e.shiftKey,isComposing:e.nativeEvent.isComposing,keyCode:e.keyCode})==='enviar'){e.preventDefault();void enviar();}
 }
 const aviso=envioIndisponivel?avisoDeEnvio(false):null;
 const ctl=controlesDoComposer(gravando);
 return <form className="shrink-0 border-t border-divisoria" onSubmit={e=>{e.preventDefault();void enviar();}}>
  {aviso&&<div role="alert" className="mx-3 mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-controle bg-warning-bg px-3 py-2 text-sm text-warning-text">
   <TriangleAlert className="size-4 shrink-0" aria-hidden="true"/>
   <span className="min-w-0 flex-1"><strong className="font-semibold">{aviso.titulo}</strong> {aviso.texto}</span>
   <Link href={aviso.href} className="font-semibold underline underline-offset-4 hover:no-underline">{aviso.acao}</Link>
  </div>}
  {aberta&&urlPrevia&&semPrevia!==urlPrevia&&<PreviaComposer url={urlPrevia} onRemover={()=>setSemPrevia(urlPrevia)}/>}
  {anexo&&<AnexoPrevia arquivo={anexo.arquivo} tipo={anexo.tipo} legenda={legenda} enviando={busy} onLegenda={setLegenda} onEnviar={()=>void enviarAnexo()} onCancelar={()=>{setAnexo(null);setLegenda('');}}/>}
  {/* Faixa "Respondendo a": a mesma linha de resumo da citação, com X. ESC (no campo ou na faixa) cancela. */}
  {citando&&<div role="group" aria-label="Respondendo a" onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();cancelarResposta();}}} className="mx-3 mt-2 flex items-stretch overflow-hidden rounded-xl bg-card-elevated">
   <span aria-hidden="true" className={`w-1 shrink-0 ${corAutor(citando.resumo.direcao).barra}`}/>
   <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-2">
    <span className={`truncate text-sm font-semibold ${corAutor(citando.resumo.direcao).nome}`}>Respondendo a {citando.autor}</span>
    <LinhaResumo r={citando.resumo}/>
   </div>
   <span className="flex w-11 shrink-0 text-texto-secundario [&>button]:h-auto [&>button]:w-full [&>button]:rounded-none"><Button type="button" variant="ghost" size="icon" aria-label="Cancelar resposta" title="Cancelar resposta (Esc)" onClick={()=>{cancelarResposta();campo.current?.focus();}}><X className="size-4.5" aria-hidden="true"/></Button></span>
  </div>}
  {/* Barra de escrita: raio dos atalhos rápidos, campo em pílula e enviar redondo. */}
  <Popover open={atalhosAberto&&!celular} onOpenChange={setAtalhosAberto} modal>
  <PopoverAnchor asChild><div className="relative flex items-end gap-2 px-3 py-2.5">
    {ctl.anexar&&<AnexarMenu desabilitado={!aberta||busy} onEscolher={aoAnexar}/>}
    {ctl.atalhos&&<span className={`shrink-0 [&>button]:rounded-full ${atalhosAberto?RAIO_ABERTO:''}`}>
     <PopoverTrigger asChild><Button ref={raio} type="button" variant="ghost" size="icon" aria-label="Respostas prontas e atalhos" title="Respostas prontas e atalhos (ou digite /)" aria-expanded={atalhosAberto} disabled={!aberta||busy}><Zap className={`size-5 ${atalhosAberto?'':'text-muted-foreground'}`} aria-hidden="true"/></Button></PopoverTrigger>
    </span>}
    <PopoverContent side="top" align="center" sideOffset={-6} aria-label="Respostas prontas e atalhos" onCloseAutoFocus={aoFecharFoco} largura="ancora"><PainelAtalhos telefone={telefone} onInserir={inserir} prontas={PRONTAS}/></PopoverContent>
   <Sheet open={atalhosAberto&&celular} onOpenChange={setAtalhosAberto}>
    <SheetContent side="bottom" onCloseAutoFocus={aoFecharFoco}><div className="sr-only"><SheetHeader><SheetTitle>Respostas prontas e atalhos</SheetTitle><SheetDescription>Respostas prontas, estoque, parcelas e boletos. Inserir só preenche o campo de mensagem.</SheetDescription></SheetHeader></div><div className="max-h-96 overflow-y-auto"><PainelAtalhos telefone={telefone} onInserir={inserir} prontas={PRONTAS}/></div></SheetContent>
   </Sheet>
   <AlertDialog open={pendente!==null} onOpenChange={o=>{if(!o)setPendente(null);}}>
    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Substituir o texto atual?</AlertDialogTitle><AlertDialogDescription>O campo já tem uma mensagem. Ao substituir, o que você escreveu é trocado pelo texto do atalho. Nada é enviado.</AlertDialogDescription></AlertDialogHeader>
     <AlertDialogFooter><AlertDialogCancel>Manter o meu texto</AlertDialogCancel><AlertDialogAction onClick={()=>{if(pendente!==null)aplicarInsercao(pendente);}}>Substituir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
   </AlertDialog>
   {barraAberta&&<div className="absolute bottom-full left-3 right-3 z-20 mb-1 rounded-painel sm:right-auto sm:w-96 border border-painel-borda bg-popover p-2 shadow-md"><ListaProntas itens={filtradasBarra} indice={indice} onEscolher={escolher}/></div>}
   {/* Campo como no artboard (borda e fundo do Textarea); o invólucro só ajusta a altura mínima e tira o puxador de redimensionar. */}
   {ctl.campo&&<div className="min-w-0 flex-1 [&_textarea]:max-h-36 [&_textarea]:min-h-12 [&_textarea]:resize-none">
    <span className="sr-only"><Label htmlFor="resposta-whatsapp">Sua mensagem</Label></span>
    <Textarea ref={campo} id="resposta-whatsapp" aria-label="Sua resposta" rows={1} autoResize placeholder={!aberta?"Janela encerrada: aguarde nova mensagem do cliente":celular?"Escreva uma mensagem":"Escreva uma mensagem ou digite / para respostas prontas"} maxLength={4096} value={texto} onChange={e=>aoDigitar(e.target.value)} onKeyDown={aoTeclar} disabled={!aberta||busy}/>
   </div>}
   {/* Campo vazio: o botão redondo é o microfone; com texto volta a ser Enviar. */}
   {botaoPrincipal(texto)==='microfone'
    ?<GravadorAudio desabilitado={!aberta||busy} onEnviar={f=>enviarArquivo('audio',f)} onFase={setGravando}/>
    :<span className="shrink-0 [&>button]:size-12 [&>button]:rounded-full"><Button type="submit" size="icon" aria-label="Enviar mensagem" aria-busy={busy} disabled={!aberta||busy||!texto.trim()}><Send className="size-5" aria-hidden="true"/></Button></span>}
  </div></PopoverAnchor>
  </Popover>
  {texto.length>LIMITE_AVISO&&<p className="-mt-1.5 px-5 pb-2 text-right font-mono text-xs text-muted-foreground">{texto.length}/4096</p>}
  {notice&&<p role="status" className="mx-3 mb-3 rounded-controle border border-divisoria bg-controle p-3 text-sm font-medium">{notice}</p>}
 </form>;
}
