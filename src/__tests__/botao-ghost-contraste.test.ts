import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const v = readFileSync('src/components/ui/button-variants.ts', 'utf8');
const ghost = v.split('\n').find(l => l.trim().startsWith('ghost:')) ?? '';

describe('Button ghost: hover e estado aberto com contraste (ícone cinza não pode ficar sobre verde)', () => {
  it('hover usa o fundo de controle, não o accent verde', () => {
    expect(ghost).not.toContain('hover:bg-accent');
    expect(ghost).toContain('hover:bg-controle');
    expect(ghost).toContain('hover:text-foreground');
  });
  it('ícones filhos acompanham o texto no hover (não ficam presos ao cinza)', () => {
    expect(ghost).toContain('hover:[&_svg]:text-foreground');
  });
  it('aberto/expandido fica marcado', () => {
    expect(ghost).toContain('aria-expanded:bg-controle');
    expect(ghost).toContain('data-[state=open]:bg-controle');
  });
});
