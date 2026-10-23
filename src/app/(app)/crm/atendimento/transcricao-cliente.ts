// Lado da página: cria o worker de módulo SÓ ao transcrever, manda o PCM e relata o progresso. Um trabalho por vez.
import type { Saida } from './transcricao.worker';

export type ProgressoTranscricao = { fase: 'modelo' | 'leitura' | 'inferencia'; pct: number };
export class ErroTranscricao extends Error {
  constructor(message: string, readonly modeloInvalido = false) { super(message); }
}

let emAndamento = false;
const ouvintes = new Set<() => void>();
const definir = (v: boolean) => { emAndamento = v; ouvintes.forEach(f => f()); };
/** Para `useSyncExternalStore`: o botão de todas as bolhas desabilita enquanto uma aba transcreve. */
export const transcricaoOcupada = () => emAndamento;
export const ouvirTranscricao = (f: () => void) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; };

/** `sinal` aborta (cancelar ao desmontar): o worker é encerrado e a promessa rejeita com AbortError. */
export function transcreverPcm(pcm: Float32Array, duracaoS: number, aoProgresso: (p: ProgressoTranscricao) => void, sinal: AbortSignal): Promise<string> {
  if (emAndamento) return Promise.reject(new ErroTranscricao('Já existe uma transcrição em andamento.'));
  definir(true);
  return new Promise<string>((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./transcricao.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      definir(false); // sem isto a trava ficaria presa e nenhuma bolha transcreveria até recarregar a página
      reject(new ErroTranscricao('Não foi possível iniciar a transcrição neste navegador.'));
      return;
    }
    const fim = () => { definir(false); sinal.removeEventListener('abort', abortar); worker.terminate(); };
    const abortar = () => { fim(); reject(new DOMException('Cancelado', 'AbortError')); };
    if (sinal.aborted) { abortar(); return; }
    sinal.addEventListener('abort', abortar, { once: true });
    worker.onmessage = (e: MessageEvent<Saida>) => {
      const s = e.data;
      if (s.tipo === 'progresso') aoProgresso({ fase: s.fase, pct: s.pct });
      else if (s.tipo === 'pronto') { fim(); resolve(s.texto); }
      else { fim(); reject(new ErroTranscricao(s.message, s.modelo === true)); }
    };
    worker.onerror = () => { fim(); reject(new ErroTranscricao('Não foi possível iniciar a transcrição neste navegador.')); };
    worker.postMessage({ tipo: 'transcrever', pcm, duracaoS }, [pcm.buffer]);
  });
}
