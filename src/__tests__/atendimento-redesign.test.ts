import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
vi.stubGlobal('React',React);
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()})}));
vi.mock('@/app/(app)/crm/atendimento/actions',()=>({responderConversa:vi.fn(),controlarAutomatico:vi.fn()}));
vi.mock('@/app/(app)/crm/atendimento/kanban-actions',()=>({salvarOrganizacaoConversa:vi.fn()}));
import {statusTique,iniciais,horaCurta,rotuloDia,previaMensagem} from '@/app/(app)/crm/atendimento/status-mensagem';
import {Bolha} from '@/app/(app)/crm/atendimento/bolha';
import {ConversaLista} from '@/app/(app)/crm/atendimento/conversa-lista';
import {Reply} from '@/app/(app)/crm/atendimento/reply';
import {AbrirEmNovaJanela} from '@/app/(app)/crm/atendimento/abrir-em-nova-janela';
import {ESTADO_KANBAN_INICIAL} from '@/lib/whatsapp-kanban';

const RAIZ=path.resolve(__dirname,'..','app');
const ler=(rel:string)=>fs.readFileSync(path.join(RAIZ,rel),'utf8');

describe('mapeamento de status para tique',()=>{
 it('pendente e enviado mostram um tique cinza',()=>{
  expect(statusTique('pendente')).toMatchObject({tique:'um',tom:'neutro',rotulo:'Pendente de confirmação'});
  expect(statusTique('enviado')).toMatchObject({tique:'um',tom:'neutro',rotulo:'Aceita pela Meta; entrega não confirmada'});
 });
 it('entregue são dois tiques cinza e lido dois tiques verdes',()=>{
  expect(statusTique('entregue')).toMatchObject({tique:'dois',tom:'neutro',rotulo:'Entregue'});
  expect(statusTique('lido')).toMatchObject({tique:'dois',tom:'marca',rotulo:'Lida'});
 });
 it('falhou vira erro com texto, e status desconhecido não inventa entrega',()=>{
  expect(statusTique('falhou')).toMatchObject({tique:'erro',tom:'erro',rotulo:'Falhou'});
  expect(statusTique('qualquer')).toMatchObject({tique:'um',tom:'neutro',rotulo:'qualquer'});
 });
});

describe('auxiliares de exibição',()=>{
 it('iniciais usam até duas palavras e caem para # em telefone',()=>{
  expect(iniciais('Ana Maria Souza')).toBe('AM');
  expect(iniciais('joão')).toBe('J');
  expect(iniciais('5592999990000')).toBe('#');
 });
 it('hora curta: hoje HH:mm, ontem, dia da semana e data (fuso de Manaus)',()=>{
  const agora=new Date('2026-10-16T18:00:00Z'); // 14:00 em Manaus
  expect(horaCurta(new Date('2026-10-16T18:32:00Z'),agora)).toBe('14:32');
  expect(horaCurta(new Date('2026-10-15T15:00:00Z'),agora)).toBe('ontem');
  expect(horaCurta(new Date('2026-10-13T15:00:00Z'),agora)).toBe('ter');
  expect(horaCurta(new Date('2026-09-01T15:00:00Z'),agora)).toBe('01/09');
  // 02:00 UTC de 16/10 ainda é 15/10 à noite em Manaus
  expect(horaCurta(new Date('2026-10-16T02:00:00Z'),agora)).toBe('ontem');
 });
 it('rótulo do separador de dia',()=>{
  const agora=new Date('2026-10-16T18:00:00Z');
  expect(rotuloDia(new Date('2026-10-16T12:00:00Z'),agora)).toBe('Hoje');
  expect(rotuloDia(new Date('2026-10-15T12:00:00Z'),agora)).toBe('Ontem');
  expect(rotuloDia(new Date('2026-09-01T12:00:00Z'),agora)).toBe('01/09/2026');
 });
 it('prévia prefixa Você: nas saídas e corta mensagem longa',()=>{
  expect(previaMensagem('out','Olá')).toBe('Você: Olá');
  expect(previaMensagem('in','Olá')).toBe('Olá');
  expect(previaMensagem('in','a'.repeat(300)).length).toBeLessThanOrEqual(121);
 });
});

describe('bolha',()=>{
 const base={id:1,criadoEm:new Date('2026-10-16T18:00:00Z'),corpo:'Mensagem',origem:'manual',status:'lido'};
 it('mensagem enviada leva tique com aria-label do status e fica à direita',()=>{
  const html=renderToStaticMarkup(React.createElement(Bolha,{m:{...base,direcao:'out'}}));
  expect(html).toContain('role="img"');expect(html).toContain('aria-label="Lida"');expect(html).toContain('justify-end');
 });
 it('falha mostra o texto Falhou além do ícone',()=>{
  const html=renderToStaticMarkup(React.createElement(Bolha,{m:{...base,direcao:'out',status:'falhou'}}));
  expect(html).toContain('aria-label="Falhou"');expect(html).toContain('>Falhou<');
 });
 it('mensagem do cliente não tem tique e fica à esquerda',()=>{
  const html=renderToStaticMarkup(React.createElement(Bolha,{m:{...base,direcao:'in',status:'recebido'}}));
  expect(html).not.toContain('role="img"');expect(html).toContain('justify-start');expect(html).toContain('rounded-bl-sm');
 });
 it('registro interno é pílula tracejada central com o resumo do quadro',()=>{
  const corpo=JSON.stringify({versao:1,etapa:'em_atendimento',responsavelId:3,responsavelNome:'Equipe',proximaAcao:'Ligar'});
  const html=renderToStaticMarkup(React.createElement(Bolha,{m:{...base,direcao:'sistema',origem:'kanban_controle',status:'controle',corpo}}));
  expect(html).toContain('border-dashed');expect(html).toContain('justify-center');expect(html).toContain('Quadro atualizado: Em atendimento');expect(html).toContain('Registro interno');
 });
 it('a entrada animada respeita reduced-motion e usa a curva do sistema',()=>{
  const css=fs.readFileSync(path.join(RAIZ,'(app)/crm/atendimento/bolha.tsx'),'utf8');
  expect(css).toContain('220ms');expect(css).toContain('--mov-curva');expect(css).toContain('translateY(6px)');expect(css).toContain('prefers-reduced-motion');
 });
});

describe('lista de conversas',()=>{
 const itens=[
  {telefone:'5592900000001',nome:'Ana Souza',hora:'14:32',previa:'Tem a lavadora?',aguardando:true,etapa:'em_atendimento',etapaNome:'Em atendimento',responsavel:'Jakeline'},
  {telefone:'5592900000002',nome:'Bruno',hora:'ontem',previa:'Você: Obrigado',aguardando:false,etapa:'concluidas',etapaNome:'Concluídas',responsavel:'Não atribuído'},
 ];
 const props={itens,selecionado:'5592900000001',base:'/crm/atendimento',busca:'ana',visao:'lista',etapa:'todas',contagens:{todas:2,novas:0,em_atendimento:1,aguardando_cliente:0,aguardando_fornecedor:0,concluidas:1}};
 it('chips por etapa são links que filtram pela URL, com contagem',()=>{
  const html=renderToStaticMarkup(React.createElement(ConversaLista,props));
  expect(html).toContain('etapa=em_atendimento');expect(html).toContain('visao=lista');expect(html).toContain('q=ana');
  expect(html).toContain('aria-current="true"');
 });
 it('linha mostra prévia, etapa · responsável e marca aguardando resposta',()=>{
  const html=renderToStaticMarkup(React.createElement(ConversaLista,props));
  expect(html).toContain('Tem a lavadora?');expect(html).toContain('Em atendimento · Jakeline');expect(html).toContain('aria-label="Aguardando resposta"');
  expect(html).toContain('aria-current="page"');
 });
 it('na tela própria os links ficam na rota da janela',()=>{
  const html=renderToStaticMarkup(React.createElement(ConversaLista,{...props,base:'/crm/atendimento/janela'}));
  expect(html).toContain('href="/crm/atendimento/janela?');expect(html).not.toContain('href="/crm/atendimento?');
 });
 it('mantém a busca por nome ou telefone e o alternador Lista/Kanban',()=>{
  const html=renderToStaticMarkup(React.createElement(ConversaLista,props));
  expect(html).toContain('name="q"');expect(html).toContain('Kanban');expect(html).toContain('Lista');
 });
 it('lista vazia explica a busca',()=>{
  const html=renderToStaticMarkup(React.createElement(ConversaLista,{...props,itens:[]}));
  expect(html).toContain('Nenhuma conversa');
 });
});

describe('Reply',()=>{
 const fonte=ler('(app)/crm/atendimento/reply.tsx');
 it('mantém as duas actions e o envio só no submit',()=>{
  expect(fonte).toContain('responderConversa');expect(fonte).toContain('controlarAutomatico');
  expect(fonte.split('responderConversa(').length-1).toBe(1); // única chamada: onSubmit
  expect(fonte).toContain('Clicar no botão não envia a mensagem');
 });
 it('respostas prontas só preenchem o campo (onClick sem envio)',()=>{
  const trecho=fonte.split('prontas.map')[1].split('</Button>')[0];
  expect(trecho).toContain('setTexto(');expect(trecho).not.toContain('responderConversa');expect(trecho).not.toContain('requestSubmit');expect(trecho).not.toContain('submit(');
 });
 it('renderiza botão redondo de 48px, contador e aviso de tarifa',()=>{
  const html=renderToStaticMarkup(React.createElement(Reply,{telefone:'5592900000001',aberta:true,estadoAutomatico:'Automático gratuito disponível para assuntos previstos'}));
  expect(html).toContain('aria-label="Enviar mensagem"');expect(html).toContain('size-12');expect(html).toContain('rounded-full');
  expect(html).toContain('0/4096');expect(html).toContain('Templates com tarifa continuam bloqueados');
  expect(html).toContain('Assumir conversa');expect(html).toContain('Retomar automático');
  expect(html).toContain('Boas-vindas');
 });
 it('com a equipe no comando oferece Retomar',()=>{
  const html=renderToStaticMarkup(React.createElement(Reply,{telefone:'5592900000001',aberta:false,estadoAutomatico:'Automático pausado pela equipe'}));
  expect(html).toContain('A equipe está no comando');expect(html).toContain('Retomar automático');expect(html).toContain('Janela encerrada');
 });
});

describe('Reply: as duas ações de controle existem em todos os estados',()=>{
 // Regressão da revisão do PR #43: um botão só (por regex no texto) escondia ações legítimas.
 const estados=['Automático gratuito disponível para assuntos previstos','Automático pausado pela equipe','Pausa temporária até 14:00','Automático desligado','Cliente pediu para parar'];
 for(const estado of estados){
  it(`estado "${estado}" oferece Assumir conversa e Retomar automático`,()=>{
   const html=renderToStaticMarkup(React.createElement(Reply,{telefone:'5592900000001',aberta:true,estadoAutomatico:estado}));
   expect(html).toContain('Assumir conversa');expect(html).toContain('Retomar automático');
  });
 }
});

describe('tela própria em nova janela',()=>{
 it('o botão abre a rota da janela em outra aba preservando telefone, visão e busca',()=>{
  const html=renderToStaticMarkup(React.createElement(AbrirEmNovaJanela,{telefone:'5592900000001',visao:'lista',q:'ana'}));
  expect(html).toContain('target="_blank"');expect(html).toContain('rel="noopener"');
  expect(html).toContain('/crm/atendimento/janela?');expect(html).toContain('telefone=5592900000001');expect(html).toContain('visao=lista');expect(html).toContain('q=ana');
  expect(html).toContain('Abrir em nova janela');expect(html).toContain('min-h-11');
 });
 it('page do sistema e page da janela exigem requireAdmin',()=>{
  expect(ler('(app)/crm/atendimento/page.tsx')).toContain('requireAdmin');
  expect(ler('(janela)/crm/atendimento/janela/page.tsx')).toContain('requireAdmin');
 });
 it('a janela vive fora do grupo (app) e o layout dela não renderiza a sidebar',()=>{
  expect(fs.existsSync(path.join(RAIZ,'(app)/crm/atendimento/janela'))).toBe(false);
  const layout=ler('(janela)/layout.tsx');
  expect(layout).toContain('getSession');expect(layout).toContain('/login');
  expect(layout).not.toMatch(/Sidebar|sidebar-nav|MobileMenuTrigger/);
  const page=ler('(janela)/crm/atendimento/janela/page.tsx');
  expect(page).not.toMatch(/SidebarNav|SidebarContent|\(app\)\/layout/);
  expect(page).toContain('Voltar ao sistema');expect(page).toContain('WhatsApp BFX');
 });
 it('kanban recebe a base da rota e continua com arrastar e Organizar atendimento',()=>{
  const k=ler('(app)/crm/atendimento/kanban.tsx');
  expect(k).toContain('onDragStart');expect(k).toContain('onDrop');expect(k).toContain('salvarOrganizacaoConversa');expect(k).toContain('Organizar atendimento');expect(k).toContain('base');
 });
});

describe('pedido original intacto',()=>{
 it('cartão inicial do kanban continua o mesmo',()=>{expect(ESTADO_KANBAN_INICIAL.etapa).toBe('novas');});
});
