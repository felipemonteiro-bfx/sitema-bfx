/// <reference lib="webworker" />
// Worker do Whisper (transformers.js + ONNX Runtime Web em WASM, thread única). Carregado só no clique de "Transcrever".
// Recebe o PCM 16 kHz mono; devolve progresso e o texto. Nada do áudio sai do navegador.
import { pipeline, env } from '@huggingface/transformers';
import { MODELO_ID, REVISAO, HASHES, MSG_MODELO_NAO_CONFERE, criarFetchVerificado } from './transcricao-modelo';

type Entrada = { tipo: 'transcrever'; pcm: Float32Array; duracaoS: number };
export type Saida =
  | { tipo: 'progresso'; fase: 'modelo' | 'leitura' | 'inferencia'; pct: number }
  | { tipo: 'pronto'; texto: string }
  | { tipo: 'erro'; message: string; modelo?: boolean };

const enviar = (s: Saida) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(s);

// ONNX: sem threads (não exige COOP/COEP) e o .wasm copiado para /ort/ (scripts/copiar-ort.mjs).
env.allowLocalModels = false;
env.useBrowserCache = true;
const wasm = env.backends.onnx.wasm;
if (wasm) {
  wasm.numThreads = 1;
  wasm.wasmPaths = '/ort/';
  wasm.proxy = false;
}

const TOTAL_BYTES = 79_000_000; // soma aproximada dos arquivos da tabela (encoder + decoder q8 e configs)
const baixado = new Map<string, number>();
const fetchOriginal = self.fetch.bind(self);
// Todo byte do modelo passa por aqui: sha256 conferido ANTES de ir ao Cache Storage.
self.fetch = criarFetchVerificado(fetchOriginal, {
  tabela: HASHES,
  aoProgresso: p => {
    baixado.set(p.arquivo, p.carregado);
    const soma = Array.from(baixado.values()).reduce((a, b) => a + b, 0);
    enviar({ tipo: 'progresso', fase: 'modelo', pct: Math.min(99, Math.round((soma / TOTAL_BYTES) * 100)) });
  },
});

let transcritor: Awaited<ReturnType<typeof carregar>> | null = null;
async function carregar() {
  return pipeline('automatic-speech-recognition', MODELO_ID, { revision: REVISAO, dtype: 'q8', device: 'wasm' });
}

self.onmessage = async (e: MessageEvent<Entrada>) => {
  if (e.data.tipo !== 'transcrever') return;
  try {
    transcritor ??= await carregar();
    enviar({ tipo: 'progresso', fase: 'leitura', pct: 100 });
    // O transformers 3.8.1 não tem callback por janela: avisa a fase e a tela mostra uma barra indeterminada.
    enviar({ tipo: 'progresso', fase: 'inferencia', pct: 0 });
    const saida = await transcritor(e.data.pcm, {
      language: 'portuguese',
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5,
    } as never);
    const r = Array.isArray(saida) ? saida[0] : saida;
    enviar({ tipo: 'pronto', texto: String((r as { text?: string } | undefined)?.text ?? '') });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Divergência de hash vira a mensagem fixa e desativa a transcrição na tela.
    enviar(message.includes(MSG_MODELO_NAO_CONFERE) ? { tipo: 'erro', message: MSG_MODELO_NAO_CONFERE, modelo: true } : { tipo: 'erro', message: 'Não foi possível transcrever este áudio neste navegador.' });
  }
};
