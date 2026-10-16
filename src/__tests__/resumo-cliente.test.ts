import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {it,expect,vi} from 'vitest';
vi.stubGlobal('React',React);
import {ResumoCliente} from '@/app/(app)/crm/atendimento/resumo-cliente';
it('separa identidade e fidelidade sem chamar pontos de dinheiro disponível',()=>{
 const html=renderToStaticMarkup(React.createElement(ResumoCliente,{nome:"Ana",cadastro:12,empresa:"Amazon Five",etapa:"Cliente",pontos:1000}));
 expect(html).toContain('Identificação do cliente');expect(html).toContain('Benefícios de fidelidade');
 expect(html).toContain('Amazon Five');expect(html).toContain('1.000');expect(html).toContain('50,00');
 expect(html).toContain('Equivalente em desconto');expect(html).toContain('Não é saldo em dinheiro');
});
