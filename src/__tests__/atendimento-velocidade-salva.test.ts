import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHAVE_VELOCIDADE, lerVelocidadeSalva, salvarVelocidade } from '@/app/(app)/crm/atendimento/player-audio-regras';

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } }; };

describe('velocidade do áudio fica salva no navegador', () => {
  it('lê o que foi salvo e só aceita 1, 1,5 e 2', () => {
    const s = mem();
    expect(lerVelocidadeSalva(s)).toBe(1);
    salvarVelocidade(1.5, s);
    expect(lerVelocidadeSalva(s)).toBe(1.5);
    s.setItem(CHAVE_VELOCIDADE, '7');
    expect(lerVelocidadeSalva(s)).toBe(1);
    s.setItem(CHAVE_VELOCIDADE, 'lixo');
    expect(lerVelocidadeSalva(s)).toBe(1);
  });
  it('storage indisponível (aba privada, bloqueado) não quebra', () => {
    const quebrado = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
    expect(lerVelocidadeSalva(quebrado)).toBe(1);
    expect(() => salvarVelocidade(2, quebrado)).not.toThrow();
    expect(lerVelocidadeSalva(null)).toBe(1);
  });
  it('o player usa a velocidade salva, compartilhada entre os áudios, e não volta para 1× ao terminar', () => {
    const f = readFileSync('src/app/(app)/crm/atendimento/player-audio.tsx', 'utf8');
    expect(f).toContain('useSyncExternalStore');
    expect(f).toContain('salvarVelocidade(');
    expect(f).not.toContain('setVelocidade(1)');
  });
});
