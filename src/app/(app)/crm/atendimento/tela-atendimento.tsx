import Link from 'next/link';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { identificarContato } from '@/lib/crm-whatsapp-identidade';
import { variantesLocaisDeTelefone } from '@/lib/telefone-busca';
import { ContextoCliente } from './contexto';
import { MessageSquare, Users, Megaphone, Gift } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { inicioDaPausa } from '@/lib/whatsapp-pausa';
import {KanbanConversas,OrganizarConversa} from './kanban';
import {ORIGEM_KANBAN,ETAPAS_ATENDIMENTO,lerEstadoKanban,ESTADO_KANBAN_INICIAL} from '@/lib/whatsapp-kanban';
import { ConversaLista, AlternarVisao, BuscaConversas, urlAtendimento, type ItemConversa } from './conversa-lista';
import { ConversaChat } from './conversa-chat';
import { AbrirEmNovaJanela, ROTA_JANELA } from './abrir-em-nova-janela';
import { ultimasMensagensPorTelefone } from '@/lib/whatsapp-ultimas';
import { horaCurta, previaMensagem } from './status-mensagem';

const BASE_SISTEMA='/crm/atendimento';
const hora=(d:Date)=>d.toLocaleString('pt-BR',{timeZone:'America/Manaus',dateStyle:'short',timeStyle:'short'});

export type ParametrosAtendimento={telefone?:string;q?:string;visao?:string;etapa?:string};

/** Selo de estado da integração (leitura do provedor configurado; nenhum segredo é lido). */
export function SeloIntegracao({oficial}:{oficial:boolean}){
  return <span className={`inline-flex h-8 items-center gap-2 rounded-full px-3 text-sm font-semibold ${oficial?'bg-marca-tint text-marca-tint-texto':'bg-controle text-texto-secundario'}`}><span aria-hidden="true" className={`size-2 rounded-full ${oficial?'bg-primary':'bg-muted-foreground'}`}/>{oficial?'Integração oficial ativa':'Integração oficial não configurada'}</span>;
}

/**
 * Corpo do atendimento, compartilhado pela rota do sistema e pela tela própria (janela).
 * A guarda `requireAdmin` fica em cada `page.tsx`, antes de chamar este componente.
 */
export async function TelaAtendimento({searchParams,modo}:{searchParams:Promise<ParametrosAtendimento>;modo:'sistema'|'janela'}) {
  const janela=modo==='janela';
  const base=janela?ROTA_JANELA:BASE_SISTEMA;
  const sp=await searchParams;const q=(sp.q||'').trim().slice(0,100);
  const visao=sp.visao==='lista'||(!sp.visao&&sp.telefone)?'lista':'kanban';
  const etapaFiltro=ETAPAS_ATENDIMENTO.some(e=>e.id===sp.etapa)?String(sp.etapa):'todas';
  const clientes=await prisma.cliente.findMany({where:{telefone:{not:null}},select:{id:true,nome:true,telefone:true,atendimentoHumanoAt:true}});
  const normalizar=(t:string)=>t.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  const buscaNome=clientes.filter(c=>normalizar(c.nome).includes(normalizar(q)));
  const telefonesNome=buscaNome.flatMap(c=>variantesLocaisDeTelefone(c.telefone||'').map(t=>'55'+t));
  const digitos=q.replace(/[^\d]/g,'');
  const grupos=await prisma.whatsAppMensagem.groupBy({by:['telefone'],_max:{criadoEm:true},orderBy:{_max:{criadoEm:'desc'}},take:100,where:{direcao:{in:['in','out']},...(q?{OR:[...(digitos?[{telefone:{contains:digitos}}]:[]),{telefone:{in:telefonesNome}}]}:{})}});
  const telefone=/^\d{10,15}$/.test(sp.telefone||'')?sp.telefone:grupos[0]?.telefone;
  const [controles,usuarios,ultimas]=await Promise.all([
    prisma.whatsAppMensagem.findMany({where:{telefone:{in:[...new Set([...grupos.map(g=>g.telefone),...(telefone?[telefone]:[])])]},direcao:'sistema',origem:ORIGEM_KANBAN},orderBy:[{criadoEm:'desc'},{id:'desc'}],distinct:['telefone'],select:{id:true,telefone:true,corpo:true,criadoEm:true,direcao:true,origem:true,status:true}}),
    prisma.usuario.findMany({select:{id:true,username:true,nomeExibicao:true},orderBy:{username:'asc'}}),
    // Só leitura, uma linha por telefone: a última mensagem real (entrada/saída) para a prévia da lista.
    ultimasMensagensPorTelefone(grupos),
  ]);
  const pessoas=usuarios.map(u=>({id:u.id,nome:u.nomeExibicao||u.username}));
  const [mensagens,ultimaEntrada,cfg]=await Promise.all([
    telefone?prisma.whatsAppMensagem.findMany({where:{telefone,NOT:{direcao:'sistema',origem:ORIGEM_KANBAN}},orderBy:{criadoEm:'desc'},take:100}):Promise.resolve([]),
    telefone?prisma.whatsAppMensagem.findFirst({where:{telefone,direcao:'in'},orderBy:{criadoEm:'desc'},select:{criadoEm:true}}):Promise.resolve(null),
    prisma.config.findFirst({select:{whatsappPreAtendimento:true,whatsappTakeoverMinutos:true,whatsappProvider:true}}),
  ]);
  const nome=(t:string)=>identificarContato(t,clientes)?.nome||t;
  const contato=telefone?identificarContato(telefone,clientes):null;
  const cartoes=grupos.map(g=>{const c=controles.find(c=>c.telefone===g.telefone);const estado=c?lerEstadoKanban(c.corpo):null;return {telefone:g.telefone,nome:nome(g.telefone),ultimaMensagem:g._max.criadoEm?hora(g._max.criadoEm):'Sem data',revisao:c?.id??0,estado:estado??ESTADO_KANBAN_INICIAL,classificado:!!estado};});
  const controleSelecionado=controles.find(c=>c.telefone===telefone);
  const estadoSelecionado=controleSelecionado?lerEstadoKanban(controleSelecionado.corpo):null;
  const cartaoSelecionado=cartoes.find(c=>c.telefone===telefone)??(telefone&&mensagens.length?{telefone,nome:nome(telefone),ultimaMensagem:hora(mensagens[0].criadoEm),revisao:controleSelecionado?.id??0,estado:estadoSelecionado??ESTADO_KANBAN_INICIAL,classificado:!!estadoSelecionado}:null);
  const historicoExibido=[...mensagens,...controles.filter(c=>c.telefone===telefone)].sort((a,b)=>a.criadoEm.getTime()-b.criadoEm.getTime()||a.id-b.id);
  const controle=mensagens.find(m=>m.direcao==='sistema'&&['controle_pausa','controle_retomada'].includes(m.origem))||null;
  const inicio=inicioDaPausa(new Date(),cfg?.whatsappTakeoverMinutos||60,controle);
  const manual=inicio&&mensagens.find(m=>m.direcao==='out'&&m.origem==='manual'&&m.criadoEm>=inicio);
  const pediuHumano=inicio&&mensagens.some(m=>m.direcao==='in'&&m.criadoEm>=inicio&&/\b(atendente|humano|vendedor|sair|parar)\b/i.test(m.corpo));
  const escolha=mensagens.find(m=>m.direcao==='in'&&/^(sair|parar|voltar)$/i.test(m.corpo.trim()));
  const estadoAutomatico=cfg?.whatsappPreAtendimento!==2?'Automático gratuito desligado':!inicio?'Automático pausado pela equipe':escolha&&/^(sair|parar)$/i.test(escolha.corpo.trim())?'Cliente pediu para parar — aguardar VOLTAR':manual?`Pausa após resposta humana até ${hora(new Date(manual.criadoEm.getTime()+(cfg?.whatsappTakeoverMinutos||60)*60000))}`:pediuHumano||(contato?.atendimentoHumanoAt&&contato.atendimentoHumanoAt>=inicio)?'Pausa de atendimento humano ativa':'Automático gratuito disponível para assuntos previstos';
  const ultimaConversa=mensagens.find(m=>m.direcao==='in'||m.direcao==='out');
  const semResposta=ultimaConversa?.direcao==='in';
  const aberta=!!ultimaEntrada&&Date.now()-ultimaEntrada.criadoEm.getTime()<86_400_000;

  // --- apresentação (nada abaixo muda regra) ---
  const agora=new Date();
  const nomeEtapa=(id:string)=>ETAPAS_ATENDIMENTO.find(e=>e.id===id)?.nome??id;
  const itens:ItemConversa[]=grupos.map(g=>{
    const c=cartoes.find(c=>c.telefone===g.telefone);const u=ultimas.find(u=>u.telefone===g.telefone);
    return {telefone:g.telefone,nome:nome(g.telefone),hora:g._max.criadoEm?horaCurta(g._max.criadoEm,agora):'',previa:u?previaMensagem(u.direcao,u.corpo):'',aguardando:u?.direcao==='in',etapa:c?.estado.etapa??'novas',etapaNome:nomeEtapa(c?.estado.etapa??'novas'),responsavel:c?.estado.responsavelNome??'Não atribuído'};
  });
  const contagens:Record<string,number>={todas:itens.length,...Object.fromEntries(ETAPAS_ATENDIMENTO.map(e=>[e.id,itens.filter(i=>i.etapa===e.id).length]))};
  const itensVisiveis=etapaFiltro==='todas'?itens:itens.filter(i=>i.etapa===etapaFiltro);
  const fichaHref=telefone?`/crm/atendimento/ficha?telefone=${telefone}`:'';
  const oficial=cfg?.whatsappProvider==='meta_cloud';
  // Altura da primeira linha em telas largas: o chat rola por dentro, a página não.
  // (No sistema, abaixo de xl o contexto desce para uma segunda linha, de altura livre.)
  const altura=janela?'lg:grid-rows-[minmax(32rem,calc(100dvh-5.5rem))]':'lg:grid-rows-[minmax(40rem,calc(100dvh-10rem))]';
  const colunas=janela?'lg:grid-cols-[minmax(17rem,20rem)_minmax(0,1fr)_minmax(17rem,20rem)]':'lg:grid-cols-[minmax(15rem,17rem)_minmax(0,1fr)] xl:grid-cols-[minmax(15rem,16rem)_minmax(0,1fr)_minmax(16rem,17rem)]';
  const areas=[{href:'/crm/atendimento',nome:'Conversas',Icon:MessageSquare},{href:'/crm',nome:'Clientes',Icon:Users},{href:'/crm/relacionamento',nome:'Relacionamento',Icon:Users},{href:'/crm/campanhas',nome:'Campanhas',Icon:Megaphone},{href:'/crm/fidelidade',nome:'Fidelidade',Icon:Gift}];
  const sobre=<details className="text-xs text-muted-foreground"><summary className="min-h-9 cursor-pointer py-2">Sobre este histórico</summary><p className="mb-2 leading-relaxed">Conversas registradas no Manager desde a integração. Mensagens de outros aplicativos podem não aparecer aqui. Grupos continuam no WhatsApp Web.</p></details>;
  // "Organizar atendimento": cartão de formulário compacto. O <details> do OrganizarConversa (kanban.tsx) fica
  // porque o refresh de 30s depende de [data-kanban-editor][open]; aqui só se estiliza o cabeçalho dele.
  const organizar=cartaoSelecionado&&<div className="rounded-interno bg-poco p-3.5 text-sm [&_summary]:min-h-9 [&_summary]:text-sm [&>div]:mt-2.5 [&>div]:border-t [&>div]:border-divisoria [&>div]:pt-1.5"><h3 className="mb-2 text-sm font-semibold">Atendimento atual</h3><dl className="space-y-1.5 text-xs"><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Etapa</dt><dd className="font-medium">{nomeEtapa(cartaoSelecionado.estado.etapa)}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Responsável</dt><dd className="font-medium">{cartaoSelecionado.estado.responsavelNome}</dd></div><div className="flex justify-between gap-3"><dt className="shrink-0 text-muted-foreground">Próxima ação</dt><dd className="whitespace-pre-wrap break-words text-right font-medium">{cartaoSelecionado.estado.proximaAcao}</dd></div></dl><OrganizarConversa key={cartaoSelecionado.telefone} cartao={cartaoSelecionado} pessoas={pessoas}/></div>;

  const navAreas=<nav aria-label="Áreas do CRM" className="flex flex-wrap gap-1 rounded-controle border border-divisoria bg-controle p-1">{areas.map(({href,nome,Icon})=><Link key={href} href={href} aria-current={href==='/crm/atendimento'?'page':undefined} className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm ${href==='/crm/atendimento'?'bg-controle-ativo font-semibold text-foreground':'text-muted-foreground hover:text-foreground'}`}><Icon className="size-4" aria-hidden="true"/>{nome}</Link>)}</nav>;
  const cabecalho=janela
    ?<header className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-2 border-b border-divisoria bg-card px-4 py-2">
        <h1 className="flex items-center gap-2 font-display text-lg font-semibold"><span aria-hidden="true" className="flex size-8 items-center justify-center rounded-controle bg-primary text-primary-foreground"><MessageSquare className="size-4"/></span>WhatsApp BFX</h1>
        <SeloIntegracao oficial={oficial}/>
        <Link href={urlAtendimento(BASE_SISTEMA,{visao,telefone,q,etapa:etapaFiltro})} className="ml-auto inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">Voltar ao sistema</Link>
        <ThemeToggle/>
      </header>
    :<>
        <PageHeader title="Atendimento WhatsApp" description="Conversas recebidas pela integração oficial do 8250. Horários de Manaus." breadcrumbs={[{label:'CRM',href:'/crm'},{label:'Atendimento'}]} selo={<SeloIntegracao oficial={oficial}/>} actions={<div className="flex flex-wrap items-center justify-end gap-2">{navAreas}<AbrirEmNovaJanela telefone={visao==="lista"?telefone:undefined} visao={visao} q={q} etapa={etapaFiltro}/></div>}/>
      </>;

  const corpo=visao==='kanban'
    ?<div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><AlternarVisao base={base} visao={visao} q={q} telefone={telefone}/><div className="w-full max-w-sm"><BuscaConversas visao={visao} q={q} rotulo="Buscar conversas por nome ou telefone"/></div></div>
        <p className="text-xs text-muted-foreground">{grupos.length} conversa(s) exibida(s), até as 100 mais recentes. Contagens se referem a esta busca. Etapa do atendimento é independente da janela de envio.</p>
        <KanbanConversas cartoes={cartoes} pessoas={pessoas} busca={q} base={base}/>
      </div>
    :<div className={`grid gap-3 ${colunas} ${altura} lg:items-stretch lg:[&>*]:min-h-0`}>
        <ConversaLista itens={itensVisiveis} selecionado={telefone} base={base} busca={q} visao="lista" etapa={etapaFiltro} contagens={contagens}/>
        {telefone
          ?<ConversaChat telefone={telefone} nome={nome(telefone)} aberta={aberta} semResposta={semResposta} estadoAutomatico={estadoAutomatico} fichaHref={fichaHref} novaAba={janela}
              mensagens={historicoExibido.map(m=>({id:m.id,criadoEm:m.criadoEm,corpo:m.corpo,direcao:m.direcao,origem:m.origem,status:m.status}))} agora={agora}/>
          :<section aria-label="Conversa selecionada" className="order-1 flex min-h-64 items-center justify-center rounded-painel border border-painel-borda bg-card p-6 text-center dark:border-transparent text-muted-foreground lg:order-none">Aguardando mensagens recebidas pela integração.</section>}
        {telefone&&<aside aria-label="Contexto do cliente" className={`order-3 flex min-w-0 flex-col gap-3.5 overflow-y-auto rounded-painel border border-painel-borda bg-card px-2 pb-2 pt-4 dark:border-transparent lg:order-none ${janela?'':'lg:col-span-2 xl:col-span-1'}`}>
          <ContextoCliente clienteId={contato?.id??null} nome={nome(telefone)} fichaHref={fichaHref} novaAba={janela} organizar={organizar}/>
        </aside>}
      </div>;

  if(janela)return <div className="flex min-h-dvh flex-col bg-background">{cabecalho}<main className="flex-1 space-y-3 p-3 lg:p-4">{corpo}{sobre}</main></div>;
  return <div className="space-y-4">{cabecalho}{corpo}{sobre}</div>;
}
