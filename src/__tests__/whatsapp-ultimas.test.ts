import { describe, it, expect, vi } from 'vitest';

const findMany = vi.fn();
vi.mock('@/lib/db', () => ({ prisma: { whatsAppMensagem: { findMany: (a: unknown) => findMany(a) } } }));

import { ultimasMensagensPorTelefone } from '@/lib/whatsapp-ultimas';

const t1 = new Date('2026-10-16T10:00:00Z');
const t2 = new Date('2026-10-16T11:00:00Z');

describe('ultimasMensagensPorTelefone', () => {
  it('não usa distinct (que carregaria todas as mensagens) e filtra por (telefone, criadoEm)', async () => {
    findMany.mockResolvedValueOnce([]);
    await ultimasMensagensPorTelefone([
      { telefone: '5592900000001', _max: { criadoEm: t1 } },
      { telefone: '5592900000002', _max: { criadoEm: t2 } },
    ]);
    const arg = findMany.mock.calls[0][0];
    expect(arg.distinct).toBeUndefined();
    expect(arg.where.direcao).toEqual({ in: ['in', 'out'] });
    expect(arg.where.OR).toEqual([
      { telefone: '5592900000001', criadoEm: t1 },
      { telefone: '5592900000002', criadoEm: t2 },
    ]);
  });
  it('ignora linhas "gerando" (resposta ainda não enviada) na prévia', async () => {
    findMany.mockResolvedValueOnce([]);
    await ultimasMensagensPorTelefone([{ telefone: '5592900000001', _max: { criadoEm: t1 } }]);
    expect(findMany.mock.calls.at(-1)![0].where.status).toEqual({ not: 'gerando' });
  });
  it('em empate de criadoEm no mesmo telefone fica a de maior id', async () => {
    findMany.mockResolvedValueOnce([
      { id: 5, telefone: 'a', direcao: 'in', corpo: 'velha', criadoEm: t1 },
      { id: 9, telefone: 'a', direcao: 'out', corpo: 'nova', criadoEm: t1 },
      { id: 7, telefone: 'b', direcao: 'in', corpo: 'b', criadoEm: t2 },
    ]);
    const r = await ultimasMensagensPorTelefone([
      { telefone: 'a', _max: { criadoEm: t1 } },
      { telefone: 'b', _max: { criadoEm: t2 } },
    ]);
    expect(r.find(m => m.telefone === 'a')?.corpo).toBe('nova');
    expect(r).toHaveLength(2);
  });
  it('sem grupos não consulta o banco', async () => {
    findMany.mockClear();
    expect(await ultimasMensagensPorTelefone([])).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});
