import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
vi.stubGlobal('React',React);
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()})}));
vi.mock('@/app/(app)/crm/atendimento/kanban-actions',()=>({salvarOrganizacaoConversa:vi.fn()}));
import {KanbanConversas} from '@/app/(app)/crm/atendimento/kanban';
import {Sheet} from '@/components/ui/sheet';
import {DetalhesCartao} from '@/app/(app)/crm/atendimento/kanban-cartao';
import {ESTADO_KANBAN_INICIAL} from '@/lib/whatsapp-kanban';
const cartao={telefone:'5511999990000',nome:'Cliente Exemplo',ultimaMensagem:'16/10/2026, 10:00',revisao:0,classificado:false,estado:ESTADO_KANBAN_INICIAL};
it('quadro: filtro de etapa, atribuição e selo de classificação',()=>{
 const html=renderToStaticMarkup(React.createElement(KanbanConversas,{busca:'Cliente',pessoas:[{id:3,nome:'Equipe Teste'}],cartoes:[cartao]}));
 expect(html).toContain('Mostrar etapa');expect(html).toContain('Sem classificação');expect(html).toContain('value="Cliente"');
});
it('detalhes do cartão (Sheet): conversa e ficha do mesmo telefone, atribuição real e formulário',()=>{
 const html=renderToStaticMarkup(React.createElement(Sheet,{open:true},React.createElement(DetalhesCartao,{cartao,pessoas:[{id:3,nome:'Equipe Teste'}],base:'/crm/atendimento',busca:'Cliente'})));
 expect(html).toContain('visao=lista&amp;telefone=5511999990000&amp;q=Cliente');
 expect(html).toContain('/crm/atendimento/ficha?telefone=5511999990000');
 expect(html).toContain('Sem responsável');expect(html).toContain('Revisar histórico');
 expect(html).toContain('name="responsavel"');expect(html).toContain('name="acao"');expect(html).toContain('Salvar cartão');
});
