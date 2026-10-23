import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.stubGlobal('React', React);
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }), usePathname: () => '/crm/atendimento', useSearchParams: () => new URLSearchParams() }));
vi.mock('@/app/(app)/crm/atendimento/actions', () => ({ responderConversa: vi.fn(), controlarAutomatico: vi.fn() }));
vi.mock('@/app/(app)/crm/atendimento/midia-actions', () => ({ enviarMidiaConversa: vi.fn() }));
import { Reply } from '@/app/(app)/crm/atendimento/reply';
import { AnexarMenu } from '@/app/(app)/crm/atendimento/anexar-menu';
import { AnexoPrevia } from '@/app/(app)/crm/atendimento/anexo-previa';
import { OPCOES_ANEXO, validarAnexo, tipoDoAnexo } from '@/app/(app)/crm/atendimento/composer-regras';
import { INICIAL, reduzir, TETO_SEGUNDOS, escolherFormato, prepararAudio, formatarTempo, type EstadoGravador } from '@/app/(app)/crm/atendimento/gravador-regras';
import { LIMITE_ENVIO_BYTES } from '@/lib/whatsapp-midia-politica';

const MB = 1024 * 1024;
const arq = (name: string, size: number, type: string) => ({ name, size, type });
const props = { telefone: '5592900000001', estadoAutomatico: 'Automático gratuito disponível' };

describe('B13: opções do menu Anexar', () => {
  it('tem as 4 opções do artboard', () => {
    expect(OPCOES_ANEXO.map(o => o.nome)).toEqual(['Documento', 'Fotos e vídeos', 'Câmera', 'Figurinha']);
  });
  it('câmera tem capture; figurinha só webp', () => {
    const cam = OPCOES_ANEXO.find(o => o.nome === 'Câmera')!;
    expect(cam.capture).toBe('environment'); expect(cam.accept).toBe('image/*');
    expect(OPCOES_ANEXO.find(o => o.nome === 'Figurinha')!.accept).toBe('image/webp');
  });
  it('AnexarMenu renderiza o gatilho e os inputs escondidos (câmera com capture)', () => {
    const html = renderToStaticMarkup(React.createElement(AnexarMenu, { desabilitado: false, onEscolher: vi.fn() }));
    expect(html).toContain('aria-label="Anexar"');
    expect(html).toContain('capture="environment"'); expect(html).toContain('accept="image/webp"');
    expect(html.split('type="file"').length - 1).toBe(4);
  });
  it('desabilitado bloqueia o gatilho', () => {
    const html = renderToStaticMarkup(React.createElement(AnexarMenu, { desabilitado: true, onEscolher: vi.fn() }));
    expect(html).toMatch(/aria-label="Anexar"[^>]*disabled|disabled=""[^>]*aria-label="Anexar"/);
  });
});

describe('B13: validação no cliente', () => {
  it('tipo pelo mime e pela opção', () => {
    expect(tipoDoAnexo('Fotos e vídeos', arq('a.jpg', 1, 'image/jpeg'))).toBe('imagem');
    expect(tipoDoAnexo('Fotos e vídeos', arq('a.mp4', 1, 'video/mp4'))).toBe('video');
    expect(tipoDoAnexo('Documento', arq('a.pdf', 1, 'application/pdf'))).toBe('documento');
    expect(tipoDoAnexo('Figurinha', arq('a.webp', 1, 'image/webp'))).toBe('figurinha');
    expect(tipoDoAnexo('Câmera', arq('a.jpg', 1, 'image/jpeg'))).toBe('imagem');
  });
  it('aceita arquivo dentro do limite', () => {
    expect(validarAnexo('imagem', arq('a.jpg', 1 * MB, 'image/jpeg'))).toEqual({ ok: true });
  });
  it('recusa acima de 9 MB com mensagem clara', () => {
    const r = validarAnexo('documento', arq('a.pdf', LIMITE_ENVIO_BYTES + 1, 'application/pdf'));
    expect(r.ok).toBe(false); expect((r as { message: string }).message).toContain('9 MB');
  });
  it('recusa acima do limite do tipo (imagem 5 MB, figurinha 500 KB)', () => {
    expect(validarAnexo('imagem', arq('a.jpg', 6 * MB, 'image/jpeg')).ok).toBe(false);
    const f = validarAnexo('figurinha', arq('a.webp', 600 * 1024, 'image/webp'));
    expect(f.ok).toBe(false); expect((f as { message: string }).message).toContain('500 KB');
  });
  it('recusa vazio e HEIC (use JPEG)', () => {
    expect(validarAnexo('imagem', arq('a.jpg', 0, 'image/jpeg')).ok).toBe(false);
    for (const a of [arq('a.heic', 100, 'image/heic'), arq('IMG.HEIF', 100, ''), arq('a.heic', 100, 'image/heif')]) {
      const r = validarAnexo('imagem', a);
      expect(r.ok).toBe(false); expect((r as { message: string }).message).toContain('use JPEG');
    }
  });
});

describe('B13: prévia do anexo', () => {
  it('documento mostra nome e tamanho, legenda, Enviar e Cancelar', () => {
    const html = renderToStaticMarkup(React.createElement(AnexoPrevia, { arquivo: arq('proposta.pdf', 2 * MB, 'application/pdf') as unknown as File, tipo: 'documento', legenda: '', enviando: false, onLegenda: vi.fn(), onEnviar: vi.fn(), onCancelar: vi.fn() }));
    expect(html).toContain('proposta.pdf'); expect(html).toContain('2,0 MB');
    expect(html).toContain('Legenda'); expect(html).toContain('Enviar'); expect(html).toContain('Cancelar');
  });
  it('enviando desabilita Enviar e Cancelar', () => {
    const html = renderToStaticMarkup(React.createElement(AnexoPrevia, { arquivo: arq('a.pdf', 10, 'application/pdf') as unknown as File, tipo: 'documento', legenda: '', enviando: true, onLegenda: vi.fn(), onEnviar: vi.fn(), onCancelar: vi.fn() }));
    expect(html).toContain('aria-busy="true"'); expect(html.split('disabled').length - 1).toBeGreaterThanOrEqual(2);
  });
  it('figurinha não tem campo de legenda', () => {
    const html = renderToStaticMarkup(React.createElement(AnexoPrevia, { arquivo: arq('a.webp', 10, 'image/webp') as unknown as File, tipo: 'figurinha', legenda: '', enviando: false, onLegenda: vi.fn(), onEnviar: vi.fn(), onCancelar: vi.fn() }));
    expect(html).not.toContain('Legenda');
  });
});

describe('B13: máquina de estados do gravador', () => {
  const gravando: EstadoGravador = { fase: 'gravando', segundos: 0 };
  it('fluxo feliz: ocioso → pedindo → gravando → parado → enviando → ocioso', () => {
    let e = reduzir(INICIAL, { tipo: 'iniciar' }); expect(e.fase).toBe('pedindo-permissao');
    e = reduzir(e, { tipo: 'permissao-concedida' }); expect(e.fase).toBe('gravando');
    e = reduzir(e, { tipo: 'tick', segundos: 5 }); expect(e.segundos).toBe(5);
    e = reduzir(e, { tipo: 'parar' }); expect(e.fase).toBe('parado'); expect(e.segundos).toBe(5);
    e = reduzir(e, { tipo: 'enviar' }); expect(e.fase).toBe('enviando');
    e = reduzir(e, { tipo: 'enviado' }); expect(e).toEqual(INICIAL);
  });
  it('permissão negada volta a ocioso com mensagem', () => {
    const e = reduzir({ fase: 'pedindo-permissao', segundos: 0 }, { tipo: 'permissao-negada' });
    expect(e.fase).toBe('ocioso'); expect(e.erro).toContain('microfone');
  });
  it('Esc e cancelar voltam a ocioso de qualquer fase', () => {
    for (const fase of ['pedindo-permissao', 'gravando', 'parado', 'enviando'] as const) {
      expect(reduzir({ fase, segundos: 3 }, { tipo: 'esc' })).toEqual(INICIAL);
      expect(reduzir({ fase, segundos: 3 }, { tipo: 'cancelar' })).toEqual(INICIAL);
    }
  });
  it('teto de 5 min pausa sozinho', () => {
    expect(TETO_SEGUNDOS).toBe(300);
    const e = reduzir(gravando, { tipo: 'tick', segundos: 300 });
    expect(e.fase).toBe('pausado'); expect(e.segundos).toBe(300);
  });
  it('menos de 1 s não vai para a prévia', () => {
    const e = reduzir({ fase: 'gravando', segundos: 0 }, { tipo: 'parar' });
    expect(e.fase).toBe('ocioso'); expect(e.erro).toContain('curto');
  });
  it('eventos fora de ordem são ignorados e falha de envio mantém a prévia', () => {
    expect(reduzir(INICIAL, { tipo: 'parar' })).toEqual(INICIAL);
    expect(reduzir(INICIAL, { tipo: 'enviar' })).toEqual(INICIAL);
    expect(reduzir({ fase: 'enviando', segundos: 4 }, { tipo: 'falhou', message: 'x' })).toEqual({ fase: 'parado', segundos: 4, erro: 'x' });
  });
  it('timer mm:ss', () => { expect(formatarTempo(65)).toBe('01:05'); expect(formatarTempo(0)).toBe('00:00'); });
});

describe('B13: negociação de formato', () => {
  const sup = (...ok: string[]) => (m: string) => ok.includes(m);
  it('ogg/opus → direto', () => { expect(escolherFormato(sup('audio/ogg;codecs=opus', 'audio/webm;codecs=opus'))).toEqual({ mime: 'audio/ogg;codecs=opus', converter: false }); });
  it('webm antes de mp4 → converte (mp4 só como último recurso)', () => { expect(escolherFormato(sup('audio/mp4', 'audio/webm;codecs=opus'))).toEqual({ mime: 'audio/webm;codecs=opus', converter: true }); });
  it('só webm → converte', () => { expect(escolherFormato(sup('audio/webm;codecs=opus'))).toEqual({ mime: 'audio/webm;codecs=opus', converter: true }); });
  it('sem ogg/webm: encoder Opus WASM antes do mp4', () => {
    expect(escolherFormato(sup('audio/mp4'), { wasm: true })).toEqual({ mime: 'audio/ogg;codecs=opus', converter: false, encoder: 'wasm' });
  });
  it('sem ogg/webm e sem WASM: mp4 como áudio comum', () => { expect(escolherFormato(sup('audio/mp4'))).toEqual({ mime: 'audio/mp4', converter: false }); });
  it('WASM disponível não ganha de ogg nem de webm nativos', () => {
    expect(escolherFormato(sup('audio/webm;codecs=opus'), { wasm: true })).toMatchObject({ converter: true });
    expect(escolherFormato(sup('audio/ogg;codecs=opus'), { wasm: true })).toEqual({ mime: 'audio/ogg;codecs=opus', converter: false });
  });
  it('só WASM, sem MediaRecorder útil → encoder WASM', () => { expect(escolherFormato(sup(), { wasm: true })).toMatchObject({ encoder: 'wasm' }); });
  it('nenhum → null', () => { expect(escolherFormato(sup())).toBeNull(); });
  it('prepararAudio chama o conversor só para webm', () => {
    const conv = vi.fn((b: Uint8Array) => new Uint8Array([9, ...b]));
    const web = prepararAudio(new Uint8Array([1]), { mime: 'audio/webm;codecs=opus', converter: true }, conv);
    expect(conv).toHaveBeenCalledTimes(1); expect(web).toMatchObject({ ok: true, mime: 'audio/ogg', nome: 'audio.ogg' }); expect((web as { bytes: Uint8Array }).bytes[0]).toBe(9);
    conv.mockClear();
    const mp4 = prepararAudio(new Uint8Array([1]), { mime: 'audio/mp4', converter: false }, conv);
    expect(conv).not.toHaveBeenCalled(); expect(mp4).toMatchObject({ ok: true, mime: 'audio/mp4', nome: 'audio.m4a' });
    const ogg = prepararAudio(new Uint8Array([1]), { mime: 'audio/ogg;codecs=opus', converter: false }, conv);
    expect(ogg).toMatchObject({ ok: true, mime: 'audio/ogg', nome: 'audio.ogg' });
  });
  it('conversor que lança → mensagem clara', () => {
    const r = prepararAudio(new Uint8Array([1]), { mime: 'audio/webm;codecs=opus', converter: true }, () => { throw new Error('remux não implementado'); });
    expect(r).toEqual({ ok: false, message: 'Não foi possível converter o áudio neste navegador' });
  });
});

describe('B13: Reply com anexar e microfone', () => {
  const r = (aberta: boolean) => renderToStaticMarkup(React.createElement(Reply, { ...props, aberta }));
  it('campo vazio: microfone no lugar do Enviar', () => {
    const html = r(true);
    expect(html).toContain('aria-label="Gravar áudio"'); expect(html).not.toContain('aria-label="Enviar mensagem"');
    expect(html).toContain('aria-label="Anexar"');
  });
  it('com texto no campo volta a ser Enviar (decisão pura)', async () => {
    const { botaoPrincipal } = await import('@/app/(app)/crm/atendimento/composer-regras');
    expect(botaoPrincipal('')).toBe('microfone'); expect(botaoPrincipal('   ')).toBe('microfone'); expect(botaoPrincipal('oi')).toBe('enviar');
  });
  it('janela fechada desabilita anexar e microfone', () => {
    const html = r(false);
    for (const label of ['Anexar', 'Gravar áudio']) {
      expect(html).toMatch(new RegExp(`<button[^>]*aria-label="${label}"[^>]*disabled|<button[^>]*disabled[^>]*aria-label="${label}"`));
    }
  });
  it('"/" e Enter continuam; os chips fixos saíram', () => {
    const f = fs.readFileSync(path.resolve(__dirname, '..', 'app/(app)/crm/atendimento/reply.tsx'), 'utf8');
    expect(f).toContain('acaoDaTecla'); expect(f).toContain('termoDeBarra'); expect(r(true)).not.toContain('Boas-vindas');
  });
  // O placeholder da B13 foi substituído pelo remux real da B11: entrada vazia é
  // recusada com erro (o gravador mostra "Não foi possível converter o áudio").
  it('remux recusa entrada que não é WebM/Opus', async () => {
    const { webmParaOggOpus } = await import('@/lib/audio-webm-para-ogg');
    expect(() => webmParaOggOpus(new Uint8Array())).toThrow();
  });
});
