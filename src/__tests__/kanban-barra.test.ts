import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
vi.stubGlobal('React',React);
import {BarraKanban} from '@/app/(app)/crm/atendimento/kanban-barra';

const props={busca:'',onBusca:vi.fn(),filtros:{busca:'',responsavel:'todos' as const,soSemClassificacao:false},onFiltros:vi.fn(),etapa:'todas',onEtapa:vi.fn(),contagemPorEtapa:{novas:2,em_atendimento:1},total:3,pessoas:[{id:7,nome:'Maria'}],movendo:false,onAtualizar:vi.fn()};
const html=(o={})=>renderToStaticMarkup(React.createElement(BarraKanban,{...props,...o}));

describe('BarraKanban',()=>{
 it('tem os controles e a dica',()=>{
  const h=html();
  for(const t of ['Mostrar etapa','Responsável','Só sem classificação','Atualizar quadro','Buscar no quadro','Arraste os cartões entre colunas. Mover não envia mensagem.'])expect(h).toContain(t);
  expect(h).toContain('role="toolbar"');expect(h).toContain('aria-label="Ferramentas do quadro"');
 });
 it('Atualizar fica desabilitado só quando movendo',()=>{
  const botao=(h:string)=>h.split('<button').find(b=>b.includes('Atualizar quadro'))??'';
  expect(botao(html({movendo:true}))).toContain('disabled=""');
  expect(botao(html({movendo:false}))).not.toContain('disabled=""');
 });
});
