'use client';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {useRouter} from 'next/navigation';
import {Ellipsis} from 'lucide-react';
import {Sheet,SheetContent} from '@/components/ui/sheet';
import {movimentoKanban,ETAPAS_ATENDIMENTO,type EstadoKanban,type EtapaAtendimento,type CartaoConversa,type ResponsavelAtendimento} from '@/lib/whatsapp-kanban';
import {salvarOrganizacaoConversa} from './kanban-actions';
import {edicaoPendente,podeTrocarCartao,aplicarAlteracao,AVISO_EDICAO_PENDENTE,type AlteracaoCartao} from './refresh-regras';
import {DEBOUNCE_BUSCA_MS,avisoDoLimite,precisaNavegar,urlDaBuscaDoQuadro} from './kanban-busca';
import {CartaoKanban,DetalhesCartao} from './kanban-cartao';
import {BarraKanban} from './kanban-barra';
import {filtrarCartoes,type FiltrosKanban} from './kanban-filtros';

export {OrganizarConversa} from './organizar-conversa';

/** `sm` do Tailwind (40rem): a partir dele o painel fica ao lado do quadro; abaixo, é gaveta modal com véu. */
const MQ_SM='(min-width: 40rem)';
const ouvirSm=(f:()=>void)=>{const m=window.matchMedia(MQ_SM);m.addEventListener('change',f);return()=>m.removeEventListener('change',f);};

export function KanbanConversas({cartoes,pessoas,busca,base='/crm/atendimento'}:{cartoes:CartaoConversa[];pessoas:ResponsavelAtendimento[];busca:string;/** Rota da tela: o quadro também roda na tela própria (janela). */base?:string}){
 const router=useRouter();const [filtro,setFiltro]=useState('todas');const [aviso,setAviso]=useState('');
 // O texto da busca não filtra aqui: vai para o `q` da URL e o servidor refaz a consulta no banco todo.
 // O filtro local fica só para responsável e "só sem classificação".
 const [filtros,setFiltros]=useState<FiltrosKanban>({busca:'',responsavel:'todos',soSemClassificacao:false});
 const [texto,setTexto]=useState(busca);
 const acimaDeSm=useSyncExternalStore(ouvirSm,()=>window.matchMedia(MQ_SM).matches,()=>false);
 const modal=!acimaDeSm;
 useEffect(()=>{
  if(!precisaNavegar(texto,busca))return;
  // Edição pendente no Sheet: navegar recarregaria o quadro e descartaria o que o usuário digitou.
  const t=setTimeout(()=>{if(edicaoPendente(document)){setAvisoSheet(AVISO_EDICAO_PENDENTE);return;}router.replace(urlDaBuscaDoQuadro(base,texto));},DEBOUNCE_BUSCA_MS);
  return()=>clearTimeout(t);
 },[texto,busca,base,router]);
 const avisoLimite=avisoDoLimite(cartoes.length);
 const arrastando=useRef<CartaoConversa|null>(null);const gravando=useRef(false);
 const [telefoneArrastado,setTelefoneArrastado]=useState<string|null>(null);
 const [destino,setDestino]=useState<string|null>(null);const [movendo,setMovendo]=useState(false);
 const [aberto,setAberto]=useState<string|null>(null);
 const [alteracoes,setAlteracoes]=useState<Record<string,AlteracaoCartao<EstadoKanban>>>({});
 const [avisoSheet,setAvisoSheet]=useState('');
 const cartoesAtuais=cartoes.map(c=>aplicarAlteracao(c,alteracoes[c.telefone]));
 // Edição suja no Sheet: clique fora, foco fora e Escape não fecham; trocar de cartão também não (descartaria a edição).
 const barrarFechamento=(e:{preventDefault:()=>void})=>{if(edicaoPendente(document)){e.preventDefault();setAvisoSheet(AVISO_EDICAO_PENDENTE);}};
 function abrirCartao(t:string){if(!podeTrocarCartao(document,aberto,t)){setAvisoSheet(AVISO_EDICAO_PENDENTE);return;}setAvisoSheet('');setAberto(t);}
 function salvoNoSheet(telefone:string,estado:EstadoKanban,revisao:number){setAlteracoes(a=>({...a,[telefone]:{estado,revisao}}));setAvisoSheet('');}
 const visiveis=filtrarCartoes(cartoesAtuais,filtros);
 const contagemPorEtapa=Object.fromEntries(ETAPAS_ATENDIMENTO.map(e=>[e.id,visiveis.filter(c=>c.estado.etapa===e.id).length]));
 // O cartão do Sheet é relido a cada render; se sumir da lista (ex.: saiu do filtro de dados), o Sheet fecha.
 const cartaoAberto=aberto?cartoesAtuais.find(c=>c.telefone===aberto)??null:null;
 async function soltar(etapa:EtapaAtendimento){
  const c=arrastando.current;arrastando.current=null;setTelefoneArrastado(null);setDestino(null);
  if(!c||gravando.current||edicaoPendente(document))return;
  const input=movimentoKanban(c,etapa);if(!input)return;
  gravando.current=true;setMovendo(true);setAviso('Salvando movimentação…');
  try{const r=await salvarOrganizacaoConversa(input);setAviso(`${c.nome}: ${r.message}`);if(r.ok&&r.revisao){setAlteracoes(a=>({...a,[c.telefone]:{estado:{...c.estado,etapa},revisao:r.revisao!}}));router.refresh();}}
  catch{setAviso('Não foi possível confirmar a movimentação. Atualize antes de tentar novamente.');}
  finally{gravando.current=false;setMovendo(false);}
 }
 function atualizar(){if(!arrastando.current&&!gravando.current&&!edicaoPendente(document))router.refresh();}

 useEffect(()=>{const timer=setInterval(()=>{if(!arrastando.current&&!gravando.current&&!edicaoPendente(document))router.refresh();},30000);return()=>clearInterval(timer);},[router]);
 const etapas=ETAPAS_ATENDIMENTO.filter(e=>filtro==='todas'||e.id===filtro);
 return <section aria-label="Kanban de conversas" className="flex min-h-0 flex-1 flex-col gap-3">
  <BarraKanban filtros={filtros} busca={texto} onBusca={setTexto} onFiltros={setFiltros} etapa={filtro} onEtapa={setFiltro} contagemPorEtapa={contagemPorEtapa} total={visiveis.length} pessoas={pessoas} movendo={movendo} onAtualizar={atualizar}/>
  {avisoLimite&&<p className="flex-none text-xs text-muted-foreground">{avisoLimite}</p>}
  {aviso&&<p role="status" className="flex-none rounded-controle border border-divisoria bg-controle px-3 py-2 text-sm font-medium">{aviso}</p>}
  <div className="flex min-h-0 flex-1 items-start gap-2.5 overflow-x-auto overflow-y-hidden pb-3">{etapas.map(etapa=>{
   const cards=visiveis.filter(c=>c.estado.etapa===etapa.id);
   return <section key={etapa.id} aria-label={etapa.nome} onDragOver={e=>{if(arrastando.current&&!gravando.current){e.preventDefault();e.dataTransfer.dropEffect='move';setDestino(etapa.id);}}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setDestino(null);}} onDrop={e=>{if(arrastando.current){e.preventDefault();void soltar(etapa.id);}}} className={`flex max-h-full ${filtro==='todas'?'w-72 shrink-0':'w-full max-w-2xl'} flex-col rounded-controle ${destino===etapa.id?'bg-marca-tint ring-2 ring-primary':'bg-poco'}`}>
    <h2 className="flex flex-none items-center gap-2 px-3 pb-2.5 pt-3 text-sm font-semibold text-texto-secundario"><span>{etapa.nome}</span><span className="font-mono text-xs font-medium tabular-nums text-muted-foreground">{cards.length}</span><Ellipsis className="ml-auto size-4 text-muted-foreground" aria-hidden="true"/></h2>
    <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-2 pb-2">{cards.map(c=><CartaoKanban key={c.telefone} cartao={c} movendo={movendo} arrastando={telefoneArrastado===c.telefone} ativo={aberto===c.telefone} onAbrir={abrirCartao}
     onDragStart={e=>{if(gravando.current||edicaoPendente(document)||(e.target instanceof Element&&e.target.closest('a,input,textarea,select,button:not([data-abrir-cartao])'))){e.preventDefault();return;}arrastando.current=c;setTelefoneArrastado(c.telefone);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',c.telefone);}}
     onDragEnd={()=>{arrastando.current=null;setTelefoneArrastado(null);setDestino(null);}}/>)}
     {!cards.length&&<p className="py-6 text-center text-sm text-muted-foreground">Nenhuma conversa nesta etapa.</p>}</div>
   </section>;
  })}</div>
  <Sheet modal={modal} open={!!cartaoAberto} onOpenChange={o=>{if(!o){setAvisoSheet('');setAberto(null);}}}>
   <SheetContent side="right" fundo="card" ancorado onPointerDownOutside={barrarFechamento} onInteractOutside={barrarFechamento} onEscapeKeyDown={barrarFechamento} className="overflow-y-auto p-4 sm:max-w-100">{cartaoAberto&&<DetalhesCartao cartao={cartaoAberto} pessoas={pessoas} base={base} busca={busca} onAviso={setAviso} onSalvo={salvoNoSheet} avisoFechar={avisoSheet} disabled={movendo}/>}</SheetContent>
  </Sheet>
 </section>;
}
