import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RelatoriosNav } from '@/components/relatorios-nav';
describe('navegação de relatórios', () => {
 it('mantém cinco destinos acessíveis e um único atual', () => {
 const html=renderToStaticMarkup(React.createElement(RelatoriosNav,{atual:'mensais'}));
 expect(html.match(/aria-current="page"/g)).toHaveLength(1);
 expect(html.match(/<a[^>]*aria-current="page"[^>]*>/)?.[0]).toContain('href="/relatorios/mensais"');
 for(const texto of ['Vendas','Inadimplência','Margem por produto','Mensais','E-mails enviados']) expect(html).toContain(texto);
 });
});
