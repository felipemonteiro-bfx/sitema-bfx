// Achado 7: o cache de PDFDocumentProxy não cresce sem limite; sai o menos usado e o documento é destruído.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { criarCacheLru } from '@/app/(app)/crm/atendimento/pdf-cache';

describe('criarCacheLru', () => {
  it('passando do máximo, remove o menos recentemente usado e avisa quem saiu', () => {
    const saiu = vi.fn();
    const c = criarCacheLru<string>(3, saiu);
    c.set('a', 'A'); c.set('b', 'B'); c.set('c', 'C');
    c.set('d', 'D');
    expect(saiu).toHaveBeenCalledTimes(1);
    expect(saiu).toHaveBeenCalledWith('A');
    expect(c.get('a')).toBeUndefined();
    expect(c.tamanho()).toBe(3);
  });
  it('ler renova a posição: quem foi lido não é o próximo a sair', () => {
    const saiu = vi.fn();
    const c = criarCacheLru<string>(3, saiu);
    c.set('a', 'A'); c.set('b', 'B'); c.set('c', 'C');
    expect(c.get('a')).toBe('A');
    c.set('d', 'D');
    expect(saiu).toHaveBeenCalledWith('B');
    expect(c.get('a')).toBe('A');
  });
  it('apagar manualmente (erro de download) não chama aoRemover', () => {
    const saiu = vi.fn();
    const c = criarCacheLru<string>(2, saiu);
    c.set('a', 'A'); c.delete('a');
    expect(saiu).not.toHaveBeenCalled();
    expect(c.tamanho()).toBe(0);
  });
});

describe('pdf-cliente guarda até 3 ociosos e destrói o documento removido', () => {
  const fonte = readFileSync('src/app/(app)/crm/atendimento/pdf-cliente.ts', 'utf8');
  it('máx. 3 e destroy()', () => {
    expect(fonte).toContain('criarCacheComReferencias');
    expect(fonte).toContain('MAX_DOCUMENTOS = 3');
    expect(fonte).toMatch(/criarCacheComReferencias<Promise<PDFDocumentProxy>>\(MAX_DOCUMENTOS,/);
    expect(fonte).toContain('.destroy()');
    expect(fonte).not.toContain('new Map<string, Promise<PDFDocumentProxy>>()');
  });
});
