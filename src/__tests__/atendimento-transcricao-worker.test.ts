// O worker de transcrição: configuração fixa conferida pela fonte (não dá para rodar WASM no vitest/node).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const raiz = join(__dirname, '..', 'app', '(app)', 'crm', 'atendimento');
const worker = readFileSync(join(raiz, 'transcricao.worker.ts'), 'utf8');
const cliente = readFileSync(join(raiz, 'transcricao-cliente.ts'), 'utf8');

describe('transcricao.worker.ts', () => {
  it('ONNX em thread única, wasm servido de /ort/ e sem backend de nó', () => {
    expect(worker).toContain('numThreads = 1');
    expect(worker).toContain("wasmPaths = '/ort/'");
    expect(worker).toContain('allowLocalModels = false');
  });
  it('modelo na revisão fixa, quantizado, em português', () => {
    expect(worker).toContain('REVISAO');
    expect(worker).toMatch(/revision:\s*REVISAO/);
    expect(worker).toMatch(/dtype:\s*'q8'/);
    expect(worker).toContain("language: 'portuguese'");
    expect(worker).toContain("task: 'transcribe'");
    expect(worker).toContain('chunk_length_s: 30');
    expect(worker).toContain('stride_length_s: 5');
  });
  it('troca o fetch pelo verificado antes de carregar o pipeline', () => {
    expect(worker).toContain('criarFetchVerificado');
    expect(worker.indexOf('criarFetchVerificado')).toBeLessThan(worker.indexOf('pipeline('));
  });
  it('o cliente cria o worker de módulo só dentro da função de iniciar', () => {
    expect(cliente).toContain("new Worker(new URL('./transcricao.worker.ts', import.meta.url), { type: 'module' })");
    expect(cliente).not.toMatch(/^const .*new Worker/m);
  });
});
