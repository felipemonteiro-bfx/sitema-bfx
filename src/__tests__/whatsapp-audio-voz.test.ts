// Nota de voz: `voice: true` no payload da Meta só para OGG/Opus mono; AAC/M4A vai como áudio comum.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ehNotaDeVoz } from '@/lib/whatsapp-midia-politica';
import { MetaProvider } from '@/lib/providers/whatsapp-meta';

/** Cabeçalho OGG mínimo com OpusHead; `canais` fica no byte 9 do OpusHead. */
function oggOpus(canais: number): Uint8Array {
  const cab = new Uint8Array(27 + 1 + 19);
  cab.set(new TextEncoder().encode('OggS'), 0);
  cab[26] = 1; cab[27] = 19; // 1 segmento de 19 bytes
  cab.set(new TextEncoder().encode('OpusHead'), 28);
  cab[36] = 1; cab[37] = canais;
  return cab;
}
const M4A = (() => { const b = new Uint8Array(32); b.set(new TextEncoder().encode('ftypM4A '), 4); return b; })();

describe('ehNotaDeVoz', () => {
  it('OGG/Opus mono é nota de voz', () => { expect(ehNotaDeVoz('audio/ogg', oggOpus(1))).toBe(true); });
  it('OGG/Opus estéreo e AAC/M4A não são', () => {
    expect(ehNotaDeVoz('audio/ogg', oggOpus(2))).toBe(false);
    expect(ehNotaDeVoz('audio/mp4', M4A)).toBe(false);
    expect(ehNotaDeVoz('audio/mpeg', new Uint8Array(10))).toBe(false);
  });
});

describe('payload do áudio na Meta', () => {
  afterEach(() => vi.unstubAllGlobals());
  const prov = new MetaProvider({ token: 't', phoneNumberId: '1', apiVersion: 'v21.0' });
  const corpo = (f: ReturnType<typeof vi.fn>) => JSON.parse((f.mock.calls[0]![1] as { body: string }).body);
  const fetchOk = () => vi.fn(async () => new Response(JSON.stringify({ messages: [{ id: 'wamid.X' }] }), { status: 200 }));

  it('voz: true leva voice: true', async () => {
    const f = fetchOk(); vi.stubGlobal('fetch', f);
    await prov.sendMedia('559200000000', { tipo: 'audio', mediaId: '9', voz: true });
    expect(corpo(f)).toMatchObject({ type: 'audio', audio: { id: '9', voice: true } });
  });
  it('sem voz o objeto de áudio não leva voice', async () => {
    const f = fetchOk(); vi.stubGlobal('fetch', f);
    await prov.sendMedia('559200000000', { tipo: 'audio', mediaId: '9' });
    expect(corpo(f).audio).toEqual({ id: '9' });
  });
  it('voz em outro tipo é ignorada', async () => {
    const f = fetchOk(); vi.stubGlobal('fetch', f);
    await prov.sendMedia('559200000000', { tipo: 'imagem', mediaId: '9', voz: true });
    expect(corpo(f).image).toEqual({ id: '9' });
  });
});
