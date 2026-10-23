import { describe, expect, it } from 'vitest';
import { SEGURAR_MS, ehSegurar, escolherCaptura, verificarMono, MSG_ESTEREO } from '@/app/(app)/crm/atendimento/gravador-regras';

describe('segurar e soltar', () => {
  it('acima de 600 ms é "segurar" (soltar para); no limite ou abaixo é clique', () => {
    expect(SEGURAR_MS).toBe(600);
    expect(ehSegurar(601)).toBe(true);
    expect(ehSegurar(600)).toBe(false);
    expect(ehSegurar(0)).toBe(false);
  });
});

describe('grafo mono para o MediaRecorder', () => {
  it('com AudioContext e destino de MediaStream usa o grafo mono', () => {
    expect(escolherCaptura({ audioContext: true, destinoMediaStream: true })).toBe('grafo-mono');
  });
  it('sem AudioContext ou sem createMediaStreamDestination grava direto', () => {
    expect(escolherCaptura({ audioContext: false, destinoMediaStream: true })).toBe('direto');
    expect(escolherCaptura({ audioContext: true, destinoMediaStream: false })).toBe('direto');
  });
  it('mono ou canais desconhecidos passam; estéreo vira mensagem clara', () => {
    expect(verificarMono(1)).toEqual({ ok: true });
    expect(verificarMono(undefined)).toEqual({ ok: true });
    expect(verificarMono(2)).toEqual({ ok: false, message: MSG_ESTEREO });
    expect(MSG_ESTEREO).toMatch(/mono/i);
  });
});
