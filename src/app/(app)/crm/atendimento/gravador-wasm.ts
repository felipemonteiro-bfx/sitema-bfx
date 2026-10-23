// Gravação de voz em Opus pelo encoder libopus em WebAssembly (`@audio/encode-opus`), para navegadores cujo
// MediaRecorder não grava OGG/WebM Opus. Captura PCM mono pelo AudioWorklet (ScriptProcessor como reserva) e
// codifica ao parar. O pacote só é baixado quando o usuário grava (import dinâmico).

export type CapturaPcm = {
  /** Para a captura, codifica e devolve o arquivo OGG/Opus mono (48 kHz). */
  parar(): Promise<Uint8Array>;
  /** Descarta tudo sem codificar. */
  cancelar(): void;
  /** Para de acumular PCM (o microfone segue aberto); `continuar` retoma no MESMO áudio. */
  pausar(): void;
  continuar(): void;
  /** Codifica o que há até agora SEM encerrar a captura (prévia de escuta na pausa). */
  previa(): Promise<Uint8Array>;
};

/** Há WebAssembly e um jeito de capturar PCM? (a decisão final do formato continua em `escolherFormato`.) */
export function suportaOpusWasm(): boolean {
  if (typeof WebAssembly === 'undefined' || typeof AudioContext === 'undefined') return false;
  return typeof AudioWorkletNode !== 'undefined' || 'createScriptProcessor' in AudioContext.prototype;
}

const CODIGO_WORKLET = `class PcmCaptura extends AudioWorkletProcessor {
  process(entradas) { const c = entradas[0] && entradas[0][0]; if (c) this.port.postMessage(c.slice(0)); return true; }
}
registerProcessor('pcm-captura', PcmCaptura);`;

export async function iniciarCapturaPcm(stream: MediaStream): Promise<CapturaPcm> {
  const ac = new AudioContext();
  const pedacos: Float32Array[] = [];
  let pausado = false;
  const fonte = ac.createMediaStreamSource(stream);
  let desligar: () => void;
  if (typeof AudioWorkletNode !== 'undefined' && ac.audioWorklet) {
    const url = URL.createObjectURL(new Blob([CODIGO_WORKLET], { type: 'application/javascript' }));
    try { await ac.audioWorklet.addModule(url); } finally { URL.revokeObjectURL(url); }
    const no = new AudioWorkletNode(ac, 'pcm-captura', { numberOfInputs: 1, numberOfOutputs: 0, channelCount: 1, channelCountMode: 'explicit' });
    no.port.onmessage = e => { if (!pausado) pedacos.push(e.data as Float32Array); };
    fonte.connect(no);
    desligar = () => { no.port.onmessage = null; fonte.disconnect(); };
  } else {
    const sp = ac.createScriptProcessor(4096, 1, 1);
    sp.onaudioprocess = e => { if (!pausado) pedacos.push(new Float32Array(e.inputBuffer.getChannelData(0))); };
    const mudo = ac.createGain(); mudo.gain.value = 0; // ScriptProcessor só roda ligado ao destino
    fonte.connect(sp); sp.connect(mudo); mudo.connect(ac.destination);
    desligar = () => { sp.onaudioprocess = null; fonte.disconnect(); sp.disconnect(); mudo.disconnect(); };
  }
  const taxa = ac.sampleRate;
  const fechar = () => { try { desligar(); } catch { /* já desligado */ } void ac.close().catch(() => undefined); };
  /** libopus em WASM sobre uma cópia da lista de blocos: a captura pode seguir depois. */
  async function codificar(blocos: Float32Array[]): Promise<Uint8Array> {
    const { default: opus } = await import('@audio/encode-opus');
    const enc = await opus({ sampleRate: taxa, channels: 1, bitrate: 32, application: 'voip' });
    try {
      const saida: Uint8Array[] = [];
      for (const p of blocos) saida.push(enc.encode([p]));
      saida.push(enc.flush());
      const total = saida.reduce((n, b) => n + b.length, 0);
      const ogg = new Uint8Array(total);
      let pos = 0;
      for (const b of saida) { ogg.set(b, pos); pos += b.length; }
      return ogg;
    } finally { enc.free(); }
  }
  return {
    cancelar() { pedacos.length = 0; fechar(); },
    pausar() { pausado = true; },
    continuar() { pausado = false; },
    previa() { return codificar([...pedacos]); },
    async parar() {
      fechar();
      try { return await codificar(pedacos); } finally { pedacos.length = 0; }
    },
  };
}
