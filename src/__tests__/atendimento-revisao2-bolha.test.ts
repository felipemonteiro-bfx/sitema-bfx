// Revisão 2, itens 3, 4 e 5: setinha no toque, Copiar no menu da bolha, clique engolido do gesto.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const toast = vi.fn();
vi.mock('sonner', () => ({ toast: Object.assign((...a: unknown[]) => toast(...a), { error: (...a: unknown[]) => toast(...a) }) }));

import { copiarTexto, itensMenu } from '@/app/(app)/crm/atendimento/menu-mensagem';

const DIR = join(process.cwd(), 'src/app/(app)/crm/atendimento');
const fonte = (n: string) => readFileSync(join(DIR, n), 'utf8');
const ID = '3f2b8c1e-5a4d-4e6f-9a7b-1c2d3e4f5a6b';

describe('item 3: a setinha invisível no toque não recebe toque', () => {
  it('revelar tem pointer-coarse:pointer-events-none (continua âncora; só segurar abre)', () => {
    const s = readFileSync(join(process.cwd(), 'src/components/ui/button-variants.ts'), 'utf8');
    const linha = s.split('\n').find(l => l.includes('pointer-coarse:opacity-0') && l.includes('group-hover/msg')) ?? '';
    expect(linha).toContain('pointer-coarse:pointer-events-none');
  });
});

describe('item 4: Copiar', () => {
  it('itensMenu: Copiar entre Responder e Baixar, só com texto', () => {
    expect(itensMenu({ podeResponder: true, midiaId: ID, texto: 'oi' }).map(i => i.chave)).toEqual(['responder', 'copiar', 'baixar']);
    expect(itensMenu({ podeResponder: false, midiaId: null, texto: 'oi' })).toEqual([{ chave: 'copiar', texto: 'oi' }]);
    expect(itensMenu({ podeResponder: false, midiaId: null, texto: '  ' })).toEqual([]);
    expect(itensMenu({ podeResponder: true, midiaId: null, texto: null }).map(i => i.chave)).toEqual(['responder']);
  });
  describe('copiarTexto', () => {
    beforeEach(() => { toast.mockClear(); });
    it('grava na área de transferência e avisa "Copiado"', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', { clipboard: { writeText } });
      await copiarTexto('olá');
      expect(writeText).toHaveBeenCalledWith('olá');
      expect(toast).toHaveBeenCalledWith('Copiado');
    });
    it('se a cópia falhar, avisa em vez de fingir', async () => {
      vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('negado')) } });
      await copiarTexto('olá');
      expect(toast).toHaveBeenCalledWith('Não foi possível copiar');
    });
  });
  it('a bolha passa texto (corpo ou legenda) ao menu', () => {
    const b = fonte('bolha.tsx');
    expect(b).toMatch(/interativa = \{[^}]*texto/);
    expect(b).toContain('legenda');
    expect(fonte('bolha-interativa.tsx')).toContain('texto');
  });
  it('desktop: com texto selecionado o botão direito não é interceptado', () => {
    const s = fonte('bolha-interativa.tsx');
    expect(s).toContain('getSelection()');
    expect(s.indexOf('getSelection()')).toBeLessThan(s.indexOf('e.preventDefault()'));
  });
  it('touch-callout só fora de links', () => {
    const s = fonte('bolha-interativa.tsx');
    expect(s).toContain('[&_a]:[-webkit-touch-callout:default]');
    expect(s).toContain('[&_a_*]:[-webkit-touch-callout:default]');
  });
});

describe('item 5: engolirClique não vaza para o próximo toque', () => {
  const s = fonte('gesto-responder.ts');
  it('zera no começo de baixou, antes de qualquer return', () => {
    const corpo = s.slice(s.indexOf('const baixou'), s.indexOf('const moveu'));
    const i = corpo.indexOf('s.engolirClique = false');
    expect(i).toBeGreaterThan(-1);
    expect(i).toBeLessThan(corpo.indexOf('return'));
  });
  it('e some sozinho logo depois do pointerup/pointercancel', () => {
    expect(s).toMatch(/limparEngolir|setTimeout\(\(\) => \{ s\.engolirClique = false/);
    expect(s).toContain("el.addEventListener('pointerup', agendarLimpeza)");
  });
});
