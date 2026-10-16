// Tarefa N do redesign: Atendimento WhatsApp igual ao artboard aprovado (Atendimento.dc.html).
// Funções puras + marcação estática; o vitest roda em `node`, sem jsdom.
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
vi.stubGlobal('React',React);
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn(),replace:vi.fn(),push:vi.fn()}),usePathname:()=>'/crm/atendimento',useSearchParams:()=>new URLSearchParams()}));
vi.mock('@/app/(app)/crm/atendimento/actions',()=>({responderConversa:vi.fn(),controlarAutomatico:vi.fn()}));
vi.mock('@/app/(app)/crm/atendimento/kanban-actions',()=>({salvarOrganizacaoConversa:vi.fn()}));
import {formularioSujo,edicaoPendente,SELETOR_EDICAO_PENDENTE} from '@/app/(app)/crm/atendimento/refresh-regras';
import {Reply} from '@/app/(app)/crm/atendimento/reply';
import {ConversaChat} from '@/app/(app)/crm/atendimento/conversa-chat';
import {ConversaLista} from '@/app/(app)/crm/atendimento/conversa-lista';
import {ResumoCliente} from '@/app/(app)/crm/atendimento/resumo-cliente';
import {OrganizarConversa} from '@/app/(app)/crm/atendimento/kanban';
import {ESTADO_KANBAN_INICIAL} from '@/lib/whatsapp-kanban';

const ATEND=path.resolve(__dirname,'..','app/(app)/crm/atendimento');
const ler=(f:string)=>fs.readFileSync(path.join(ATEND,f),'utf8');

describe('N4: pausa do refresh só com alteração não salva',()=>{
 const orig={etapa:'novas',responsavel:'',acao:'x'};
 it('formularioSujo compara com os valores salvos',()=>{
  expect(formularioSujo(orig,orig)).toBe(false);
  expect(formularioSujo({...orig,etapa:'concluidas'},orig)).toBe(true);
  expect(formularioSujo({...orig,responsavel:'3'},orig)).toBe(true);
  expect(formularioSujo({...orig,acao:'y'},orig)).toBe(true);
 });
 it('edicaoPendente consulta [data-kanban-editor][data-sujo="true"] e ignora editor só aberto',()=>{
  expect(SELETOR_EDICAO_PENDENTE).toBe('[data-kanban-editor][data-sujo="true"]');
  const doc={querySelector:(s:string)=>s===SELETOR_EDICAO_PENDENTE?{}:null};
  expect(edicaoPendente(doc)).toBe(true);
  expect(edicaoPendente({querySelector:()=>null})).toBe(false);
 });
 it('reply.tsx e kanban.tsx não pausam mais por [open]',()=>{
  for(const f of ['reply.tsx','kanban.tsx']){const s=ler(f);expect(s).not.toContain('[open]');expect(s).toContain('edicaoPendente');}
 });
});

describe('N1: composer com chips de respostas prontas',()=>{
 const html=renderToStaticMarkup(React.createElement(Reply,{telefone:'5592900000001',aberta:true,estadoAutomatico:'Automático gratuito disponível para assuntos previstos'}));
 it('fileira de chips com as 6 respostas, rolável',()=>{
  expect(html).toMatch(/role="group"[^>]*aria-label="Respostas prontas"/);
  for(const t of ['Boas-vindas','Pedir modelo','Pedido / entrega','Conferir pagamento','Atendimento humano','Encerrar'])expect(html).toContain(t);
  expect(html).toContain('overflow-x-auto');
 });
 // Atualizado na tarefa A3: o raio deixou de ser um "(em breve)" desabilitado e passou a abrir o painel de
 // atalhos (estoque, parcelas, boletos). O que continua valendo: ele NÃO abre as respostas prontas (chips e "/", D2).
 it('o raio abre os atalhos rápidos (não as respostas prontas)',()=>{
  const raio=html.split('<button').find(b=>b.includes('aria-label="Atalhos rápidos"'))!;
  expect(raio).toContain('aria-expanded="false"');
  expect(raio.split('</button>')[0]).not.toContain('disabled=""');
  expect(html).not.toMatch(/<button[^>]*aria-label="Respostas prontas"/);
 });
});

describe('N2: faixa do assistente fina',()=>{
 const fonte=ler('reply.tsx');
 it('Assumir e Retomar em outline sm, ativo com destaque sutil (nunca preenchido)',()=>{
  const assumir=fonte.split('Assumir conversa')[0].split('<Button').pop()!;
  const retomar=fonte.split('Retomar automático')[0].split('<Button').pop()!;
  expect(assumir).toContain('variant="outline"');expect(retomar).toContain('variant="outline"');
  expect(assumir).not.toContain("'default'");expect(retomar).not.toContain("'default'");
 });
});

describe('N3: cabeçalho do chat',()=>{
 const base={telefone:'5592900000001',nome:'Ana Souza',aberta:true,semResposta:false,estadoAutomatico:'x',fichaHref:'/f',mensagens:[],agora:new Date('2026-10-16T15:00:00Z'),telefoneExplicito:true,hrefJanela:'/j'};
 it('pílula Janela aberta à direita com ícone de relógio; subtítulo só o telefone',()=>{
  const h=renderToStaticMarkup(React.createElement(ConversaChat,base));
  expect(h).toContain('Janela aberta');expect(h).toMatch(/lucide-clock/);
  expect(h).not.toContain('· janela aberta');
  expect(renderToStaticMarkup(React.createElement(ConversaChat,{...base,aberta:false}))).toContain('Aguardando cliente');
 });
});

describe('N4: dados do contato',()=>{
 it('pontos e desconto em dois cards internos com valor mono 18px; desconto em verde marca',()=>{
  const h=renderToStaticMarkup(React.createElement(ResumoCliente,{nome:'Ana',cadastro:1,empresa:'E',etapa:'c',pontos:1000}));
  expect(h).toContain('grid-cols-2');expect(h).toContain('bg-card-elevated');expect(h).toContain('text-lg');
  expect(h).toContain('text-marca-tint-texto');expect(h).toContain('Equivalente em desconto');
 });
 it('Organizar atendimento aberto como formulário (sem <details>) e data-kanban-editor',()=>{
  const c={telefone:'5511999990000',nome:'C',ultimaMensagem:'x',revisao:0,classificado:true,estado:ESTADO_KANBAN_INICIAL};
  const h=renderToStaticMarkup(React.createElement(OrganizarConversa,{pessoas:[],cartao:c,aberto:true}));
  expect(h).not.toContain('<details');expect(h).toContain('data-kanban-editor');expect(h).toContain('Salvar cartão');expect(h).toContain('Próxima ação');
  const k=renderToStaticMarkup(React.createElement(OrganizarConversa,{pessoas:[],cartao:c}));
  expect(k).toContain('<details');expect(k).toContain('data-kanban-editor');
 });
});

describe('N5: "Sobre este histórico" vai para o cabeçalho da lista',()=>{
 it('some do corpo da tela e vira ícone de info na lista',()=>{
  expect(ler('tela-atendimento.tsx')).not.toContain('Sobre este histórico</summary>');
  const h=renderToStaticMarkup(React.createElement(ConversaLista,{itens:[],base:'/crm/atendimento',busca:'',visao:'lista',etapa:'todas',contagens:{}}));
  expect(h).toContain('Sobre este histórico');expect(h).toContain('Grupos continuam no WhatsApp Web');
 });
});
