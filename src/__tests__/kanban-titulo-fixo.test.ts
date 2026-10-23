import React from 'react';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
vi.stubGlobal('React',React);
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()})}));
vi.mock('@/app/(app)/crm/atendimento/kanban-actions',()=>({salvarOrganizacaoConversa:vi.fn()}));
import {KanbanConversas} from '@/app/(app)/crm/atendimento/kanban';
import {ESTADO_KANBAN_INICIAL,ETAPAS_ATENDIMENTO} from '@/lib/whatsapp-kanban';

const fonte=readFileSync('src/app/(app)/crm/atendimento/kanban.tsx','utf8');
const html=renderToStaticMarkup(React.createElement(KanbanConversas,{busca:'',pessoas:[],cartoes:[{telefone:'5511999990000',nome:'Cliente Exemplo',ultimaMensagem:'x',revisao:0,classificado:true,estado:ESTADO_KANBAN_INICIAL}]}));

describe('kanban: título da coluna fora da área rolável (sem scroll duplo)',()=>{
 it('cada coluna tem h2 seguido de uma div com overflow-y-auto; o h2 não fica dentro dela',()=>{
  const colunas=html.split('<section aria-label="').slice(2);
  expect(colunas.length).toBeGreaterThanOrEqual(ETAPAS_ATENDIMENTO.length);
  for(const c of colunas.slice(0,ETAPAS_ATENDIMENTO.length)){
   expect(c).toMatch(/<\/h2><div class="[^"]*overflow-y-auto[^"]*"/);
   expect(c.split('overflow-y-auto')[0]).toContain('<h2');
  }
 });
 it('sem sticky e sem altura fixa max-h-176',()=>{
  expect(html).not.toContain('sticky');expect(html).not.toContain('max-h-176');
 });
 it('coluna w-72 shrink-0 com fundo de poço; contagem em mono',()=>{
  expect(html).toMatch(/<section aria-label="[^"]*" class="[^"]*w-72 shrink-0[^"]*bg-poco/);
  expect(html).toMatch(/font-mono[^>]*>\d+<\/span>/);
 });
 it('quadro rola só em x e ocupa o resto da altura',()=>{
  expect(html).toMatch(/class="[^"]*min-h-0 flex-1[^"]*overflow-x-auto overflow-y-hidden/);
  expect(html).toMatch(/<section aria-label="Kanban de conversas" class="[^"]*min-h-0 flex-1 flex-col/);
 });
 it('o refresh e o soltar ainda respeitam edicaoPendente',()=>{
  expect(fonte.split('edicaoPendente(document)').length-1).toBeGreaterThanOrEqual(3);
  expect(fonte).toContain('setInterval');
 });
});
