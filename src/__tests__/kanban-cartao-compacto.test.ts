import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
vi.stubGlobal('React',React);
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()})}));
vi.mock('@/app/(app)/crm/atendimento/kanban-actions',()=>({salvarOrganizacaoConversa:vi.fn()}));
import {Sheet} from '@/components/ui/sheet';
import {CartaoKanban,DetalhesCartao,iniciais,rotuloHora} from '@/app/(app)/crm/atendimento/kanban-cartao';
import {ESTADO_KANBAN_INICIAL,type CartaoConversa} from '@/lib/whatsapp-kanban';

const base:CartaoConversa={telefone:'5511999990000',nome:'Cliente Exemplo',ultimaMensagem:'16/10/2026, 10:00',revisao:0,classificado:true,estado:{...ESTADO_KANBAN_INICIAL,responsavelId:3,responsavelNome:'Equipe Teste',proximaAcao:'Ligar amanhã'}};
const noop=()=>{};
const cartao=(c:CartaoConversa,extra={})=>renderToStaticMarkup(React.createElement(CartaoKanban,{cartao:c,movendo:false,arrastando:false,onAbrir:noop,onDragStart:noop,onDragEnd:noop,...extra}));

describe('iniciais',()=>{
 it('duas primeiras palavras, maiúsculas',()=>{
  expect(iniciais('Ana Paula')).toBe('AP');
  expect(iniciais('larissa')).toBe('L');
  expect(iniciais('Equipe Teste')).toBe('ET');
 });
 it('ignora partículas e símbolos',()=>{
  expect(iniciais('Maria da Silva')).toBe('MS');
  expect(iniciais('  -- João ')).toBe('J');
 });
});

describe('rotuloHora',()=>{
 const agora=new Date('2026-10-16T18:00:00Z');
 it('hoje mostra só a hora; outro dia mostra dia/mês; fora do padrão passa',()=>{
  expect(rotuloHora('16/10/2026, 10:00',agora)).toBe('10:00');
  expect(rotuloHora('15/10/2026, 11:36',agora)).toBe('15/10');
  expect(rotuloHora('Sem data',agora)).toBe('Sem data');
 });
});

describe('CartaoKanban (compacto, estilo Trello)',()=>{
 it('é um article arrastável com botão que abre; sem <details>',()=>{
  const h=cartao(base);
  expect(h).toContain('<article');expect(h).toContain('draggable="true"');expect(h).toContain('aria-label="Conversa Cliente Exemplo"');
  expect(h).toContain('data-abrir-cartao');expect(h).not.toContain('<details');
 });
 it('mostra nome, próxima ação, horário em mono e iniciais do responsável',()=>{
  const h=cartao(base);
  expect(h).toContain('Cliente Exemplo');expect(h).toContain('Ligar amanhã');
  expect(h).toMatch(/font-mono[^>]*>(10:00|16\/10)</);
  expect(h).toContain('>ET<');
 });
 it('não atribuído: avatar tracejado, sem iniciais',()=>{
  const h=cartao({...base,estado:{...base.estado,responsavelId:null,responsavelNome:'Sem responsável'}});
  expect(h).toContain('border-dashed');expect(h).not.toContain('>NA<');
 });
 it('selo "Sem classificação" só quando não classificado, e sem próxima ação nesse caso',()=>{
  expect(cartao(base)).not.toContain('Sem classificação');
  const h=cartao({...base,classificado:false});
  expect(h).toContain('Sem classificação');expect(h).not.toContain('Ligar amanhã');
 });
 it('não vaza telefone, ficha, salvar nem dica de arrastar; opacidade ao arrastar; não arrasta enquanto move',()=>{
  const h=cartao(base);
  for(const t of ['5511999990000','ficha','Salvar cartão','Arraste para mover'])expect(h).not.toContain(t);
  expect(h).not.toMatch(/<article[^>]*opacity-50/);
  expect(cartao(base,{arrastando:true})).toMatch(/<article[^>]*opacity-50/);
  expect(cartao(base,{movendo:true})).toContain('draggable="false"');
 });
});

describe('DetalhesCartao (conteúdo do Sheet)',()=>{
 const det=(b?:string)=>renderToStaticMarkup(React.createElement(Sheet,{open:true},React.createElement(DetalhesCartao,{cartao:base,pessoas:[{id:3,nome:'Equipe Teste'}],base:b??'/crm/atendimento',busca:'Cliente',onAviso:noop,disabled:false})));
 it('traz editor, telefone, links de conversa e ficha',()=>{
  const h=det();
  for(const t of ['name="responsavel"','name="acao"','Salvar cartão','data-kanban-editor','visao=lista&amp;telefone=5511999990000&amp;q=Cliente','/crm/atendimento/ficha?telefone=5511999990000','+55 11 99999-0000','Abrir conversa','Ficha do cliente'])expect(h).toContain(t);
 });
 it('ficha em nova aba só na janela',()=>{
  const j=det('/crm/atendimento/janela');
  expect(j).toContain('target="_blank"');expect(j).toContain('rel="noopener"');
  expect(det()).not.toContain('target=');
 });
});
