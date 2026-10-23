import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
vi.stubGlobal('React',React);
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()}),usePathname:()=>'/crm/atendimento',useSearchParams:()=>new URLSearchParams()}));
vi.mock('@/app/(app)/crm/atendimento/actions',()=>({responderConversa:vi.fn(),controlarAutomatico:vi.fn()}));
import {PRONTAS,filtrarProntas,termoDeBarra} from '@/app/(app)/crm/atendimento/composer-regras';
import {quandoRetoma,fraseQuemResponde,modoDoEstado,janelaRestante,mudarQuemResponde,avisoDeEnvio} from '@/app/(app)/crm/atendimento/quem-responde-regras';
import {Reply} from '@/app/(app)/crm/atendimento/reply';
import {QuemResponde} from '@/app/(app)/crm/atendimento/quem-responde';
import {ConversaChat} from '@/app/(app)/crm/atendimento/conversa-chat';

const ler=(rel:string)=>fs.readFileSync(path.resolve(__dirname,'..','app','(app)','crm','atendimento',rel),'utf8');
// 16/10/2026 11:00 em Manaus (UTC-4).
const AGORA=new Date('2026-10-16T15:00:00Z');

describe('quando o automático volta (Manaus)',()=>{
 it('hoje: só "às HH:MM"',()=>expect(quandoRetoma(new Date('2026-10-16T16:13:00Z'),AGORA)).toBe('às 12:13'));
 it('amanhã: "amanhã às HH:MM"',()=>expect(quandoRetoma(new Date('2026-10-17T04:13:00Z'),AGORA)).toBe('amanhã às 00:13'));
 it('depois: "dd/mm às HH:MM"',()=>expect(quandoRetoma(new Date('2026-10-19T15:05:00Z'),AGORA)).toBe('19/10 às 11:05'));
 it('usa o dia de Manaus, não o UTC',()=>{
  // 17/10 02:00Z ainda é 16/10 22:00 em Manaus: hoje.
  expect(quandoRetoma(new Date('2026-10-17T02:00:00Z'),AGORA)).toBe('às 22:00');
 });
});

describe('frase de quem responde',()=>{
 it('equipe com horário de retorno',()=>{
  const f=fraseQuemResponde({modo:'equipe',retomaEm:new Date('2026-10-17T04:13:00Z')},AGORA);
  expect(f).toBe('A equipe está respondendo. O automático volta sozinho amanhã às 00:13 se ninguém responder.');
 });
 it('equipe sem horário: fica pausado até alguém retomar',()=>{
  expect(fraseQuemResponde({modo:'equipe',retomaEm:null},AGORA)).toBe('A equipe está respondendo. O automático fica pausado até alguém retomar.');
 });
 it('automático ativo e desligado no sistema',()=>{
  expect(fraseQuemResponde({modo:'automatico',retomaEm:null},AGORA)).toContain('O automático está atendendo esta conversa');
  expect(fraseQuemResponde({modo:'desligado',retomaEm:null},AGORA)).toContain('desligado no sistema');
 });
 it('o modo vem do texto de estado de sempre',()=>{
  expect(modoDoEstado('Automático gratuito disponível para assuntos previstos')).toBe('automatico');
  for(const e of ['Automático pausado pela equipe','Pausa após resposta humana até 14:00','Cliente pediu para parar — aguardar VOLTAR'])expect(modoDoEstado(e)).toBe('equipe');
  expect(modoDoEstado('Automático gratuito desligado')).toBe('desligado');
 });
});

describe('janela restante',()=>{
 it('horas cheias, minutos e encerrada',()=>{
  expect(janelaRestante(new Date('2026-10-16T13:00:00Z'),AGORA)).toBe('22h'); // entrada 2h atrás
  expect(janelaRestante(new Date('2026-10-15T15:30:00Z'),AGORA)).toBe('30min');
  expect(janelaRestante(new Date('2026-10-15T15:00:00Z'),AGORA)).toBeNull();
  expect(janelaRestante(null,AGORA)).toBeNull();
 });
});

describe('o menu chama as MESMAS ações de hoje',()=>{
 it('Equipe responde = Assumir (retomar=false); Automático responde = Retomar (retomar=true)',async()=>{
  const c=vi.fn().mockResolvedValue({ok:true,message:'ok'});
  await mudarQuemResponde({escolha:'equipe',atual:'automatico',telefone:'5592900000001',controlar:c});
  expect(c).toHaveBeenLastCalledWith('5592900000001',false);
  await mudarQuemResponde({escolha:'automatico',atual:'equipe',telefone:'5592900000001',controlar:c});
  expect(c).toHaveBeenLastCalledWith('5592900000001',true);
 });
 it('escolher a opção já marcada não repete a ação (Equipe com a equipe, Automático com o automático)',async()=>{
  const c=vi.fn().mockResolvedValue({ok:true,message:'ok'});
  expect(await mudarQuemResponde({escolha:'equipe',atual:'equipe',telefone:'1',controlar:c})).toBeNull();
  expect(c).not.toHaveBeenCalled();
  expect(await mudarQuemResponde({escolha:'automatico',atual:'automatico',telefone:'1',controlar:c})).toBeNull();
  expect(c).not.toHaveBeenCalled();
 });
});

describe('aviso de envio só com problema',()=>{
 it('integração oficial ativa: nenhum aviso',()=>expect(avisoDeEnvio(true)).toBeNull());
 it('integração fora: título, texto e para onde ir',()=>{
  expect(avisoDeEnvio(false)).toEqual({titulo:'Envio indisponível.',texto:'A conexão com o WhatsApp oficial caiu.',acao:'Ver conexão',href:'/configuracoes'});
 });
 it('Reply renderiza role=alert só quando há problema',()=>{
  const ok=renderToStaticMarkup(React.createElement(Reply,{telefone:'5592900000001',aberta:true,estadoAutomatico:'x'}));
  expect(ok).not.toContain('role="alert"');expect(ok).not.toContain('Envio indisponível');
  const ruim=renderToStaticMarkup(React.createElement(Reply,{telefone:'5592900000001',aberta:true,estadoAutomatico:'x',envioIndisponivel:true}));
  expect(ruim).toContain('role="alert"');expect(ruim).toContain('Envio indisponível.');expect(ruim).toContain('A conexão com o WhatsApp oficial caiu.');
  expect(ruim).toMatch(/<a[^>]*href="\/configuracoes"[^>]*>Ver conexão<\/a>/);
  expect(ruim).toContain('text-warning-text');expect(ruim).toContain('bg-warning-bg');
 });
});

describe('respostas prontas no ⚡ e no "/"',()=>{
 it('atalhos por nome nas 6 prontas',()=>{
  expect(PRONTAS.map(p=>p.atalho)).toEqual(['oi','modelo','entrega','pagamento','humano','fim']);
 });
 it('"/pag" filtra para Conferir pagamento; "/" sozinho lista todas; "/oi" põe Boas-vindas primeiro',()=>{
  expect(filtrarProntas(PRONTAS,termoDeBarra('/pag')!).map(p=>p.titulo)).toEqual(['Conferir pagamento']);
  expect(filtrarProntas(PRONTAS,termoDeBarra('/')!)).toHaveLength(6);
  expect(filtrarProntas(PRONTAS,termoDeBarra('/oi')!)[0].titulo).toBe('Boas-vindas');
  expect(filtrarProntas(PRONTAS,termoDeBarra('/fim')!).map(p=>p.titulo)).toEqual(['Encerrar']);
  expect(termoDeBarra('oi /pag')).toBeNull();
 });
 it('os 6 chips fixos saem do markup do composer; ficam o ⚡, o campo e o placeholder novo',()=>{
  const html=renderToStaticMarkup(React.createElement(Reply,{telefone:'5592900000001',aberta:true,estadoAutomatico:'x'}));
  expect(html).not.toMatch(/role="group"[^>]*aria-label="Respostas prontas"/);
  for(const t of ['Boas-vindas','Pedir modelo','Encerrar'])expect(html).not.toContain(t);
  expect(html).toContain('placeholder="Escreva uma mensagem ou digite / para respostas prontas"');
  expect(html).toMatch(/<button[^>]*aria-label="Respostas prontas e atalhos"/);
  expect(html).not.toContain('Assumir conversa');expect(html).not.toContain('A equipe está no comando');
 });
 it('o painel do ⚡ tem a aba Respostas prontas com busca',()=>{
  const f=ler('atalhos-painel.tsx');
  expect(f).toContain("['prontas', 'Respostas prontas']");expect(f).toContain('Buscar resposta pronta');
 });
});

describe('quem responde no cabeçalho',()=>{
 const props={telefone:'5592900000001',estadoAutomatico:'Pausa após resposta humana até 16/10/2026 12:13',retomaEm:'2026-10-16T16:13:00Z',agora:AGORA};
 it('pílula com o estado, aria-label completo e menu',()=>{
  const html=renderToStaticMarkup(React.createElement(QuemResponde,props));
  expect(html).toContain('Equipe responde');
  expect(html).toMatch(/<button[^>]*aria-haspopup="menu"[^>]*aria-label="Quem responde esta conversa: Equipe\. Abrir opções"/);
  const auto=renderToStaticMarkup(React.createElement(QuemResponde,{...props,estadoAutomatico:'Automático gratuito disponível para assuntos previstos',retomaEm:null}));
  expect(auto).toContain('Automático responde');expect(auto).toContain('Quem responde esta conversa: Automático');
 });
 it('no celular o texto some e fica só o ícone',()=>{
  const html=renderToStaticMarkup(React.createElement(QuemResponde,props));
  expect(html).toMatch(/class="[^"]*max-sm:sr-only[^"]*">Equipe responde/);
 });
 it('o menu usa itens radio e as ações de sempre, mais atualizar e ajuda',()=>{
  const f=ler('quem-responde.tsx');
  for(const t of ['DropdownMenuRadioItem','Equipe responde','Automático responde','O automático fica pausado nesta conversa','A IA volta a atender esta conversa agora','Atualizar estado','Como funciona o automático','mudarQuemResponde','router.refresh'])expect(f).toContain(t);
 });
 it('a ajuda continua no DOM para leitor de tela',()=>{
  const html=renderToStaticMarkup(React.createElement(QuemResponde,{...props,aberta:true}));
  expect(html).toContain('Templates com tarifa continuam bloqueados');expect(html).toContain('Clicar no botão não envia a mensagem');
 });
 it('ConversaChat põe o seletor ao lado da janela e mostra o tempo restante',()=>{
  const html=renderToStaticMarkup(React.createElement(ConversaChat,{telefone:'5592900000001',nome:'Ana Souza',aberta:true,semResposta:false,estadoAutomatico:'x',fichaHref:'/f',mensagens:[],agora:AGORA,janelaAte:'2026-10-17T13:00:00Z'}));
  expect(html).toContain('Janela aberta · 22h');expect(html).toContain('Quem responde esta conversa');
 });
});
