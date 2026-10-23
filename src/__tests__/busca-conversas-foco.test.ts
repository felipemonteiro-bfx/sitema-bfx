import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const f = readFileSync('src/app/(app)/crm/atendimento/conversa-lista.tsx', 'utf8');

describe('busca de conversas: um anel de foco só (o da pílula)', () => {
  it('usa o Input variant="nu" em vez de apagar estilos por seletor, que perdia para o brilho do tema escuro', () => {
    expect(f).toContain('state="nu"');
    expect(f).not.toContain('variant="nu"');
    expect(f).not.toContain('[&_input]:focus-visible:ring-0');
  });
  it('texto do campo diz a ação', () => {
    expect(f).toContain('placeholder="Buscar por nome ou telefone"');
  });
});
