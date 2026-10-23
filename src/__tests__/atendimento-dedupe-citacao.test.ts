import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { predicadoCitacao } from '@/lib/whatsapp-atendimento-guardas';

const dir = join(process.cwd(), 'src/app/(app)/crm/atendimento');

describe('dedupe de 90 s considera a mensagem citada', () => {
  it('predicadoCitacao: mesma citação casa; sem citação só casa sem citação', () => {
    expect(predicadoCitacao('wamid.A')).toEqual({ respondeAWaId: 'wamid.A' });
    expect(predicadoCitacao(null)).toEqual({ respondeAWaId: null });
  });
  it('texto e mídia usam o predicado no where do dedupe', () => {
    expect(readFileSync(join(dir, 'actions.ts'), 'utf8')).toContain('...predicadoCitacao(citadaWaId)');
    expect(readFileSync(join(dir, 'midia-actions.ts'), 'utf8')).toContain('...predicadoCitacao(citadaWaId)');
  });
});
