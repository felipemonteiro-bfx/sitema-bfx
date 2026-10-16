// Tarefa M do redesign: Atendimento WhatsApp com o funcionamento e a anatomia do WhatsApp Web
// (ideia, não marca). Funções puras + marcação estática; o vitest roda em `node`, sem jsdom.
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
vi.stubGlobal('React',React);
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn(),replace:vi.fn(),push:vi.fn()}),usePathname:()=>'/crm/atendimento',useSearchParams:()=>new URLSearchParams()}));
vi.mock('@/app/(app)/crm/atendimento/actions',()=>({responderConversa:vi.fn(),controlarAutomatico:vi.fn()}));
import {rotuloDia,contarNaoRespondidas,rotuloContagem} from '@/app/(app)/crm/atendimento/status-mensagem';
import {agruparMensagens} from '@/app/(app)/crm/atendimento/agrupar-mensagens';
import {acaoDaTecla,termoDeBarra,filtrarProntas,PRONTAS} from '@/app/(app)/crm/atendimento/composer-regras';
import {painelAberto,proximoPainel,visaoMobile,estaNoFim} from '@/app/(app)/crm/atendimento/layout-regras';
import {ConversaLista,urlAtendimento} from '@/app/(app)/crm/atendimento/conversa-lista';
import {ConversaChat} from '@/app/(app)/crm/atendimento/conversa-chat';
import {Bolha} from '@/app/(app)/crm/atendimento/bolha';
import {Reply} from '@/app/(app)/crm/atendimento/reply';
import {PainelContato} from '@/app/(app)/crm/atendimento/painel-contato';

const Painel=PainelContato as React.FC<{painel?:string;children?:React.ReactNode}>;
const ATEND=path.resolve(__dirname,'..','app/(app)/crm/atendimento');
const ler=(f:string)=>fs.readFileSync(path.join(ATEND,f),'utf8');
const msg=(id:number,iso:string,direcao:string,extra:object={})=>({id,criadoEm:new Date(iso),corpo:'oi',direcao,origem:'manual',status:'enviado',...extra});

describe('M3: separador de data (rotuloDia)',()=>{
 const agora=new Date('2026-10-16T15:00:00Z');
 it('Hoje, Ontem, dia da semana (2 a 6 dias) e data completa',()=>{
  expect(rotuloDia(new Date('2026-10-16T12:00:00Z'),agora)).toBe('Hoje');
  expect(rotuloDia(new Date('2026-10-15T12:00:00Z'),agora)).toBe('Ontem');
  expect(rotuloDia(new Date('2026-10-12T12:00:00Z'),agora)).toBe('seg');
  expect(rotuloDia(new Date('2026-10-10T12:00:00Z'),agora)).toBe('sáb');
  expect(rotuloDia(new Date('2026-10-09T12:00:00Z'),agora)).toBe('09/10/2026');
 });
});

describe('M3: agrupamento de mensagens',()=>{
 const agora=new Date('2026-10-16T15:00:00Z');
 const itens=(ms:ReturnType<typeof msg>[])=>agruparMensagens(ms,agora).flatMap(d=>d.itens);
 it('mesmo lado a menos de 5 min forma grupo; só a primeira abre o grupo (cauda)',()=>{
  const r=itens([msg(1,'2026-10-16T14:00:00Z','in'),msg(2,'2026-10-16T14:02:00Z','in'),msg(3,'2026-10-16T14:04:30Z','in')]);
  expect(r.map(i=>i.inicioGrupo)).toEqual([true,false,false]);
 });
 it('5 min ou mais, ou lado diferente, quebra o grupo',()=>{
  const r=itens([msg(1,'2026-10-16T14:00:00Z','in'),msg(2,'2026-10-16T14:05:00Z','in'),msg(3,'2026-10-16T14:06:00Z','out'),msg(4,'2026-10-16T14:07:00Z','out')]);
  expect(r.map(i=>i.inicioGrupo)).toEqual([true,true,true,false]);
 });
 it('a diferença conta da mensagem anterior, não da primeira do grupo',()=>{
  const r=itens([msg(1,'2026-10-16T14:00:00Z','in'),msg(2,'2026-10-16T14:04:00Z','in'),msg(3,'2026-10-16T14:08:00Z','in')]);
  expect(r.map(i=>i.inicioGrupo)).toEqual([true,false,false]);
 });
 it('mudança de dia (Manaus) quebra o grupo e abre outro separador',()=>{
  const dias=agruparMensagens([msg(1,'2026-10-15T14:00:00Z','in'),msg(2,'2026-10-16T14:01:00Z','in')],agora);
  expect(dias.map(d=>d.rotulo)).toEqual(['Ontem','Hoje']);
  expect(dias[1].itens[0].inicioGrupo).toBe(true);
 });
 it('registro interno quebra o grupo e é do tipo sistema',()=>{
  const r=itens([msg(1,'2026-10-16T14:00:00Z','in'),msg(2,'2026-10-16T14:01:00Z','sistema'),msg(3,'2026-10-16T14:02:00Z','in')]);
  expect(r.map(i=>i.tipo)).toEqual(['msg','sistema','msg']);
  expect(r[2].inicioGrupo).toBe(true);
 });
});

describe('M1: mensagens do cliente sem resposta',()=>{
 it('conta só as entradas depois da última saída da BFX',()=>{
  const e=[new Date('2026-10-16T10:00:00Z'),new Date('2026-10-16T11:00:00Z'),new Date('2026-10-16T12:00:00Z')];
  expect(contarNaoRespondidas(e,new Date('2026-10-16T10:30:00Z'))).toBe(2);
  expect(contarNaoRespondidas(e,null)).toBe(3);
  expect(contarNaoRespondidas(e,new Date('2026-10-16T13:00:00Z'))).toBe(0);
 });
 it('rótulo da bolinha limita em 99+',()=>{expect(rotuloContagem(3)).toBe('3');expect(rotuloContagem(150)).toBe('99+');});
});

describe('M4: Enter envia, Shift+Enter quebra, IME não envia',()=>{
 it('Enter sozinho envia',()=>expect(acaoDaTecla({key:'Enter',shiftKey:false,isComposing:false})).toBe('enviar'));
 it('Shift+Enter não envia (quebra linha)',()=>expect(acaoDaTecla({key:'Enter',shiftKey:true,isComposing:false})).toBe('nada'));
 it('composição (IME) não envia',()=>{
  expect(acaoDaTecla({key:'Enter',shiftKey:false,isComposing:true})).toBe('nada');
  expect(acaoDaTecla({key:'Enter',shiftKey:false,isComposing:false,keyCode:229})).toBe('nada');
 });
 it('outras teclas não enviam',()=>expect(acaoDaTecla({key:'a',shiftKey:false,isComposing:false})).toBe('nada'));
});

describe('M4: "/" abre as respostas prontas e filtra, sem enviar',()=>{
 it('termoDeBarra só vale com "/" no início e sem espaço',()=>{
  expect(termoDeBarra('/')).toBe('');expect(termoDeBarra('/bo')).toBe('bo');
  expect(termoDeBarra('oi /bo')).toBeNull();expect(termoDeBarra('/bo ola')).toBeNull();expect(termoDeBarra('')).toBeNull();
 });
 it('filtra por título ou texto, sem acento e sem caixa; as 6 respostas de sempre',()=>{
  expect(PRONTAS).toHaveLength(6);
  expect(filtrarProntas(PRONTAS,'').length).toBe(6);
  expect(filtrarProntas(PRONTAS,'BOAS').map(p=>p.titulo)).toEqual(['Boas-vindas']);
  expect(filtrarProntas(PRONTAS,'comprovante').map(p=>p.titulo)).toEqual(['Conferir pagamento']);
  expect(filtrarProntas(PRONTAS,'zzzz')).toEqual([]);
 });
 it('o componente trata "/" no onChange e escolher só preenche o campo (nunca chama a action)',()=>{
  const f=ler('reply.tsx');
  expect(f).toContain('termoDeBarra');
  const escolher=f.split('function escolher')[1].split('\n }')[0];
  expect(escolher).not.toContain('responderConversa');
 });
});

describe('M5/M6: painel de dados e mobile',()=>{
 it('painelAberto: fechado por padrão em qualquer largura; só ?painel=1 abre',()=>{
  expect(painelAberto(undefined)).toBe(false);expect(painelAberto(null)).toBe(false);
  expect(painelAberto('0')).toBe(false);expect(painelAberto('1')).toBe(true);
 });
 it('proximoPainel alterna a partir do estado efetivo',()=>{
  expect(proximoPainel(undefined)).toBe('1');expect(proximoPainel('0')).toBe('1');expect(proximoPainel('1')).toBe('0');
 });
 it('visaoMobile: com telefone escolhido mostra o chat; sem, a lista',()=>{
  expect(visaoMobile(true)).toBe('chat');expect(visaoMobile(false)).toBe('lista');
 });
 it('urlAtendimento carrega ?painel=0 e descarta o valor padrão',()=>{
  expect(urlAtendimento('/x',{visao:'lista',telefone:'5592900000001',painel:'0'})).toContain('painel=0');
  expect(urlAtendimento('/x',{visao:'lista'})).not.toContain('painel');
 });
 it('PainelContato: sem ?painel (padrão) ou com 0 não renderiza o conteúdo; ?painel=1 abre em <aside> com rótulo, id e botão de fechar',()=>{
  const el=(p?:string)=>renderToStaticMarkup(React.createElement(Painel,{painel:p},React.createElement('p',null,'DADOS')));
  expect(el(undefined)).not.toContain('DADOS');expect(el('0')).not.toContain('DADOS');
  const aberto=el('1');
  expect(aberto).toContain('DADOS');expect(aberto).toContain('aria-label="Dados do contato"');expect(aberto).toContain('id="painel-contato"');
  expect(aberto).toContain('aria-label="Fechar dados do contato"');expect(aberto).toContain('@7xl:flex');
 });
 it('o nome/avatar do cabeçalho é um button com aria-expanded e aria-controls',()=>{
  const f=ler('painel-contato.tsx');
  expect(f).toContain('aria-expanded={aberto}');expect(f).toContain('aria-controls="painel-contato"');expect(f).toContain("'Escape'");
 });
 it('estaNoFim: folga de 80px conta como "no fim"',()=>{
  expect(estaNoFim(1000,520,400)).toBe(false);expect(estaNoFim(1000,560,400)).toBe(true);expect(estaNoFim(1000,600,400)).toBe(true);
 });
});

const itens=[
 {telefone:'5592900000001',nome:'Ana Souza',hora:'14:32',previa:'Tem a lavadora?',aguardando:true,naoRespondidas:3,tique:null,etapa:'em_atendimento',etapaNome:'Em atendimento',responsavel:'Jakeline'},
 {telefone:'5592900000002',nome:'Bruno Lima',hora:'ontem',previa:'Você: Combinado',aguardando:false,naoRespondidas:0,tique:'lido',etapa:'novas',etapaNome:'Novas',responsavel:'Não atribuído'},
];
const propsLista={itens,selecionado:'5592900000001',base:'/crm/atendimento',busca:'',visao:'lista',etapa:'todas',contagens:{todas:2,aguardando:1,em_atendimento:1,novas:1},telefoneExplicito:true};

describe('M1: lista no estilo WhatsApp Web',()=>{
 const html=renderToStaticMarkup(React.createElement(ConversaLista,propsLista));
 it('avatar de 48px, sem card por item e divisória que começa depois do avatar',()=>{
  expect(html).toContain('size-12');expect(html).not.toContain('size-11 shrink-0');
  expect(html).not.toMatch(/<a[^>]*rounded-controle[^>]*p-3/);
  expect(html).toContain('border-divisoria');
 });
 it('bolinha verde com o número de mensagens sem resposta; hora em verde só quando aguarda',()=>{
  expect(html).toMatch(/aria-label="3 mensagens sem resposta"/);
  expect(html).toContain('>3<');
  expect(html).toContain('text-marca-tint-texto');
 });
 it('tique na prévia quando a última é da BFX',()=>{expect(html).toMatch(/aria-label="Lida"/);});
 it('filtro "Aguardando resposta" ao lado de Todas, e a busca em pílula',()=>{
  expect(html).toContain('Aguardando resposta');expect(html).toContain('etapa=aguardando');
  expect(html).toContain('rounded-full');
 });
 it('mobile: com telefone escolhido a lista some (<lg); sem, a lista aparece',()=>{
  expect(html).toContain('hidden @xl:flex');
  const sem=renderToStaticMarkup(React.createElement(ConversaLista,{...propsLista,telefoneExplicito:false}));
  expect(sem).not.toContain('hidden @xl:flex');
 });
});

describe('M2: cabeçalho do chat',()=>{
 const base={telefone:'5592900000001',nome:'Ana Souza',aberta:true,semResposta:false,estadoAutomatico:'Automático gratuito disponível para assuntos previstos',fichaHref:'/crm/atendimento/ficha?telefone=5592900000001',mensagens:[msg(1,'2026-10-16T14:00:00Z','in'),msg(2,'2026-10-16T14:01:00Z','out')],agora:new Date('2026-10-16T15:00:00Z'),telefoneExplicito:true,urlLista:'/crm/atendimento?visao=lista',hrefJanela:'/crm/atendimento/janela?visao=lista'};
 const html=renderToStaticMarkup(React.createElement(ConversaChat,base));
 it('subtítulo com telefone mono e estado da janela',()=>{
  expect(html).toContain('+5592900000001');expect(html).toContain('janela aberta');
  expect(renderToStaticMarkup(React.createElement(ConversaChat,{...base,aberta:false}))).toContain('aguardando cliente');
 });
 it('ícones do cabeçalho são ghost icon com aria-label',()=>{
  expect(html).toMatch(/aria-label="Abrir ficha do cliente"/);
  expect(html).toMatch(/aria-label="(Mostrar|Ocultar) dados do contato"/);
  expect(html).toMatch(/aria-label="Abrir em nova janela/);
 });
 it('botão voltar para a lista no celular (lg:hidden) e chat oculto sem telefone escolhido',()=>{
  expect(html).toContain('aria-label="Voltar para a lista de conversas"');
  expect(renderToStaticMarkup(React.createElement(ConversaChat,{...base,telefoneExplicito:false}))).toContain('hidden @xl:flex');
 });
 it('mensagens agrupadas em seções por dia com separador sticky',()=>{
  expect(html).toContain('sticky');expect(html).toContain('>Hoje<');
 });
});

describe('M3: bolha',()=>{
 const em=(direcao:string,inicioGrupo:boolean,extra={})=>renderToStaticMarkup(React.createElement(Bolha,{m:msg(1,'2026-10-16T14:00:00Z',direcao,extra),inicioGrupo}));
 it('só a primeira do grupo tem cauda; as seguintes têm 2px de espaço',()=>{
  expect(em('out',true)).toContain('data-cauda');
  expect(em('out',false)).not.toContain('data-cauda');
  expect(em('out',true)).toContain('mt-3');expect(em('out',false)).toContain('mt-0.5');
 });
 it('hora e tique dentro da bolha, no canto, com espaçador invisível no texto',()=>{
  const h=em('out',true);
  expect(h).toContain('absolute');expect(h).toContain('aria-hidden="true"');expect(h).toMatch(/aria-label="Aceita pela Meta; entrega não confirmada"/);
 });
 it('tique cinza duplo (entregue), verde duplo (lido), relógio (pendente) e erro com rótulo',()=>{
  expect(em('out',true,{status:'entregue'})).toContain('text-muted-foreground');
  expect(em('out',true,{status:'lido'})).toContain('text-marca-tint-texto');
  expect(em('out',true,{status:'pendente'})).toMatch(/lucide-clock/);
  expect(em('out',true,{status:'falhou'})).toContain('Falhou');
 });
 it('registro interno é pílula central discreta com o texto de sempre',()=>{
  const s=em('sistema',true,{origem:'x',corpo:'Etapa alterada'});
  expect(s).toContain('Registro interno');expect(s).toContain('justify-center');expect(s).toContain('rounded-full');
 });
});

describe('M4: composer em uma barra',()=>{
 const html=renderToStaticMarkup(React.createElement(Reply,{telefone:'5592900000001',aberta:true,estadoAutomatico:'Automático gratuito disponível para assuntos previstos'}));
 it('botão de respostas prontas, campo em pílula e enviar redondo',()=>{
  expect(html).toMatch(/aria-label="Respostas prontas"/);
  expect(html).toContain('rounded-full');expect(html).toMatch(/aria-label="Enviar mensagem"/);
 });
 it('banner do assistente com os DOIS botões sempre visíveis',()=>{
  expect(html).toContain('Assumir conversa');expect(html).toContain('Retomar automático');
 });
 it('contador só aparece perto do limite',()=>{
  expect(html).not.toContain('/4096');
  expect(ler('reply.tsx')).toContain('3500');
 });
 it('Enter/Shift+Enter e composição passam por acaoDaTecla; o aviso de tarifa continua no texto',()=>{
  const f=ler('reply.tsx');
  expect(f).toContain('acaoDaTecla');expect(f).toContain('onKeyDown');
  expect(f).toContain('templates com tarifa');
 });
});

describe('M2/M5: a janela própria segue as mesmas telas',()=>{
 it('página da janela reutiliza TelaAtendimento em modo janela',()=>{
  const j=fs.readFileSync(path.resolve(__dirname,'..','app/(janela)/crm/atendimento/janela/page.tsx'),'utf8');
  expect(j).toContain('modo="janela"');
 });
});
