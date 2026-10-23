import { evolutionConectada } from '@/lib/whatsapp-evolution-janela';
import { resolveWhatsAppProviders } from '@/lib/whatsapp-provider';
import { AreaVisivel } from './area-visivel';
import {disponibilidadeIa,respostasAutoLigadas,situacaoProvedor} from '@/lib/whatsapp-respostas-auto';
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
import {ORIGEM_KANBAN,ETAPAS_ATENDIMENTO,resumirUltimoTexto,lerEstadoKanban,ESTADO_KANBAN_INICIAL,SEM_RESPONSAVEL} from '@/lib/whatsapp-kanban';
import { ConversaLista, AlternarVisao, urlAtendimento, type ItemConversa } from './conversa-lista';
import { ConversaChat } from './conversa-chat';
import { calcularRetomaEm } from './quem-responde-regras';
import { AbrirEmNovaJanela, ROTA_JANELA } from './abrir-em-nova-janela';
import { ultimasMensagensPorTelefone } from '@/lib/whatsapp-ultimas';
import { naoRespondidasPorTelefone } from '@/lib/whatsapp-nao-respondidas';
import { PainelContato } from './painel-contato';
import { horaCurta, previaMensagem } from './status-mensagem';
import type { MidiaExibida } from './bolha-midia';
import type { ResumoCitado } from '@/lib/whatsapp-citacao-resumo';
import { previaDeMidia } from './previa-midia';
import { resolverCitacoes } from '@/lib/whatsapp-citacao';
import { nomeSeguro } from '@/lib/whatsapp-midia-politica';
import { processarPendentesDaConversa } from '@/lib/whatsapp-midia-download';

const BASE_SISTEMA='/crm/atendimento';
const hora=(d:Date)=>d.toLocaleString('pt-BR',{timeZone:'America/Manaus',dateStyle:'short',timeStyle:'short'});

/** `tipo` e `midia` só existem nas mensagens do histórico (os registros de controle do kanban não os trazem). */
const extraMidia=(m:object):{tipo?:string;midia?:MidiaExibida|null}=>({tipo:(m as {tipo?:string}).tipo,midia:(m as {midia?:MidiaExibida|null}).midia??null});
/** Citação resolvida em lote (uma consulta) e o wa_message_id, que habilita o botão Responder. */
const extraCitacao=(m:object,citacoes:Map<string,ResumoCitado>):{waMessageId?:string|null;citacao?:ResumoCitado|null}=>{const {waMessageId,respondeAWaId}=m as {waMessageId?:string|null;respondeAWaId?:string|null};return {waMessageId:waMessageId??null,citacao:respondeAWaId?citacoes.get(respondeAWaId)??null:null};};

export type ParametrosAtendimento={telefone?:string;q?:string;visao?:string;etapa?:string;painel?:string};

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
  const etapaFiltro=sp.etapa==='aguardando'||ETAPAS_ATENDIMENTO.some(e=>e.id===sp.etapa)?String(sp.etapa):'todas';
  const painel=sp.painel==='0'||sp.painel==='1'?sp.painel:undefined;
  // Celular: só mostra o chat se o telefone veio na URL (senão, a lista).
  const telefoneExplicito=/^\d{10,15}$/.test(sp.telefone||'');
  const clientes=await prisma.cliente.findMany({where:{telefone:{not:null}},select:{id:true,nome:true,telefone:true,atendimentoHumanoAt:true}});
  const normalizar=(t:string)=>t.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  const buscaNome=clientes.filter(c=>normalizar(c.nome).includes(normalizar(q)));
  const telefonesNome=buscaNome.flatMap(c=>variantesLocaisDeTelefone(c.telefone||'').map(t=>'55'+t));
  const digitos=q.replace(/[^\d]/g,'');
  const grupos=await prisma.whatsAppMensagem.groupBy({by:['telefone'],_max:{criadoEm:true},orderBy:{_max:{criadoEm:'desc'}},take:100,where:{direcao:{in:['in','out']},status:{not:'gerando'},...(q?{OR:[...(digitos?[{telefone:{contains:digitos}}]:[]),{telefone:{in:telefonesNome}}]}:{})}});
  const telefone=/^\d{10,15}$/.test(sp.telefone||'')?sp.telefone:grupos[0]?.telefone;
  // Abrir a conversa retoma os downloads de mídia pendentes/falhos. Dispara e segue: a tela não espera o
  // download (a bolha mostra "Carregando mídia…" e a atualização de 30s traz o resultado).
  if(telefone&&visao==='lista')void processarPendentesDaConversa(telefone).catch(()=>{});
  const [controles,usuarios,ultimas]=await Promise.all([
    prisma.whatsAppMensagem.findMany({where:{telefone:{in:[...new Set([...grupos.map(g=>g.telefone),...(telefone?[telefone]:[])])]},direcao:'sistema',origem:ORIGEM_KANBAN},orderBy:[{criadoEm:'desc'},{id:'desc'}],distinct:['telefone'],select:{id:true,telefone:true,corpo:true,criadoEm:true,direcao:true,origem:true,status:true}}),
    prisma.usuario.findMany({select:{id:true,username:true,nomeExibicao:true},orderBy:{username:'asc'}}),
    // Só leitura, uma linha por telefone: a última mensagem real (entrada/saída) para a prévia da lista.
    ultimasMensagensPorTelefone(grupos),
  ]);
  // Bolinha da lista: mensagens do cliente desde a última resposta da BFX (só nas conversas que aguardam).
  const naoRespondidas=await naoRespondidasPorTelefone(ultimas.filter(u=>u.direcao==='in').map(u=>u.telefone));
  const pessoas=usuarios.map(u=>({id:u.id,nome:u.nomeExibicao||u.username}));
  const [mensagens,ultimaEntrada,cfg]=await Promise.all([
    telefone?prisma.whatsAppMensagem.findMany({where:{telefone,status:{not:'gerando'},NOT:{direcao:'sistema',origem:ORIGEM_KANBAN}},orderBy:{criadoEm:'desc'},take:100,include:{midia:{select:{id:true,tipo:true,status:true,mime:true,tamanho:true,nomeExibicao:true,legenda:true,voz:true,animada:true,paginas:true,transcricao:true,onda:true}}}}).then(ms=>ms.map(m=>m.midia?{...m,midia:{...m.midia,nomeExibicao:m.midia.nomeExibicao?nomeSeguro(m.midia.nomeExibicao):null,onda:m.midia.onda?Array.from(m.midia.onda):null}}:m)):Promise.resolve([]),
    telefone?prisma.whatsAppMensagem.findFirst({where:{telefone,direcao:'in',OR:[{provedor:null},{provedor:'meta_cloud'}]},orderBy:{criadoEm:'desc'},select:{criadoEm:true}}):Promise.resolve(null),
    prisma.config.findFirst({select:{whatsappPreAtendimento:true,whatsappAutoEnabled:true,whatsappTakeoverMinutos:true,whatsappProvider:true,metaWhatsappToken:true,metaWhatsappPhoneNumberId:true,litellmUrl:true,litellmKey:true,litellmModel:true}}),
  ]);
  const citacoes=telefone?await resolverCitacoes(telefone,mensagens):new Map<string,ResumoCitado>();
  const nome=(t:string)=>identificarContato(t,clientes)?.nome||t;
  const contato=telefone?identificarContato(telefone,clientes):null;
  const textoDe=(t:string)=>{const u=ultimas.find(u=>u.telefone===t);return u?resumirUltimoTexto(u.corpo)||undefined:undefined;};
  const cartoes=grupos.map(g=>{const c=controles.find(c=>c.telefone===g.telefone);const estado=c?lerEstadoKanban(c.corpo):null;return {telefone:g.telefone,nome:nome(g.telefone),ultimaMensagem:g._max.criadoEm?hora(g._max.criadoEm):'Sem data',revisao:c?.id??0,estado:estado??ESTADO_KANBAN_INICIAL,classificado:!!estado,ultimoTexto:textoDe(g.telefone)};});
  const controleSelecionado=controles.find(c=>c.telefone===telefone);
  const estadoSelecionado=controleSelecionado?lerEstadoKanban(controleSelecionado.corpo):null;
  const cartaoSelecionado=cartoes.find(c=>c.telefone===telefone)??(telefone&&mensagens.length?{telefone,nome:nome(telefone),ultimaMensagem:hora(mensagens[0].criadoEm),revisao:controleSelecionado?.id??0,estado:estadoSelecionado??ESTADO_KANBAN_INICIAL,classificado:!!estadoSelecionado,ultimoTexto:resumirUltimoTexto(mensagens[0].corpo)||undefined}:null);
  const historicoExibido=[...mensagens,...controles.filter(c=>c.telefone===telefone)].sort((a,b)=>a.criadoEm.getTime()-b.criadoEm.getTime()||a.id-b.id);
  const controle=mensagens.find(m=>m.direcao==='sistema'&&['controle_pausa','controle_retomada'].includes(m.origem))||null;
  const inicio=inicioDaPausa(new Date(),cfg?.whatsappTakeoverMinutos||60,controle);
  const manual=inicio&&mensagens.find(m=>m.direcao==='out'&&m.origem==='manual'&&m.criadoEm>=inicio);
  const pediuHumano=inicio&&mensagens.some(m=>m.direcao==='in'&&m.criadoEm>=inicio&&/\b(atendente|humano|vendedor|sair|parar)\b/i.test(m.corpo));
  const escolha=mensagens.find(m=>m.direcao==='in'&&/^(sair|parar|voltar)$/i.test(m.corpo.trim()));
  const clienteParou=!!escolha&&/^(sair|parar)$/i.test(escolha.corpo.trim());
  const automaticoLigado=respostasAutoLigadas(cfg)&&cfg?.whatsappAutoEnabled===1&&situacaoProvedor(cfg,process.env)==='ok';
  const estadoAutomatico=!automaticoLigado?'Respostas automáticas desligadas':!inicio?'Automático pausado pela equipe':clienteParou?'Cliente pediu para parar — aguardar VOLTAR':manual?`Pausa após resposta humana até ${hora(new Date(manual.criadoEm.getTime()+(cfg?.whatsappTakeoverMinutos||60)*60000))}`:pediuHumano||(contato?.atendimentoHumanoAt&&contato.atendimentoHumanoAt>=inicio)?'Pausa de atendimento humano ativa':(disponibilidadeIa(cfg,process.env).disponivel?'Respostas automáticas ativas · IA':'Respostas automáticas ativas · regras');
  // Quando a pausa por resposta humana acaba (o automático volta sozinho); sem prazo nas outras pausas.
  const retomaEm=calcularRetomaEm({automaticoLigado,pausaAtiva:!!inicio,clienteParou,manualEm:manual?manual.criadoEm:null,minutos:cfg?.whatsappTakeoverMinutos||60});
  const janelaAte=ultimaEntrada?new Date(ultimaEntrada.criadoEm.getTime()+86_400_000).toISOString():null;
  const ultimaConversa=mensagens.find(m=>m.direcao==='in'||m.direcao==='out');
  const semResposta=ultimaConversa?.direcao==='in';
  const aberta=!!ultimaEntrada&&Date.now()-ultimaEntrada.criadoEm.getTime()<86_400_000;

  // --- apresentação (nada abaixo muda regra) ---
  const agora=new Date();
  const nomeEtapa=(id:string)=>ETAPAS_ATENDIMENTO.find(e=>e.id===id)?.nome??id;
  const itens:ItemConversa[]=grupos.map(g=>{
    const c=cartoes.find(c=>c.telefone===g.telefone);const u=ultimas.find(u=>u.telefone===g.telefone);
    return {telefone:g.telefone,nome:nome(g.telefone),hora:g._max.criadoEm?horaCurta(g._max.criadoEm,agora):'',previa:u?previaMensagem(u.direcao,u.corpo):'',previaMidia:u?previaDeMidia(u.tipo,u.corpo):null,voce:u?.direcao==='out',aguardando:u?.direcao==='in',naoRespondidas:naoRespondidas.get(g.telefone)??0,tique:u?.direcao==='out'?u.status:null,etapa:c?.estado.etapa??'novas',etapaNome:nomeEtapa(c?.estado.etapa??'novas'),responsavel:c?.estado.responsavelNome??SEM_RESPONSAVEL};
  });
  const contagens:Record<string,number>={todas:itens.length,aguardando:itens.filter(i=>i.aguardando).length,...Object.fromEntries(ETAPAS_ATENDIMENTO.map(e=>[e.id,itens.filter(i=>i.etapa===e.id).length]))};
  const itensVisiveis=etapaFiltro==='todas'?itens:etapaFiltro==='aguardando'?itens.filter(i=>i.aguardando):itens.filter(i=>i.etapa===etapaFiltro);
  const fichaHref=telefone?`/crm/atendimento/ficha?telefone=${telefone}`:'';
  const oficial=cfg?.whatsappProvider==='meta_cloud';
  const evolutionDisponivel=!!await evolutionConectada(await resolveWhatsAppProviders());
  // A área da tela é um contêiner: as colunas respondem à largura DELA (a sidebar come espaço no sistema
  // e não existe na janela), não à da viewport. < 48rem lista OU chat; >= 48rem lista + chat; >= 80rem + painel.
  // A lista mede o espaço real do shell; só lista e mensagens rolam, com o composer visível.
  // No celular, com uma conversa aberta, o cabeçalho da página some.
  const chatCheio=!janela&&visao==='lista'&&telefoneExplicito;
  // Na janela a altura vem do flex (coluna h-dvh com overflow-hidden): sem compensação fixa do cabeçalho.

  // Quadro na rota normal: o contêiner recorta o preenchimento negativo (`flow-root overflow-clip`), senão a caixa
  // h-dvh vaza do shell e a página rola além das listas. O 65 cobre cabeçalho + moldura do shell no xl.
  const alturaKanban='h-dvh -mb-67 pb-67 xl:-mb-65 xl:pb-65';
  const hrefJanela=janela?undefined:urlAtendimento(ROTA_JANELA,{visao:'lista',telefone,q,etapa:etapaFiltro,painel});
  const areas=[{href:'/crm/atendimento',nome:'Conversas',Icon:MessageSquare},{href:'/crm',nome:'Clientes',Icon:Users},{href:'/crm/relacionamento',nome:'Relacionamento',Icon:Users},{href:'/crm/campanhas',nome:'Campanhas',Icon:Megaphone},{href:'/crm/fidelidade',nome:'Fidelidade',Icon:Gift}];
  // "Organizar atendimento": formulário sempre aberto no painel de dados do contato (como no artboard).
  // Pausa o refresh de 30s só enquanto há alteração não salva (data-sujo, ver refresh-regras.ts).
  const organizar=cartaoSelecionado&&<section aria-label="Atendimento"><OrganizarConversa key={cartaoSelecionado.telefone} cartao={cartaoSelecionado} pessoas={pessoas} aberto/></section>;

  const navAreas=<nav aria-label="Áreas do CRM" className="flex flex-wrap gap-1 rounded-controle border border-divisoria bg-controle p-1">{areas.map(({href,nome,Icon})=><Link key={href} href={href} aria-current={href==='/crm/atendimento'?'page':undefined} className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm ${href==='/crm/atendimento'?'bg-controle-ativo font-semibold text-foreground':'text-muted-foreground hover:text-foreground'}`}><Icon className="size-4" aria-hidden="true"/>{nome}</Link>)}</nav>;
  const cabecalho=janela
    ?<header className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-2 border-b border-divisoria bg-card px-4 py-2">
        <h1 className="flex items-center gap-2 font-display text-lg font-semibold"><span aria-hidden="true" className="flex size-8 items-center justify-center rounded-controle bg-primary text-primary-foreground"><MessageSquare className="size-4"/></span>WhatsApp BFX</h1>
        <AlternarVisao base={base} visao={visao} q={q} telefone={telefone} variante="cabecalho"/>
        <SeloIntegracao oficial={oficial}/>
        <Link href={urlAtendimento(BASE_SISTEMA,{visao,telefone,q,etapa:etapaFiltro})} className="ml-auto inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">Voltar ao sistema</Link>
        <ThemeToggle/>
      </header>
    :<>
        <PageHeader title="Atendimento WhatsApp" description="Conversas recebidas pela integração oficial do 8250. Horários de Manaus." breadcrumbs={[{label:'CRM',href:'/crm'},{label:'Atendimento'}]} selo={<SeloIntegracao oficial={oficial}/>} actions={<div className="flex flex-wrap items-center justify-end gap-2">{navAreas}</div>}/>
      </>;

  const corpo=visao==='kanban'
    ?<div className={janela?'flex min-h-0 flex-1 flex-col gap-3':`flex flex-col gap-3 ${alturaKanban}`}>
        {!janela&&<div className="flex flex-none flex-wrap items-center justify-between gap-3"><AlternarVisao base={base} visao={visao} q={q} telefone={telefone}/><AbrirEmNovaJanela visao={visao} q={q} etapa={etapaFiltro}/></div>}
        <KanbanConversas cartoes={cartoes} pessoas={pessoas} busca={q} base={base}/>
      </div>
    :<AreaVisivelLista janela={janela}>
        <div className="flex h-full min-h-0 gap-3">
        <ConversaLista itens={itensVisiveis} selecionado={telefone} base={base} busca={q} visao="lista" etapa={etapaFiltro} contagens={contagens} painel={painel} telefoneExplicito={telefoneExplicito} semAlternar={janela}/>
        {telefone
          ?<ConversaChat telefone={telefone} nome={nome(telefone)} aberta={aberta} semResposta={semResposta} estadoAutomatico={estadoAutomatico} retomaEm={retomaEm} janelaAte={janelaAte} evolutionDisponivel={evolutionDisponivel} envioIndisponivel={!oficial&&!evolutionDisponivel} fichaHref={fichaHref} novaAba={janela}
              telefoneExplicito={telefoneExplicito} urlLista={urlAtendimento(base,{visao:'lista',q,etapa:etapaFiltro,painel})} hrefJanela={hrefJanela}
              mensagens={historicoExibido.map(m=>({id:m.id,criadoEm:m.criadoEm,corpo:m.corpo,direcao:m.direcao,origem:m.origem,status:m.status,erroMsg:(m as {erroMsg?:string|null}).erroMsg,...extraMidia(m),...extraCitacao(m,citacoes)}))} agora={agora}/>
          :<section aria-label="Conversa selecionada" className="hidden min-h-0 flex-1 items-center justify-center rounded-painel border border-painel-borda bg-card p-6 text-center text-muted-foreground @xl:flex dark:border-transparent">Aguardando mensagens recebidas pela integração.</section>}
        {telefone&&<PainelContato painel={painel}>
          <ContextoCliente clienteId={contato?.id??null} nome={nome(telefone)} telefone={telefone} fichaHref={fichaHref} novaAba={janela} organizar={organizar}/>
        </PainelContato>}
        </div>
      </AreaVisivelLista>;

  if(janela)return <div className="flex h-dvh flex-col overflow-hidden bg-background">{cabecalho}<main className={`flex min-h-0 flex-1 flex-col overflow-hidden p-3 lg:p-4`}>{corpo}</main></div>;
  return <div className={visao==='kanban'?'flow-root space-y-4 overflow-clip':'space-y-4'}><div className={chatCheio?'hidden md:block':undefined}>{cabecalho}</div>{corpo}</div>;
}

function AreaVisivelLista({janela,children}:{janela:boolean;children:React.ReactNode}) {
  return janela ? <div data-atendimento-raiz className="@container min-h-0 flex-1">{children}</div> : <AreaVisivel>{children}</AreaVisivel>;
}
