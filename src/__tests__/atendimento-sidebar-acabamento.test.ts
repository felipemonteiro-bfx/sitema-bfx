// H6: acabamento do Atendimento WhatsApp e da sidebar (só visual: nenhuma regra muda).
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
vi.stubGlobal('React',React);
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()}),usePathname:()=>'/crm',useSearchParams:()=>new URLSearchParams()}));
vi.mock('@/app/(app)/crm/atendimento/actions',()=>({responderConversa:vi.fn(),controlarAutomatico:vi.fn()}));
import {ConversaChat} from '@/app/(app)/crm/atendimento/conversa-chat';
import {Reply} from '@/app/(app)/crm/atendimento/reply';
import {AlertasHoje} from '@/components/alertas-hoje';
import {BuscaRapidaGatilho} from '@/components/busca-rapida';

const RAIZ=path.resolve(__dirname,'..');
const ler=(rel:string)=>fs.readFileSync(path.join(RAIZ,rel),'utf8');
const ATEND='app/(app)/crm/atendimento/';

describe('item 2: aviso de mensagem aguardando é discreto',()=>{
 const props={telefone:'5592900000001',nome:'Ana Souza',aberta:true,semResposta:true,estadoAutomatico:'Automático gratuito disponível para assuntos previstos',mensagens:[],fichaHref:'/crm/atendimento/ficha?telefone=5592900000001'};
 const html=renderToStaticMarkup(React.createElement(ConversaChat,props));
 const texto='Mensagem do cliente aguardando resposta';
 it('mantém texto e role=status, mas sem a faixa verde larga',()=>{
  const i=html.indexOf(texto);
  expect(i).toBeGreaterThan(-1);
  const abertura=html.slice(html.lastIndexOf('role="status"',i),i);
  expect(abertura).toContain('role="status"');
  expect(abertura).not.toContain('bg-marca-tint');
  expect(abertura).not.toContain('border-b');
 });
 it('fica logo acima do composer, depois do registro de mensagens',()=>{
  expect(html.indexOf(texto)).toBeGreaterThan(html.indexOf('role="log"'));
 });
 it('sem mensagem pendente o aviso não aparece',()=>{
  expect(renderToStaticMarkup(React.createElement(ConversaChat,{...props,semResposta:false}))).not.toContain(texto);
 });
});

describe('item 3: rodapé do composer compacto',()=>{
 const aberto=renderToStaticMarkup(React.createElement(Reply,{telefone:'5592900000001',aberta:true,estadoAutomatico:'Automático gratuito disponível para assuntos previstos'}));
 const fechado=renderToStaticMarkup(React.createElement(Reply,{telefone:'5592900000001',aberta:false,estadoAutomatico:'Automático gratuito disponível para assuntos previstos'}));
 it('uma linha curta no rodapé, com contador',()=>{
  expect(aberto).toContain('Resposta de atendimento disponível · templates com tarifa bloqueados');
  expect(fechado).toContain('Aguarde nova mensagem do cliente · envio com tarifa bloqueado');
  expect(aberto).not.toContain('/4096'); // M4: contador só perto do limite
 });
 it('o texto longo vive no Popover do ícone de ajuda (K), sem sumir: fica no leitor de tela',()=>{
  // Antes era um <details> de uma linha; agora é um ícone de ajuda na faixa do assistente. O texto
  // continua no DOM (sr-only, ligado ao gatilho por aria-describedby) e abre visível no Popover.
  expect(aberto).toContain('aria-label="Como funciona o automático"');
  expect(aberto).toContain('aria-describedby="ajuda-automatico"');
  for(const t of ['Janela aberta. Templates com tarifa continuam bloqueados','Clicar no botão não envia a mensagem'])expect(aberto).toContain(t);
  expect(fechado).toContain('Janela encerrada. Envio com tarifa bloqueado');
 });
});

describe('item 1 e 4: degrau de superfície',()=>{
 it('painéis sem contorno no escuro (o degrau vem do bg-card)',()=>{
  for(const f of ['tela-atendimento.tsx','conversa-chat.tsx','conversa-lista.tsx'])expect(ler(ATEND+f)).toContain('dark:border-transparent');
 });
 it('contexto: blocos em poço e texto legal das vendas menor',()=>{
  const c=ler(ATEND+'contexto.tsx');
  expect(c).toContain('border-divisoria'); // M5: seções com divisória, não poços
  expect(c).toContain('text-xs');
 });
});

describe('item 5: menu inteiro visível a 1440x900',()=>{
 it('alertas em uma linha compacta cada (sem alvo de 44px)',()=>{
  const html=renderToStaticMarkup(React.createElement(AlertasHoje,{alertas:{assinaturasPendentes:1,parcelasVencidas:2},urlAssinaturas:'/historico'}));
  expect(html).toContain('Alertas de hoje');expect(html).not.toContain('min-h-11');expect(html).toContain('min-h-8');
 });
 it('itens do menu densos no desktop, 44px no celular e em telas altas',()=>{
  const nav=ler('components/sidebar-nav.tsx');
  expect(nav).toContain('min-h-11');expect(nav).toContain('lg:min-h-8');expect(nav).toContain('min-height:1000px');
  expect(nav).toContain('overflow-y-auto');
 });
 it('rodapé fixo: só o menu rola',()=>{
  const l=ler('app/(app)/layout.tsx');
  expect(l).toContain('shrink-0');
 });
});

describe('item 6: gatilho da busca cabe',()=>{
 const html=renderToStaticMarkup(React.createElement(BuscaRapidaGatilho));
 it('texto visível curto e nome acessível completo',()=>{
  expect(html).toContain('>Buscar…<');
  expect(html).toContain('aria-label="Buscar venda, cliente, página"');
  expect(html).not.toContain('>Buscar venda, cliente, página<');
 });
});
