// Tarefa K do redesign Vantage: Atendimento WhatsApp fiel ao artboard (só visual).
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
vi.stubGlobal('React',React);
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()}),usePathname:()=>'/crm/atendimento',useSearchParams:()=>new URLSearchParams()}));
vi.mock('@/app/(app)/crm/atendimento/actions',()=>({responderConversa:vi.fn(),controlarAutomatico:vi.fn()}));
import {ConversaLista,BuscaConversas} from '@/app/(app)/crm/atendimento/conversa-lista';
import {Reply} from '@/app/(app)/crm/atendimento/reply';
import {QuemResponde} from '@/app/(app)/crm/atendimento/quem-responde';
import {ConversaChat} from '@/app/(app)/crm/atendimento/conversa-chat';
import {ResumoCliente} from '@/app/(app)/crm/atendimento/resumo-cliente';

const ATEND=path.resolve(__dirname,'..','app/(app)/crm/atendimento');
const ler=(f:string)=>fs.readFileSync(path.join(ATEND,f),'utf8');

const itens=[{telefone:'5592900000001',nome:'Ana Souza',hora:'14:32',previa:'Tem a lavadora?',aguardando:true,etapa:'em_atendimento',etapaNome:'Em atendimento',responsavel:'Jakeline'}];
const props={itens,selecionado:'5592900000001',base:'/crm/atendimento',busca:'',visao:'lista',etapa:'todas',contagens:{todas:1,em_atendimento:1}};

describe('K1: busca é um campo só, com a lupa dentro do poço',()=>{
 const html=renderToStaticMarkup(React.createElement(BuscaConversas,{visao:'lista',q:''}));
 it('sem botão de lupa separado; Enter envia o formulário GET sem JS',()=>{
  expect(html).not.toContain('<button');
  expect(html).not.toContain('aria-label="Buscar conversas"');
  expect(html).toContain('role="search"');expect(html).toContain('name="q"');expect(html).toContain('name="visao"');
 });
 it('o poço envolve ícone e campo (label), como no artboard',()=>{
  expect(html).toContain('<label');expect(html).toContain('bg-poco');
 });
});

describe('K3: lista de conversas',()=>{
 const html=renderToStaticMarkup(React.createElement(ConversaLista,props));
 it('o texto "Até as 100 mais recentes" não é parágrafo no pé: vira title do contador',()=>{
  expect(html).not.toMatch(/<p[^>]*>[^<]*Até as 100 mais recentes/);
  expect(html).toMatch(/title="[^"]*Até as 100 mais recentes/);
 });
 it('chips de etapa pequenos (h-8) e item com avatar de 44px',()=>{
  expect(html).toContain('h-8');expect(html).toContain('size-12'); // M1: avatar de 48px
  expect(html).not.toContain('h-10 shrink-0');
 });
});

describe('K2: composer compacto',()=>{
 const html=renderToStaticMarkup(React.createElement(Reply,{telefone:'5592900000001',aberta:true,estadoAutomatico:'Automático gratuito disponível para assuntos previstos'}));
 const fonte=ler('reply.tsx');
 it('"Como funciona o automático" é item do menu de quem responde e abre um diálogo, não <details>',()=>{
  const quem=ler('quem-responde.tsx');
  const q=renderToStaticMarkup(React.createElement(QuemResponde,{telefone:'5592900000001',aberta:true,estadoAutomatico:'x'}));
  expect(html).not.toContain('<details');expect(q).not.toContain('<details');
  expect(quem).toContain('DialogContent');expect(quem).toContain('Como funciona o automático');
  expect(quem).toContain('Clicar no botão não envia a mensagem');
 });
 it('o seletor de quem responde usa size="sm" e as duas opções ficam no menu',()=>{
  const quem=ler('quem-responde.tsx');
  expect(quem.split('<Button')[1]).toContain('size="sm"');
  expect(quem).toContain('Equipe responde');expect(quem).toContain('Automático responde');
 });
 it('chips de resposta pronta de 36px (h-9) e textarea sem min-h-12 gigante',()=>{
  expect(html).toContain('rounded-full'); // M4: sem fileira de chips; botão de raio + pílula
  expect(html).not.toContain('h-10 shrink-0');
 });
});

describe('K2: aviso de cliente aguardando é um ponto + texto curto',()=>{
 const base={telefone:'5592900000001',nome:'Ana Souza',aberta:true,semResposta:true,estadoAutomatico:'Automático gratuito disponível para assuntos previstos',mensagens:[],fichaHref:'/x'};
 const html=renderToStaticMarkup(React.createElement(ConversaChat,base));
 it('texto completo continua acessível (sr-only) e o curto fica visível',()=>{
  expect(html).toContain('Mensagem do cliente aguardando resposta');
  expect(html).toContain('sr-only');
  expect(html).toContain('Cliente aguardando resposta');
  expect(html).toContain('aria-hidden="true" class="font-medium text-foreground">Cliente aguardando resposta');
 });
});

describe('K4: contexto do cliente',()=>{
 const html=renderToStaticMarkup(React.createElement(ResumoCliente,{nome:'Ana Souza',cadastro:5,empresa:'Prefeitura',etapa:'cliente',pontos:1000,fichaHref:'/f'}));
 it('avatar de 64px, valores em cards internos, texto legal fora do parágrafo (Tooltip/title)',()=>{
  // N: avatar de 64px (size-16) como no artboard; os valores ficam em cards internos.
  expect(html).toContain('size-16');expect(html).toContain('bg-card-elevated');
  expect(html).not.toMatch(/<p[^>]*>Não é saldo em dinheiro/);
  expect(html).toContain('Não é saldo em dinheiro');
 });
});
