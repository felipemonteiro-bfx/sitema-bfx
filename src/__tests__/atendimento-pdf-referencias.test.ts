// Revisão 2, item 1: o LRU não pode destruir PDF em uso. Contagem de referências: só documento solto (0) pode ser destruído.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { criarCacheComReferencias } from '@/app/(app)/crm/atendimento/pdf-cache';

const doc = (nome: string) => ({ nome, destroy: vi.fn() });

describe('criarCacheComReferencias', () => {
  it('4 aberturas simultâneas (limite 3): nenhum documento em uso é destruído', () => {
    const destruidos: string[] = [];
    const c = criarCacheComReferencias<string>(3, d => destruidos.push(d));
    const a = ['a', 'b', 'c', 'd'].map(k => c.adquirir(k, () => k.toUpperCase()));
    expect(destruidos).toEqual([]);
    expect(a.map(x => x.valor)).toEqual(['A', 'B', 'C', 'D']);
  });
  it('ao soltar, só os ociosos entram na conta do limite; o mais antigo é destruído', () => {
    const destruidos: string[] = [];
    const c = criarCacheComReferencias<string>(2, d => destruidos.push(d));
    const r = ['a', 'b', 'c', 'd'].map(k => c.adquirir(k, () => k.toUpperCase()));
    r[0].soltar(); r[1].soltar();
    expect(destruidos).toEqual([]);
    r[2].soltar();
    expect(destruidos).toEqual(['A']);
    r[3].soltar();
    expect(destruidos).toEqual(['A', 'B']);
  });
  it('dois usuários do mesmo id compartilham o documento e só o último soltar o libera', () => {
    const destruidos: string[] = [];
    const criar = vi.fn(() => 'X');
    const c = criarCacheComReferencias<string>(0, d => destruidos.push(d));
    const um = c.adquirir('x', criar);
    const dois = c.adquirir('x', criar);
    expect(criar).toHaveBeenCalledTimes(1);
    um.soltar();
    expect(destruidos).toEqual([]);
    dois.soltar();
    expect(destruidos).toEqual(['X']);
  });
  it('soltar duas vezes conta uma só; documento ocioso é reaproveitado sem recriar', () => {
    const destruidos: string[] = [];
    const criar = vi.fn(() => 'X');
    const c = criarCacheComReferencias<string>(3, d => destruidos.push(d));
    const um = c.adquirir('x', criar);
    um.soltar(); um.soltar();
    const dois = c.adquirir('x', criar);
    expect(criar).toHaveBeenCalledTimes(1);
    dois.soltar();
    expect(destruidos).toEqual([]);
  });
  it('descartar (erro de download) tira do cache sem destruir', () => {
    const destruidos: string[] = [];
    const criar = vi.fn(() => 'X');
    const c = criarCacheComReferencias<string>(3, d => destruidos.push(d));
    const um = c.adquirir('x', criar);
    c.descartar('x');
    um.soltar();
    c.adquirir('x', criar);
    expect(criar).toHaveBeenCalledTimes(2);
    expect(destruidos).toEqual([]);
  });
});

describe('pdf-cliente, miniatura e visualizador usam a contagem de referências', () => {
  const dir = 'src/app/(app)/crm/atendimento/';
  it('abrirPdf devolve soltar; quem abre solta ao desmontar', () => {
    expect(readFileSync(dir + 'pdf-cliente.ts', 'utf8')).toContain('criarCacheComReferencias');
    expect(readFileSync(dir + 'pdf-cliente.ts', 'utf8')).toContain('soltar');
    for (const f of ['pdf-miniatura.tsx', 'pdf-visualizador.tsx']) expect(readFileSync(dir + f, 'utf8')).toContain('soltar()');
  });
});
