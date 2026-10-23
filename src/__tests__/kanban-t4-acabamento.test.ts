import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe,expect,it,vi} from 'vitest';
vi.stubGlobal('React',React);
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()})}));
vi.mock('@/app/(app)/crm/atendimento/kanban-actions',()=>({salvarOrganizacaoConversa:vi.fn()}));
import {Sheet} from '@/components/ui/sheet';
import {formatarTelefoneBr,resumirUltimoTexto,ESTADO_KANBAN_INICIAL,type CartaoConversa} from '@/lib/whatsapp-kanban';
import {DetalhesCartao,rotuloDataCurta} from '@/app/(app)/crm/atendimento/kanban-cartao';
import {BarraKanban} from '@/app/(app)/crm/atendimento/kanban-barra';
import {AlternarVisao} from '@/app/(app)/crm/atendimento/conversa-lista';

const ler=(p:string)=>readFileSync(join(process.cwd(),p),'utf8');

describe('formatarTelefoneBr',()=>{
 it('celular com 9 dígitos',()=>expect(formatarTelefoneBr('5592999990001')).toBe('+55 92 99999-0001'));
 it('fixo com 8 dígitos',()=>expect(formatarTelefoneBr('559232345678')).toBe('+55 92 3234-5678'));
 it('aceita máscara e fora do padrão passa só com +',()=>{
  expect(formatarTelefoneBr('+55 (92) 99999-0001')).toBe('+55 92 99999-0001');
  expect(formatarTelefoneBr('14155550123')).toBe('+14155550123');
 });
});

describe('resumirUltimoTexto',()=>{
 it('junta espaços e corta em 140 com reticências',()=>{
  expect(resumirUltimoTexto('  oi\n  tudo   bem ')).toBe('oi tudo bem');
  const r=resumirUltimoTexto('a'.repeat(300));
  expect(r.length).toBe(141);expect(r.endsWith('…')).toBe(true);
 });
});

describe('rotuloDataCurta',()=>{
 it('tira o ano; fora do padrão passa',()=>{
  expect(rotuloDataCurta('16/10/2026, 09:00')).toBe('16/10, 09:00');
  expect(rotuloDataCurta('Sem data')).toBe('Sem data');
 });
});

const cartao:CartaoConversa={telefone:'5592999990001',nome:'Ana',ultimaMensagem:'16/10/2026, 09:00',revisao:0,classificado:true,estado:ESTADO_KANBAN_INICIAL,ultimoTexto:'Bom dia, tem a lavadora?'};
const det=(c:CartaoConversa)=>renderToStaticMarkup(React.createElement(Sheet,{open:true},React.createElement(DetalhesCartao,{cartao:c,pessoas:[],base:'/crm/atendimento',busca:''})));

describe('Sheet de detalhes',()=>{
 it('mostra telefone formatado e a última mensagem com data',()=>{
  const h=det(cartao);
  expect(h).toContain('+55 92 99999-0001');
  expect(h).toContain('Última mensagem · 16/10, 09:00');
  expect(h).toContain('Bom dia, tem a lavadora?');
 });
 it('sem texto não mostra o bloco',()=>expect(det({...cartao,ultimoTexto:undefined})).not.toContain('Última mensagem'));
});

describe('SheetContent ancorado',()=>{
 const fonte=ler('src/components/ui/sheet.tsx');
 it('variante sem véu a partir de sm e abaixo do cabeçalho',()=>{
  expect(fonte).toContain('ancorado');
  expect(fonte).toMatch(/sm:hidden/);
  expect(fonte).toMatch(/sm:top-14/);
 });
 it('o quadro usa o Sheet ancorado (modal só abaixo de sm)',()=>{
  const k=ler('src/app/(app)/crm/atendimento/kanban.tsx');
  expect(k).toContain('ancorado');expect(k).toContain('modal={modal}');
 });
});

describe('barra do quadro',()=>{
 const props={busca:'',onBusca:vi.fn(),filtros:{busca:'',responsavel:'todos' as const,soSemClassificacao:true},onFiltros:vi.fn(),etapa:'todas',onEtapa:vi.fn(),contagemPorEtapa:{},total:3,pessoas:[],movendo:false,onAtualizar:vi.fn()};
 const h=renderToStaticMarkup(React.createElement(BarraKanban,props));
 it('selo ativo em tom de marca',()=>expect(h).toMatch(/data-\[state=on\]:bg-marca-tint/));
 it('responsável "todos" aparece como "Responsável"',()=>{expect(h).not.toContain('Responsável: todos');expect(h).toContain('>Responsável<');});
});

describe('alternar no cabeçalho da janela',()=>{
 it('rótulos Conversas/Quadro na variante cabeçalho',()=>{
  const h=renderToStaticMarkup(React.createElement(AlternarVisao,{base:'/x',visao:'kanban',q:'',variante:'cabecalho'}));
  expect(h).toContain('Conversas');expect(h).toContain('Quadro');
 });
 it('tela: janela põe o alternador no header e não na linha do quadro',()=>{
  const f=ler('src/app/(app)/crm/atendimento/tela-atendimento.tsx');
  const header=f.slice(f.indexOf('const cabecalho=janela'),f.indexOf('const corpo='));
  expect(header).toContain('<AlternarVisao');
  const corpo=f.slice(f.indexOf('const corpo='),f.indexOf('if(janela)return'));
  expect(corpo).toContain('{!janela&&<div');
 });
});
