// Achados 4 e 5 da revisão: Worker que não sobe não prende a trava, e a fase de inferência não promete percentual.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { descreverProgresso } from '@/app/(app)/crm/atendimento/transcricao-regras';

const DIR = 'src/app/(app)/crm/atendimento/';
const worker = readFileSync(DIR + 'transcricao.worker.ts', 'utf8');
const cliente = readFileSync(DIR + 'transcricao-cliente.ts', 'utf8');
const ui = readFileSync(DIR + 'transcricao-audio.tsx', 'utf8');

describe('transcricao-cliente: criação do Worker', () => {
  it('new Worker dentro de try/catch que libera a trava (definir(false)) antes de rejeitar', () => {
    const trecho = cliente.split('new Worker(')[0].split('return new Promise').pop()!;
    expect(trecho).toContain('try {');
    const depois = cliente.split('new Worker(')[1].split('const fim')[0];
    expect(depois).toMatch(/catch[\s\S]*definir\(false\)[\s\S]*reject\(new ErroTranscricao/);
  });
});

describe('worker: sem chunk_callback (não existe no transformers 3.8.1)', () => {
  it('não usa chunk_callback e avisa a fase de inferência antes de chamar o transcritor', () => {
    expect(worker).not.toContain('chunk_callback');
    const i = worker.indexOf("fase: 'inferencia'");
    expect(i).toBeGreaterThan(-1);
    expect(i).toBeLessThan(worker.indexOf('await transcritor('));
  });
});

describe('descreverProgresso', () => {
  it('modelo: porcentagem real', () => {
    expect(descreverProgresso({ fase: 'modelo', pct: 42 })).toEqual({ rotulo: 'Baixando o modelo de voz… 42%', indeterminado: false, valor: 42 });
  });
  it('leitura: preparando, sem número', () => {
    expect(descreverProgresso({ fase: 'leitura', pct: 100 })).toMatchObject({ rotulo: 'Preparando o áudio…', indeterminado: true });
  });
  it('inferência: "Transcrevendo…" em barra indeterminada, sem porcentagem', () => {
    expect(descreverProgresso({ fase: 'inferencia', pct: 0 })).toEqual({ rotulo: 'Transcrevendo…', indeterminado: true, valor: 0 });
  });
  it('a UI usa a descrição e uma barra sem valor para o indeterminado', () => {
    expect(ui).toContain('descreverProgresso(progresso)');
    expect(ui).not.toContain("progresso.fase === 'leitura' ? 0");
  });
});
