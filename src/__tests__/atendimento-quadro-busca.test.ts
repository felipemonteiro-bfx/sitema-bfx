// Achados 2 e 8 da revisão: a busca do quadro volta ao servidor (q na URL, com debounce) e o Sheet não perde edição.
import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.stubGlobal('React', React);
import { AVISO_LIMITE, DEBOUNCE_BUSCA_MS, LIMITE_QUADRO, avisoDoLimite, precisaNavegar, qDoQuadro, urlDaBuscaDoQuadro } from '@/app/(app)/crm/atendimento/kanban-busca';
import { impedirFecharComEdicao } from '@/app/(app)/crm/atendimento/refresh-regras';
import { BarraKanban } from '@/app/(app)/crm/atendimento/kanban-barra';

const DIR = 'src/app/(app)/crm/atendimento/';
const kanban = readFileSync(DIR + 'kanban.tsx', 'utf8');

describe('busca do quadro no servidor', () => {
  it('qDoQuadro apara e limita a 100, como a tela faz com o q da URL', () => {
    expect(qDoQuadro('  maria  ')).toBe('maria');
    expect(qDoQuadro('x'.repeat(150))).toHaveLength(100);
  });
  it('a URL leva visao=kanban e q; campo vazio limpa o q', () => {
    expect(urlDaBuscaDoQuadro('/crm/atendimento', 'maria')).toBe('/crm/atendimento?visao=kanban&q=maria');
    expect(urlDaBuscaDoQuadro('/crm/atendimento', '   ')).toBe('/crm/atendimento?visao=kanban');
  });
  it('só navega quando o texto (normalizado) difere do q atual', () => {
    expect(precisaNavegar('maria ', 'maria')).toBe(false);
    expect(precisaNavegar('mari', 'maria')).toBe(true);
    expect(precisaNavegar('', 'maria')).toBe(true);
  });
  it('debounce de 400 ms', () => { expect(DEBOUNCE_BUSCA_MS).toBe(400); });
  it('aviso discreto só quando a consulta bateu no teto de 100', () => {
    expect(LIMITE_QUADRO).toBe(100);
    expect(AVISO_LIMITE).toBe('Mostrando as 100 conversas mais recentes. Use a busca para achar outras.');
    expect(avisoDoLimite(99)).toBeNull();
    expect(avisoDoLimite(100)).toBe(AVISO_LIMITE);
  });
  it('kanban.tsx: debounce + router.replace, sem filtro local por texto e com o aviso', () => {
    expect(kanban).toContain('DEBOUNCE_BUSCA_MS');
    expect(kanban).toContain('router.replace(urlDaBuscaDoQuadro(');
    expect(kanban).toContain('clearTimeout');
    expect(kanban).toContain("busca:''"); // o filtro local fica só para responsável e "sem classificação"
    expect(kanban).not.toContain('{busca,responsavel');
    expect(kanban).toContain('avisoDoLimite(cartoes.length)');
  });
  it('a barra mostra o texto digitado e avisa a mudança', () => {
    const onBusca = vi.fn();
    const h = renderToStaticMarkup(React.createElement(BarraKanban, { filtros: { busca: '', responsavel: 'todos', soSemClassificacao: false }, busca: 'mar', onBusca, onFiltros: vi.fn(), etapa: 'todas', onEtapa: vi.fn(), contagemPorEtapa: {}, total: 1, pessoas: [], movendo: false, onAtualizar: vi.fn() }));
    expect(h).toContain('value="mar"');
  });
});

describe('Sheet do quadro não perde edição', () => {
  it('impedirFecharComEdicao faz preventDefault só com edição pendente', () => {
    const ev = () => ({ preventDefault: vi.fn() });
    const suja = { querySelector: () => ({}) };
    const limpa = { querySelector: () => null };
    const a = ev(); impedirFecharComEdicao(a, suja); expect(a.preventDefault).toHaveBeenCalled();
    const b = ev(); impedirFecharComEdicao(b, limpa); expect(b.preventDefault).not.toHaveBeenCalled();
  });
  it('kanban.tsx: modal abaixo de sm e guarda de clique/foco fora em qualquer largura', () => {
    expect(kanban).not.toContain('modal={false}');
    expect(kanban).toContain('modal={modal}');
    expect(kanban).toContain('(min-width: 40rem)');
    expect(kanban).toContain('onPointerDownOutside={barrarFechamento}');
    expect(kanban).toContain('onInteractOutside={barrarFechamento}');
  });
});
