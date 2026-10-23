// Server Actions da transcrição e da onda: guarda, só áudio, autor da sessão, teto, compare-and-set.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  admin: vi.fn(), sessao: vi.fn(), achar: vi.fn(), atualizar: vi.fn(), msgUpdate: vi.fn(),
}));
vi.mock('@/lib/guards', () => ({ requireAdmin: m.admin }));
vi.mock('@/lib/session', () => ({ getSession: m.sessao }));
vi.mock('@/lib/db', () => ({
  prisma: { whatsAppMidia: { findUnique: m.achar, updateMany: m.atualizar }, whatsAppMensagem: { update: m.msgUpdate, updateMany: m.msgUpdate } },
}));

import { salvarTranscricao, salvarOnda } from '@/app/(app)/crm/atendimento/transcricao-actions';
import { MODELO_TRANSCRICAO } from '@/app/(app)/crm/atendimento/transcricao-actions-constantes';

const ID = '3f2b8c1e-5a4d-4e6f-9a7b-1c2d3e4f5a6b';
beforeEach(() => {
  vi.resetAllMocks();
  m.admin.mockResolvedValue(true);
  m.sessao.mockResolvedValue({ id: 4, username: 'admin', role: 'admin' });
  m.achar.mockResolvedValue({ id: ID, tipo: 'audio', status: 'salva', transcricao: null, onda: null });
  m.atualizar.mockResolvedValue({ count: 1 });
});

describe('salvarTranscricao', () => {
  it('sem sessão admin não toca no banco', async () => {
    m.admin.mockResolvedValue(false);
    const r = await salvarTranscricao(ID, 'oi');
    expect(r.ok).toBe(false);
    expect(m.achar).not.toHaveBeenCalled(); expect(m.atualizar).not.toHaveBeenCalled();
  });
  it('grava texto normalizado, autor da SESSÃO e modelo da constante do servidor, só onde transcricao é nula', async () => {
    const r = await salvarTranscricao(ID, '  Quero   saber\nsim ');
    expect(r).toMatchObject({ ok: true, transcricao: 'Quero saber sim' });
    expect(m.atualizar).toHaveBeenCalledTimes(1);
    const arg = m.atualizar.mock.calls[0]![0];
    expect(arg.where).toEqual({ id: ID, tipo: 'audio', transcricao: null });
    expect(arg.data).toMatchObject({ transcricao: 'Quero saber sim', transcricaoAutorId: 4, transcricaoModelo: MODELO_TRANSCRICAO });
    expect(arg.data.transcricaoEm).toBeInstanceOf(Date);
  });
  it('nunca escreve em WhatsAppMensagem.corpo', async () => {
    await salvarTranscricao(ID, 'oi');
    expect(m.msgUpdate).not.toHaveBeenCalled();
  });
  it('recusa mídia que não é áudio', async () => {
    m.achar.mockResolvedValue({ id: ID, tipo: 'imagem', status: 'salva', transcricao: null });
    const r = await salvarTranscricao(ID, 'oi');
    expect(r.ok).toBe(false); expect(m.atualizar).not.toHaveBeenCalled();
  });
  it('mídia inexistente ou id mal formado', async () => {
    m.achar.mockResolvedValue(null);
    expect((await salvarTranscricao(ID, 'oi')).ok).toBe(false);
    expect((await salvarTranscricao('x; drop', 'oi')).ok).toBe(false);
    expect(m.atualizar).not.toHaveBeenCalled();
  });
  it('texto vazio depois de normalizar é recusado', async () => {
    expect((await salvarTranscricao(ID, ' \u0000 ')).ok).toBe(false);
  });
  it('teto: 6000 sem duração; proporcional quando a duração é informada', async () => {
    expect((await salvarTranscricao(ID, 'a'.repeat(6001))).ok).toBe(false);
    expect((await salvarTranscricao(ID, 'a'.repeat(6000))).ok).toBe(true);
    m.atualizar.mockClear();
    expect((await salvarTranscricao(ID, 'a'.repeat(451), 10)).ok).toBe(false);
    expect((await salvarTranscricao(ID, 'a'.repeat(450), 10)).ok).toBe(true);
    expect(m.atualizar).toHaveBeenCalledTimes(1);
  });
  it('já transcrita: devolve a existente sem sobrescrever', async () => {
    m.achar.mockResolvedValueOnce({ id: ID, tipo: 'audio', status: 'salva', transcricao: 'antiga' });
    const r = await salvarTranscricao(ID, 'nova');
    expect(r).toMatchObject({ ok: true, transcricao: 'antiga' });
    expect(m.atualizar).not.toHaveBeenCalled();
  });
  it('corrida: CAS perde (count 0) e devolve a gravada por quem ganhou', async () => {
    m.atualizar.mockResolvedValue({ count: 0 });
    m.achar.mockResolvedValueOnce({ id: ID, tipo: 'audio', status: 'salva', transcricao: null })
      .mockResolvedValueOnce({ id: ID, tipo: 'audio', status: 'salva', transcricao: 'do outro' });
    expect(await salvarTranscricao(ID, 'minha')).toMatchObject({ ok: true, transcricao: 'do outro' });
  });
});

describe('salvarOnda', () => {
  const onda = Array.from({ length: 40 }, (_, i) => i % 32);
  it('grava 40 bytes só em áudio sem onda (CAS)', async () => {
    expect((await salvarOnda(ID, onda)).ok).toBe(true);
    const arg = m.atualizar.mock.calls[0]![0];
    expect(arg.where).toEqual({ id: ID, tipo: 'audio', onda: null });
    expect(Array.from(arg.data.onda as Uint8Array)).toEqual(onda);
  });
  it('devolve se escreveu: count 0 (outra gravação ganhou) não diz "salva"', async () => {
    m.atualizar.mockResolvedValue({ count: 1 });
    expect(await salvarOnda(ID, onda)).toMatchObject({ ok: true, gravou: true, message: 'Onda salva.' });
    m.atualizar.mockResolvedValue({ count: 0 });
    expect(await salvarOnda(ID, onda)).toMatchObject({ ok: true, gravou: false, message: 'Este áudio já tinha onda.' });
  });
  it('validação estrita e guarda', async () => {
    expect((await salvarOnda(ID, onda.slice(1))).ok).toBe(false);
    expect((await salvarOnda(ID, onda.map(() => 40))).ok).toBe(false);
    m.admin.mockResolvedValue(false);
    expect((await salvarOnda(ID, onda)).ok).toBe(false);
    expect(m.atualizar).not.toHaveBeenCalled();
  });
  it('recusa mídia que não é áudio', async () => {
    m.achar.mockResolvedValue({ id: ID, tipo: 'video', status: 'salva', onda: null });
    expect((await salvarOnda(ID, onda)).ok).toBe(false);
  });
});
