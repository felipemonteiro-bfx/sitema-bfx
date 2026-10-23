// Achados 1 e 3 da revisão: soltar o botão no modo WASM e o encode cancelável.
// O vitest roda em `node` (sem DOM): a decisão de soltar é pura e o resto é conferido na fonte.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SEGURAR_MS, acaoAoSoltar } from '@/app/(app)/crm/atendimento/gravador-regras';

const fonte = readFileSync('src/app/(app)/crm/atendimento/gravador-audio.tsx', 'utf8');
const LONGO = SEGURAR_MS + 100;

describe('acaoAoSoltar (segurar e soltar)', () => {
  it('clique curto não para: a gravação segue até clicar de novo', () => {
    expect(acaoAoSoltar(100, { recorder: true, pcm: false })).toBe('ignorar');
    expect(acaoAoSoltar(100, { recorder: false, pcm: true })).toBe('ignorar');
  });
  it('segurou com MediaRecorder gravando: para', () => {
    expect(acaoAoSoltar(LONGO, { recorder: true, pcm: false })).toBe('parar');
  });
  it('segurou no modo WASM (só captura PCM, sem MediaRecorder): também para', () => {
    expect(acaoAoSoltar(LONGO, { recorder: false, pcm: true })).toBe('parar');
  });
  it('soltou antes de o microfone liberar: adia o parar para quando a gravação começar', () => {
    expect(acaoAoSoltar(LONGO, { recorder: false, pcm: false })).toBe('adiar');
  });
});

describe('gravador-audio.tsx usa a regra e cancela o encode', () => {
  it('o handler de soltar consulta recorder E pcm, e iniciar zera parouAoSoltar', () => {
    expect(fonte).toContain('acaoAoSoltar(Date.now() - toque.current, { recorder: !!recorder.current, pcm: !!pcm.current })');
    expect(fonte).toMatch(/async function iniciar\(\) \{[\s\S]{0,200}parouAoSoltar\.current = false/);
  });
  it('o resultado do encode WASM é ignorado se a ficha mudou (cancelou/reiniciou)', () => {
    expect(fonte).toMatch(/const minha = \+\+?ficha|const minhaFicha = ficha\.current/);
    expect(fonte).toContain('if (minhaFicha !== ficha.current) return;');
  });
  it('blob.current é zerado em iniciar() e em parar()', () => {
    const iniciar = fonte.split('async function iniciar()')[1].split('async function enviar()')[0];
    const parar = fonte.split('function parar()')[1].split('async function iniciar()')[0];
    expect(iniciar).toContain('blob.current = null');
    expect(parar).toContain('blob.current = null');
  });
  it('Enviar fica desabilitado com "Codificando…" até a prévia existir', () => {
    expect(readFileSync('src/app/(app)/crm/atendimento/gravador-pilula.tsx', 'utf8')).toContain('Codificando…');
    const pilula = readFileSync('src/app/(app)/crm/atendimento/gravador-pilula.tsx', 'utf8');
    expect(pilula).toContain("const codificando = fase === 'parado' && !p.previaPronta");
    expect(pilula).toContain('disabled={enviarOff}');
    expect(fonte).toContain('previaPronta={!!previa}');
  });
});
