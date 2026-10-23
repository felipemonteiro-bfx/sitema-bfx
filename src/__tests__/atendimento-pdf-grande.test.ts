// PDF grande: o visualizador não mede todas as páginas ao abrir e limita as páginas exibidas.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LIMITE_PAGINAS_EXIBIDAS, RAZAO_PADRAO, paginasExibidas, avisoLimitePaginas } from '@/app/(app)/crm/atendimento/pdf-regras';

const DIR = 'src/app/(app)/crm/atendimento/';
const viz = readFileSync(DIR + 'pdf-visualizador.tsx', 'utf8');
const mini = readFileSync(DIR + 'pdf-miniatura.tsx', 'utf8');

describe('regras de PDF grande', () => {
  it('teto de 500 páginas e aviso só quando passa', () => {
    expect(LIMITE_PAGINAS_EXIBIDAS).toBe(500);
    expect(paginasExibidas(12)).toBe(12);
    expect(paginasExibidas(5000)).toBe(500);
    expect(avisoLimitePaginas(500)).toBeNull();
    expect(avisoLimitePaginas(501)).toBe('Mostrando as 500 primeiras páginas. Baixe para ver o resto.');
    expect(RAZAO_PADRAO).toBeCloseTo(1.414, 2);
  });
});

describe('visualizador: nada de medir todas as páginas ao abrir', () => {
  it('sem Promise.all de getPage na abertura; proporção medida sob demanda na página visível', () => {
    expect(viz).not.toMatch(/Promise\.all\(Array\.from\(\{ length: pdf\.numPages/);
    expect(viz).toContain('RAZAO_PADRAO');
    expect(viz).toContain('aoMedir');
    expect(viz).toContain('paginasExibidas(');
    expect(viz).toContain('avisoLimitePaginas(');
  });
  it('miniatura só pega a página 1', () => {
    expect(mini).toContain('getPage(1)');
    expect(mini).not.toContain('numPages');
  });
});
