import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { podeTrocarCartao, aplicarAlteracao, AVISO_EDICAO_PENDENTE } from '@/app/(app)/crm/atendimento/refresh-regras';

const dir = join(process.cwd(), 'src/app/(app)/crm/atendimento');
const kanban = readFileSync(join(dir, 'kanban.tsx'), 'utf8');
const organizar = readFileSync(join(dir, 'organizar-conversa.tsx'), 'utf8');
const suja = { querySelector: () => ({}) };
const limpa = { querySelector: () => null };

describe('Sheet do quadro: Escape e troca de cartão', () => {
  it('trocar para outro cartão com edição suja é bloqueado; o mesmo cartão ou formulário limpo passa', () => {
    expect(podeTrocarCartao(suja, 'a', 'b')).toBe(false);
    expect(podeTrocarCartao(suja, 'a', 'a')).toBe(true);
    expect(podeTrocarCartao(limpa, 'a', 'b')).toBe(true);
    expect(podeTrocarCartao(suja, null, 'b')).toBe(true);
    expect(AVISO_EDICAO_PENDENTE).toBe('Salve ou cancele as alterações antes de fechar.');
  });
  it('kanban.tsx liga Escape, troca de cartão e aviso inline', () => {
    expect(kanban).toContain('onEscapeKeyDown');
    expect(kanban).toContain('podeTrocarCartao(document,aberto,t)');
    expect(kanban).toContain('AVISO_EDICAO_PENDENTE');
  });
});

describe('Salvar pelo Sheet sobe a revisão ao pai', () => {
  it('aplicarAlteracao só vale se a revisão for maior que a do servidor', () => {
    const c: any = { telefone: '1', revisao: 5, classificado: false, estado: { versao: 1, etapa: 'novas', responsavelId: null, responsavelNome: 'x', proximaAcao: 'a' } };
    const alt = { revisao: 6, estado: { versao: 1, etapa: 'proximas', responsavelId: 2, responsavelNome: 'Ana', proximaAcao: 'b' } } as any;
    const r = aplicarAlteracao(c, alt);
    expect(r.revisao).toBe(6); expect(r.estado.proximaAcao).toBe('b'); expect(r.classificado).toBe(true);
    expect(aplicarAlteracao({ ...c, revisao: 6 }, alt).revisao).toBe(6);
    expect(aplicarAlteracao({ ...c, revisao: 7 }, alt).revisao).toBe(7);
    expect(aplicarAlteracao(c, undefined)).toBe(c);
  });
  it('organizar-conversa chama onSalvo com a revisão e kanban guarda em alteracoes', () => {
    expect(organizar).toContain('onSalvo');
    expect(organizar).toContain('r.revisao');
    expect(kanban).toContain('aplicarAlteracao');
  });
});
