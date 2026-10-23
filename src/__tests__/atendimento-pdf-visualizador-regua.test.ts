// Visualizador de PDF como o WhatsApp Web: régua flutuante, cabeçalho "<Remetente> · <arquivo>" e data relativa.
// O Dialog do Radix vai para um portal (não renderiza em renderToStaticMarkup): a marcação é conferida pela fonte.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dataRelativa, rotuloRemetente } from '@/app/(app)/crm/atendimento/status-mensagem';

const DIR = 'src/app/(app)/crm/atendimento/';
const fonte = (a: string) => readFileSync(DIR + a, 'utf8');
const viz = fonte('pdf-visualizador.tsx');

// 16/10/2026 às 22:30 em Manaus (UTC-4) = 02:30Z do dia 17.
const AGORA = new Date('2026-10-17T02:30:00Z');

describe('dataRelativa (Manaus)', () => {
  it('Hoje às HH:mm', () => expect(dataRelativa(new Date('2026-10-17T02:20:00Z'), AGORA)).toBe('Hoje às 22:20'));
  it('Ontem às HH:mm', () => expect(dataRelativa(new Date('2026-10-15T19:54:00Z'), AGORA)).toBe('Ontem às 15:54'));
  it('antes disso: dd/mm/aaaa às HH:mm', () => expect(dataRelativa(new Date('2026-08-22T22:48:00Z'), AGORA)).toBe('22/08/2026 às 18:48'));
  it('o dia vale no fuso de Manaus, não em UTC', () => {
    // 01:00Z de 17/10 ainda é 21:00 de 16/10 em Manaus: hoje.
    expect(dataRelativa(new Date('2026-10-17T01:00:00Z'), AGORA)).toBe('Hoje às 21:00');
  });
  it('aceita ISO (a data atravessa a fronteira servidor/cliente como string)', () => {
    expect(dataRelativa('2026-10-17T02:20:00.000Z', AGORA)).toBe('Hoje às 22:20');
  });
});

describe('rotuloRemetente', () => {
  it('enviado: Você', () => expect(rotuloRemetente({ saida: true, nome: 'Maria' })).toBe('Você'));
  it('recebido: o nome do contato', () => expect(rotuloRemetente({ saida: false, nome: 'Maria Souza' })).toBe('Maria Souza'));
  it('recebido sem nome (só o telefone): telefone formatado', () => {
    expect(rotuloRemetente({ saida: false, nome: '5592999990001' })).toBe('+55 92 99999-0001');
  });
  it('sem nome nenhum: Cliente', () => expect(rotuloRemetente({ saida: false })).toBe('Cliente'));
});

describe('pdf-visualizador.tsx: régua flutuante', () => {
  it('a coluna lateral de altura inteira some e a régua é um cartão absoluto, à direita, centrado na vertical', () => {
    expect(viz).not.toContain('border-l border-divisoria');
    expect(viz).not.toContain('w-14 shrink-0');
    const nav = viz.split('<nav')[1].split('>')[0];
    for (const c of ['absolute', 'right-', 'top-1/2', '-translate-y-1/2', 'rounded-2xl', 'bg-popover/', 'border border-divisoria']) expect(nav).toContain(c);
  });
  it('página atual numa caixa de 40px com o total embaixo e aria-live "Página N de M"', () => {
    expect(viz).toContain('aria-live="polite"');
    expect(viz).toContain('`Página ${atual} de ${total}`');
    expect(viz).toContain('size-10');
  });
  it('setas desabilitadas nas pontas e zoom com a porcentagem só no aria-label', () => {
    expect(viz).toContain('disabled={atual <= 1}');
    expect(viz).toContain('disabled={atual >= total}');
    expect(viz).toContain('`Aumentar zoom (${zoom}%)`');
    expect(viz).toContain('`Diminuir zoom (${zoom}%)`');
    expect(viz).not.toContain('{zoom}%</span>');
  });
  it('sem lista de miniaturas numeradas por página', () => {
    expect(viz).not.toContain('Array.from({ length: total }');
  });
  it('a página fica centralizada na largura toda', () => {
    expect(viz).toContain('mx-auto');
    expect(viz).toContain('relative flex min-h-0 flex-1');
  });
});

describe('pdf-visualizador.tsx: cabeçalho', () => {
  it('linha 1 "<Remetente> · <arquivo>", linha 2 na fonte normal com data relativa, páginas e KB', () => {
    expect(viz).toContain('{d.remetente} · ');
    expect(viz).toContain('dataRelativa(');
    expect(viz).toContain("replace(' kB', ' KB')");
    expect(viz).not.toMatch(/DialogDescription className="[^"]*font-mono/);
  });
  it('mantém o botão Baixar com ícone e texto', () => {
    expect(viz).toContain('<Download');
    expect(viz).toContain('Baixar</a>');
  });
});

describe('remetente e data chegam ao visualizador', () => {
  it('bolha-midia passa rotuloRemetente e a data da mensagem (não mais "BFX"/"Cliente" fixos)', () => {
    const b = fonte('bolha-midia.tsx');
    expect(b).toContain('rotuloRemetente({ saida, nome: contato })');
    expect(b.split('<BolhaPdf')[1].split('/>')[0]).not.toContain("'BFX'");
    expect(b).toContain('quando');
    expect(fonte('bolha.tsx')).toContain('quando: m.criadoEm');
  });
});
