// Atalhos rápidos do atendimento (UI): regras puras + marcação estática.
// O vitest roda em `node`, sem jsdom: nada aqui clica; o que depende de clique foi conferido no navegador.
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
vi.stubGlobal('React',React);
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()})}));
vi.mock('@/app/(app)/crm/atendimento/actions',()=>({responderConversa:vi.fn(),controlarAutomatico:vi.fn()}));
vi.mock('@/app/(app)/crm/atendimento/atalhos-actions',()=>({buscarEstoqueAtalho:vi.fn(),parcelasDoContato:vi.fn(),boletosDoContato:vi.fn()}));
import {decidirInsercao,termoBuscavel,contarVencidas,proximoVencimento,TERMO_MINIMO} from '@/app/(app)/crm/atendimento/atalhos-regras';
import {PainelAtalhos,ListaEstoque,ParcelasView,BoletosView} from '@/app/(app)/crm/atendimento/atalhos-painel';
import {Reply} from '@/app/(app)/crm/atendimento/reply';

describe('regras puras dos atalhos',()=>{
 it('inserir: campo vazio (ou só espaço) preenche; com texto pede confirmação',()=>{
  expect(decidirInsercao('','Olá')).toBe('preencher');
  expect(decidirInsercao('  \n ','Olá')).toBe('preencher');
  expect(decidirInsercao('Bom dia','Olá')).toBe('confirmar');
  // Mesmo texto: nada se perde, não precisa perguntar.
  expect(decidirInsercao('Olá','Olá')).toBe('preencher');
 });
 it('busca só com 2 caracteres úteis',()=>{
  expect(TERMO_MINIMO).toBe(2);
  expect(termoBuscavel('a')).toBe(false);
  expect(termoBuscavel(' a ')).toBe(false);
  expect(termoBuscavel('la')).toBe(true);
 });
 it('cards: vencidas contadas e próximo vencimento só entre as a vencer',()=>{
  const ps=[{situacao:'vencida',dataVencimento:'2026-09-01'},{situacao:'a_vencer',dataVencimento:'2026-11-20'},{situacao:'a_vencer',dataVencimento:'2026-11-05'}] as never[];
  expect(contarVencidas(ps)).toBe(1);
  expect(proximoVencimento(ps)).toBe('2026-11-05');
  expect(proximoVencimento([])).toBeNull();
 });
});

describe('raio do composer',()=>{
 const html=renderToStaticMarkup(React.createElement(Reply,{telefone:'5592999990001',aberta:true,estadoAutomatico:'Automático'}));
 const raio=html.split('<button').find(b=>b.includes('aria-label="Respostas prontas e atalhos"'))!;
 it('é um botão habilitado, fechado, com aria-expanded',()=>{
  expect(raio).toBeTruthy();
  expect(raio).toContain('aria-expanded="false"');
  expect(raio.split('</button>')[0]).not.toContain('disabled=""');
  expect(html).not.toContain('em breve');
 });
 it('com a janela encerrada o raio fica desabilitado (o campo também está)',()=>{
  const h=renderToStaticMarkup(React.createElement(Reply,{telefone:'5592999990001',aberta:false,estadoAutomatico:'x'}));
  expect(h.split('<button').find(b=>b.includes('aria-label="Respostas prontas e atalhos"'))!.split('</button>')[0]).toContain('disabled=""');
 });
});

describe('painel',()=>{
 const html=renderToStaticMarkup(React.createElement(PainelAtalhos,{telefone:'5592999990001',onInserir:()=>{}}));
 it('tablist com as 3 abas e o aviso de que nada é enviado',()=>{
  expect(html).toMatch(/role="tablist"/);
  expect((html.match(/role="tab"/g)||[]).length).toBe(3);
  for(const n of ['Estoque','Parcelas','Boletos'])expect(html).toContain(n);
  expect(html).toContain('Clicar só preenche o campo · Esc fecha');
 });
 it('aba Estoque: campo de busca com rótulo',()=>{
  expect(html).toContain('aria-label="Buscar produto no estoque"');
 });
});

describe('aba Estoque',()=>{
 const itens=[{nome:'Lavadora Electrolux 14,5 kg',categoria:'Lavadoras',quantidade:3,aproximado:false},{nome:'Lavadora 17 kg',categoria:null,quantidade:0,aproximado:true}];
 const html=renderToStaticMarkup(React.createElement(ListaEstoque,{itens,destaque:0,onDestacar:()=>{},onInserir:()=>{}}));
 it('mostra unidades, sem estoque e aproximado; um Inserir por item',()=>{
  expect(html).toContain('3 un.');
  expect(html).toContain('Sem estoque');
  expect(html).toContain('aproximado');
  expect((html.match(/>Inserir</g)||[]).length).toBe(2);
 });
 it('nenhuma string de preço',()=>{
  expect(html).not.toMatch(/R\$|preço|preco/i);
 });
});

describe('aba Parcelas',()=>{
 const base={ok:true as const,cliente:{nome:'Ana Souza'},totalEmAberto:350.5,totalVencido:100,parcelas:[
  {vendaId:7,produto:'Lavadora',numeroParcela:'3/10',dataVencimento:'2026-09-05',valor:100,paga:false,diasAtraso:40,situacao:'vencida' as const},
  {vendaId:7,produto:'Lavadora',numeroParcela:'4/10',dataVencimento:'2026-11-05',valor:250.5,paga:false,diasAtraso:0,situacao:'a_vencer' as const}]};
 it('cliente, três cards, situação e resumo',()=>{
  const html=renderToStaticMarkup(React.createElement(ParcelasView,{dados:base as never,onInserir:()=>{}}));
  expect(html).toContain('Cliente desta conversa: ');
  expect(html).toContain('Ana Souza');
  for(const n of ['Em aberto','Vencidas','Próximo vencimento'])expect(html).toContain(n);
  expect(html).toContain('05/11');
  expect(html).toContain('Vencida');
  expect(html).toContain('A vencer');
  expect(html).toContain('valor-sensivel');
  expect(html).toContain('Inserir resumo na mensagem');
 });
 it('cliente ambíguo/sem cadastro: só o motivo, sem lista nem inserir',()=>{
  const html=renderToStaticMarkup(React.createElement(ParcelasView,{dados:{ok:true,cliente:null,motivo:'Há mais de um cadastro com esse telefone.',totalEmAberto:0,totalVencido:0,parcelas:[]} as never,onInserir:()=>{}}));
  expect(html).toContain('Há mais de um cadastro com esse telefone.');
  expect(html).not.toContain('Inserir resumo');
  expect(html).not.toContain('<li');
 });
});

describe('aba Boletos',()=>{
 const dados={ok:true as const,cliente:{nome:'Ana'},boletos:[
  {vendaId:1,dataVenda:'2026-10-02',produto:'TV',parcelas:6,valor:120,emitido:true,link:'https://exemplo.com.br/b/1'},
  {vendaId:2,dataVenda:'2026-10-09',produto:null,parcelas:null,valor:null,emitido:false,link:null}]};
 const html=renderToStaticMarkup(React.createElement(BoletosView,{dados:dados as never,onInserir:()=>{}}));
 it('Inserir link só com link; sem link mostra o selo',()=>{
  expect((html.match(/Inserir link/g)||[]).length).toBe(1);
  expect(html).toContain('sem link');
  expect(html).toContain('02/10');
  expect(html).toContain('valor-sensivel');
 });
});
