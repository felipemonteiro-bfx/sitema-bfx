import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
vi.stubGlobal('React',React);
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()})}));
vi.mock('@/app/(app)/crm/atendimento/kanban-actions',()=>({salvarOrganizacaoConversa:vi.fn()}));
import {KanbanConversas} from '@/app/(app)/crm/atendimento/kanban';
import {ESTADO_KANBAN_INICIAL} from '@/lib/whatsapp-kanban';
it('cartão abre a conversa e a ficha do mesmo telefone e mostra atribuição real',()=>{
 const html=renderToStaticMarkup(React.createElement(KanbanConversas,{busca:'Cliente',pessoas:[{id:3,nome:'Equipe Teste'}],cartoes:[{telefone:'5511999990000',nome:'Cliente Exemplo',ultimaMensagem:'16/10/2026, 10:00',revisao:0,classificado:false,estado:ESTADO_KANBAN_INICIAL}]}));
 expect(html).toContain('visao=lista&amp;telefone=5511999990000&amp;q=Cliente');
 expect(html).toContain('/crm/atendimento/ficha?telefone=5511999990000');
 expect(html).toContain('Não atribuído');expect(html).toContain('Sem classificação da equipe');expect(html).toContain('Revisar histórico');
 expect(html).toContain('Mostrar etapa');expect(html).toContain('name="responsavel"');expect(html).toContain('name="acao"');expect(html).toContain('Salvar cartão');
});
