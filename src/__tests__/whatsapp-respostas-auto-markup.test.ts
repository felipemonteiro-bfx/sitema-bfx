import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WhatsappRespostasAuto } from '@/components/whatsapp-respostas-auto';
import { disponibilidadeIa, estadoRespostasAuto } from '@/lib/whatsapp-respostas-auto';

const SEG = { MCP_AGENTE_SECRET: 'x'.repeat(32) };
const cfg = { litellmUrl: 'https://llm.exemplo.test', litellmKey: 'sk-fake', litellmModel: 'bfx-atendimento' };
const render = (estado: ReturnType<typeof estadoRespostasAuto>, defaultLigado = true) =>
  renderToStaticMarkup(React.createElement(WhatsappRespostasAuto, { name: 'whatsappPreAtendimento', defaultLigado, estadoSeLigado: estado }));
const ok = estadoRespostasAuto({ ligado: true, masterLigado: true, provedor: 'ok', ia: disponibilidadeIa(cfg, SEG) });

describe('componente das respostas automáticas', () => {
  it('Switch com role=switch, rótulo associado e o name do campo salvo', () => {
    const html = render(ok);
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-labelledby="rot-respostas-auto"');
    expect(html).toContain('id="rot-respostas-auto"');
    expect(html).toContain('Responder clientes automaticamente');
    expect(html).toContain('min-h-11');
    // descrição ligada ao Switch
    const desc = html.split('aria-describedby="')[1]?.split('"')[0];
    expect(desc).toBe('desc-respostas-auto');
    expect(html).toContain('id="desc-respostas-auto"');
  });
  it('o formulário recebe "on" por um input hidden real quando ligado (o Radix só cria o dele depois de hidratar)', () => {
    const ligado = render(ok);
    expect(ligado).toMatch(/<input[^>]*type="hidden"[^>]*name="whatsappPreAtendimento"[^>]*value="on"/);
    expect(render(ok, false)).not.toContain('name="whatsappPreAtendimento"');
  });
  it('a descrição fica dentro do Label do Switch: a linha inteira liga e desliga', () => {
    const html = render(ok);
    const label = html.split('<label')[1]?.split('</label>')[0] ?? '';
    expect(label).toContain('for="whatsappPreAtendimento"');
    expect(label).toContain('Responder clientes automaticamente');
    expect(label).toContain('id="desc-respostas-auto"');
    expect(html).toContain('aria-labelledby="rot-respostas-auto"');
  });
  it('desligado: todas as respostas da tabela dizem Ninguém', () => {
    const html = render(ok, false);
    const tabela = html.split('<table')[1]?.split('</table>')[0] ?? '';
    expect(tabela.split('Ninguém').length - 1).toBe(5);
    expect(tabela).not.toContain('Regras');
    expect(tabela).not.toContain('IA com MCP');
    expect(tabela).not.toContain('pausado');
  });
  it.each([
    ['master desligado', { masterLigado: false, provedor: 'ok' as const }],
    ['provedor não-Meta', { masterLigado: true, provedor: 'nao_meta' as const }],
    ['Meta sem credencial', { masterLigado: true, provedor: 'sem_credencial' as const }],
  ])('%s: nada é enviado, então a tabela inteira diz Ninguém', (_n, parte) => {
    const estado = estadoRespostasAuto({ ligado: true, masterLigado: parte.masterLigado, provedor: parte.provedor, ia: disponibilidadeIa(cfg, SEG) });
    const html = render(estado, true);
    const tabela = html.split('<table')[1]?.split('</table>')[0] ?? '';
    expect(tabela.split('Ninguém').length - 1).toBe(5);
    expect(tabela).not.toContain('Regras');
    expect(tabela).not.toContain('IA com MCP');
    expect(tabela).not.toContain('pausado');
  });
  it('só regras (sem modelo) continua respondendo por regras', () => {
    const semModelo = estadoRespostasAuto({ ligado: true, masterLigado: true, provedor: 'ok', ia: disponibilidadeIa({}, SEG) });
    const tabela = render(semModelo).split('<table')[1]?.split('</table>')[0] ?? '';
    expect(tabela).toContain('Regras · na hora, sem custo');
  });
  it('linha de estado empilha o link abaixo de sm, com o ponto na primeira linha', () => {
    const master = estadoRespostasAuto({ ligado: true, masterLigado: false, provedor: 'ok', ia: disponibilidadeIa(cfg, SEG) });
    const status = render(master).split('role="status"')[1]?.split('>')[0] ?? '';
    expect(status).toContain('flex-col');
    expect(status).toContain('sm:flex-row');
    expect(status).toContain('sm:items-center');
    const ponto = render(master).split('size-2')[0].split('<span').pop() ?? '';
    expect(ponto + 'size-2').toContain('aria-hidden="true"');
    expect(render(master)).toMatch(/mt-1\.5[^"]*size-2/);
  });
  it('linha de estado é role=status com aria-live=polite e mostra o texto do servidor', () => {
    const html = render(ok);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('IA respondendo.');
    expect(html).toContain('Confira que o gateway externo do mcp-bfx está desligado, para o cliente não receber duas respostas.');
    expect(html).toContain('modelo bfx-atendimento');
    expect(html).toContain('bg-success-bg');
    expect(html).not.toContain('bg-accent');
  });
  it('desligado mostra o estado neutro na hora, sem depender do estado do servidor', () => {
    const html = render(ok, false);
    expect(html).toContain('Desligado.');
    expect(html).toContain('As mensagens chegam só para a equipe.');
    expect(html).toContain('bg-poco');
    expect(html).not.toContain('IA respondendo.');
    expect(html).not.toContain('gateway externo');
  });
  it('alerta com link: usa o href do servidor e o token de aviso', () => {
    const html = render(estadoRespostasAuto({ ligado: true, masterLigado: false, provedor: 'ok', ia: disponibilidadeIa(cfg, SEG) }));
    expect(html).toContain('bg-warning-bg');
    expect(html).toContain('text-warning-text');
    expect(html).toContain('href="#whatsappAutoEnabled"');
    expect(html).toContain('Ligar envios');
  });
  it('tabela com as 4 linhas e a nota sobre preço', () => {
    const html = render(ok);
    expect(html).toContain('Saudação e menu');
    expect(html).toContain('Regras · na hora, sem custo');
    expect(html).toContain('ATENDENTE, SAIR ou PARAR');
    expect(html).toContain('Sem resposta automática · o automático pausa');
    expect(html).not.toContain('Saudação, menu, ATENDENTE, SAIR e PARAR');
    expect(html).toContain('Perguntas sobre compras, parcelas, boletos e produtos');
    expect(html).toContain('A IA falhou ou passou de 20 s');
    expect(html).toContain('Alguém da equipe assumiu a conversa');
    expect(html).toContain('A IA nunca informa preço nem confirma pagamento; escrever ATENDENTE chama a equipe.');
  });
  it('2ª linha: IA com MCP, Regras (sem modelo) ou Ninguém', () => {
    expect(render(ok)).toContain('IA com MCP');
    const semModelo = estadoRespostasAuto({ ligado: true, masterLigado: true, provedor: 'ok', ia: disponibilidadeIa({}, SEG) });
    expect(render(semModelo)).toContain('Regras (sem modelo)');
    const master = estadoRespostasAuto({ ligado: true, masterLigado: false, provedor: 'ok', ia: disponibilidadeIa(cfg, SEG) });
    expect(render(master)).toContain('Ninguém');
    expect(render(ok, false)).toContain('Ninguém');
  });
  it('a chave do LiteLLM não existe no componente nem no markup', () => {
    const fonte = readFileSync('src/components/whatsapp-respostas-auto.tsx', 'utf8');
    expect(fonte).not.toMatch(/litellmKey|LITELLM_KEY/);
    expect(render(ok)).not.toContain('sk-fake');
  });
});

describe('tela de atendimento usa a regra única', () => {
  const fonte = readFileSync('src/app/(app)/crm/atendimento/tela-atendimento.tsx', 'utf8');
  it('sem comparação solta com 2 nem o texto antigo', () => {
    expect(fonte).not.toContain('!==2');
    expect(fonte).not.toContain('gratuito desligado');
    expect(fonte).toContain('Respostas automáticas desligadas');
    expect(fonte).toContain('respostasAutoLigadas');
    expect(fonte).toMatch(/select:\{[^}]*whatsappAutoEnabled:true/);
    expect(fonte).toContain('situacaoProvedor');
    expect(fonte).toContain('Respostas automáticas ativas · IA');
    expect(fonte).toContain('Respostas automáticas ativas · regras');
    expect(fonte).toContain('disponibilidadeIa');
    expect(fonte).not.toContain('Automático gratuito disponível');
  });
});
