// Decodifica a mídia de áudio (fetch same-origin da rota protegida) para PCM 16 kHz mono, UMA vez por mídia na sessão.
// Serve à onda (picos) e à transcrição. Fila de um por vez e cache curto, para não segurar memória de uma lista inteira.
import { urlMidia } from './status-mensagem';
import { TAMANHO_MAX_BYTES } from './transcricao-regras';

export const TAXA_PCM = 16000;
export const MSG_NAO_LEU = 'Este navegador não conseguiu ler o áudio';

const CACHE_MAX = 3;
const cache = new Map<string, Promise<Float32Array>>();
let fila: Promise<unknown> = Promise.resolve();

/** Média dos canais. */
function mono(buf: AudioBuffer): Float32Array {
  if (buf.numberOfChannels === 1) return new Float32Array(buf.getChannelData(0));
  const n = buf.length;
  const saida = new Float32Array(n);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) saida[i]! += d[i]! / buf.numberOfChannels;
  }
  return saida;
}

async function baixarEDecodificar(id: string): Promise<Float32Array> {
  const res = await fetch(urlMidia(id), { credentials: 'same-origin' });
  if (!res.ok) throw new Error(MSG_NAO_LEU);
  const declarado = Number(res.headers.get('content-length'));
  if (Number.isFinite(declarado) && declarado > TAMANHO_MAX_BYTES) throw new Error(MSG_NAO_LEU);
  const bytes = await res.arrayBuffer();
  if (bytes.byteLength > TAMANHO_MAX_BYTES) throw new Error(MSG_NAO_LEU);
  const Ctx = typeof OfflineAudioContext !== 'undefined' ? OfflineAudioContext : (globalThis as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  if (!Ctx) throw new Error(MSG_NAO_LEU);
  try {
    // O decodeAudioData já reamostra para a taxa do contexto (16 kHz).
    const buf = await new Ctx(1, 1, TAXA_PCM).decodeAudioData(bytes);
    return mono(buf);
  } catch { throw new Error(MSG_NAO_LEU); }
}

/** PCM 16 kHz mono da mídia. Chamadas repetidas reaproveitam o mesmo decode; cuidado: devolve CÓPIA para quem vai transferir. */
export function pcmDaMidia(id: string): Promise<Float32Array> {
  let p = cache.get(id);
  if (!p) {
    p = fila.then(() => baixarEDecodificar(id));
    fila = p.catch(() => undefined);
    cache.set(id, p);
    p.catch(() => cache.delete(id));
    while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
  }
  return p.then(a => a.slice());
}
