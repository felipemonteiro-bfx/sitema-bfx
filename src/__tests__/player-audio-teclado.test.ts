import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { acaoDoTeclado } from '@/app/(app)/crm/atendimento/player-audio-regras';

describe('player de áudio pelo teclado', () => {
  it('Espaço, Enter e K tocam/pausam com o foco na barra; setas/Home/End continuam movendo', () => {
    expect(acaoDoTeclado(' ')).toBe('alternar');
    expect(acaoDoTeclado('Enter')).toBe('alternar');
    expect(acaoDoTeclado('k')).toBe('alternar');
    expect(acaoDoTeclado('K')).toBe('alternar');
    expect(acaoDoTeclado('ArrowRight')).toBe('mover');
    expect(acaoDoTeclado('Home')).toBe('mover');
    expect(acaoDoTeclado('a')).toBeNull();
  });
  it('a barra usa acaoDoTeclado e anuncia como tocar/pausar', () => {
    const f = readFileSync('src/app/(app)/crm/atendimento/player-audio.tsx', 'utf8');
    expect(f).toContain('acaoDoTeclado(e.key)');
    expect(f).toContain('aria-keyshortcuts');
  });
});
