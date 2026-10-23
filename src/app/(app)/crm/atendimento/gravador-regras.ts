// Regras puras do gravador de áudio (sem DOM): máquina de estados, formato e preparo do arquivo.

export const TETO_SEGUNDOS = 300; // 5 min
export const MINIMO_SEGUNDOS = 1;

export type FaseGravador = 'ocioso' | 'pedindo-permissao' | 'gravando' | 'pausado' | 'parado' | 'enviando';
export type EstadoGravador = { fase: FaseGravador; segundos: number; erro?: string };
export type EventoGravador =
  | { tipo: 'iniciar' } | { tipo: 'permissao-concedida' } | { tipo: 'permissao-negada' } | { tipo: 'sem-suporte' }
  | { tipo: 'tick'; segundos: number } | { tipo: 'pausar' } | { tipo: 'continuar' } | { tipo: 'parar' } | { tipo: 'enviar' }
  | { tipo: 'enviado' } | { tipo: 'falhou'; message: string } | { tipo: 'cancelar' } | { tipo: 'esc' };

/** Segurar além disto conta como "segurar para gravar" (soltar para); até aqui é clique que alterna. */
export const SEGURAR_MS = 600;
export const ehSegurar = (duracaoMs: number) => duracaoMs > SEGURAR_MS;

/**
 * O que fazer quando o ponteiro é solto. `recorder` (MediaRecorder) e `pcm` (captura WASM) são as duas formas
 * de estar gravando; sem nenhuma, o microfone ainda não liberou e o parar é adiado até a gravação começar.
 */
export function acaoAoSoltar(duracaoMs: number, gravando: { recorder: boolean; pcm: boolean }): 'ignorar' | 'parar' | 'adiar' {
  if (!ehSegurar(duracaoMs)) return 'ignorar';
  return gravando.recorder || gravando.pcm ? 'parar' : 'adiar';
}

export const MSG_ESTEREO = 'Este navegador gravou o áudio em estéreo e não foi possível convertê-lo para mono. Tente gravar em outro navegador.';
export type Captura = 'grafo-mono' | 'direto';

/**
 * O Chrome grava o microfone em estéreo mesmo com `channelCount: 1`, e a Meta recusa/degrada o áudio.
 * Com Web Audio disponível, o stream passa por um `MediaStreamAudioDestinationNode` forçado a 1 canal.
 */
export function escolherCaptura(rec: { audioContext: boolean; destinoMediaStream: boolean }): Captura {
  return rec.audioContext && rec.destinoMediaStream ? 'grafo-mono' : 'direto';
}

/** Confere o canal do track que vai para o MediaRecorder; desconhecido passa (nem todo navegador informa). */
export function verificarMono(canais: number | undefined): { ok: true } | { ok: false; message: string } {
  return canais !== undefined && canais > 1 ? { ok: false, message: MSG_ESTEREO } : { ok: true };
}

export const INICIAL: EstadoGravador = { fase: 'ocioso', segundos: 0 };
export const MSG_PERMISSAO = 'Permissão do microfone negada. Libere o microfone nas configurações do navegador para gravar.';
export const MSG_CURTO = 'Áudio muito curto. Grave pelo menos 1 segundo.';
export const MSG_SEM_SUPORTE = 'Este navegador não consegue gravar áudio.';
export const MSG_CONVERSAO = 'Não foi possível converter o áudio neste navegador';

/** Transições da gravação. Cancelar e Esc voltam a ocioso de qualquer fase; eventos fora de ordem são ignorados. */
export function reduzir(e: EstadoGravador, ev: EventoGravador): EstadoGravador {
  switch (ev.tipo) {
    case 'cancelar': case 'esc': return INICIAL;
    case 'iniciar': return e.fase === 'ocioso' ? { fase: 'pedindo-permissao', segundos: 0 } : e;
    case 'permissao-concedida': return e.fase === 'pedindo-permissao' ? { fase: 'gravando', segundos: 0 } : e;
    case 'permissao-negada': return e.fase === 'pedindo-permissao' ? { fase: 'ocioso', segundos: 0, erro: MSG_PERMISSAO } : e;
    case 'sem-suporte': return e.fase === 'pedindo-permissao' ? { fase: 'ocioso', segundos: 0, erro: MSG_SEM_SUPORTE } : e;
    case 'tick': {
      if (e.fase !== 'gravando') return e;
      // Teto de 5 min: pausa sozinho (dá para ouvir e enviar; não dá para continuar).
      return ev.segundos >= TETO_SEGUNDOS ? { fase: 'pausado', segundos: TETO_SEGUNDOS } : { fase: 'gravando', segundos: ev.segundos };
    }
    case 'pausar': return e.fase === 'gravando' ? { fase: 'pausado', segundos: e.segundos } : e;
    case 'continuar': return e.fase === 'pausado' ? { fase: 'gravando', segundos: e.segundos } : e;
    case 'parar':
      if (e.fase !== 'gravando' && e.fase !== 'pausado') return e;
      return e.segundos < MINIMO_SEGUNDOS ? { fase: 'ocioso', segundos: 0, erro: MSG_CURTO } : { fase: 'parado', segundos: e.segundos };
    case 'enviar': return e.fase === 'parado' ? { fase: 'enviando', segundos: e.segundos } : e;
    case 'enviado': return e.fase === 'enviando' ? INICIAL : e;
    case 'falhou': return e.fase === 'enviando' ? { fase: 'parado', segundos: e.segundos, erro: ev.message } : e;
  }
}

export const formatarTempo = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export type FormatoGravacao = { mime: string; converter: boolean; /** Opus gerado no navegador (WASM) a partir de PCM; sai já em OGG. */ encoder?: 'wasm' };

/**
 * Ordem: OGG/Opus nativo (direto) → WebM/Opus nativo (remux para OGG) → encoder Opus em WASM (PCM, sai em OGG)
 * → MP4/AAC como áudio COMUM (a Meta não o trata como mensagem de voz). Só o último perde o "voice".
 */
export function escolherFormato(suporta: (mime: string) => boolean, opcoes: { wasm?: boolean } = {}): FormatoGravacao | null {
  if (suporta('audio/ogg;codecs=opus')) return { mime: 'audio/ogg;codecs=opus', converter: false };
  if (suporta('audio/webm;codecs=opus')) return { mime: 'audio/webm;codecs=opus', converter: true };
  if (opcoes.wasm) return { mime: 'audio/ogg;codecs=opus', converter: false, encoder: 'wasm' };
  if (suporta('audio/mp4')) return { mime: 'audio/mp4', converter: false };
  return null;
}

export type AudioPronto = { ok: true; bytes: Uint8Array; mime: string; nome: string } | { ok: false; message: string };

/** Converte (se preciso) e dá nome/mime finais ao áudio; erro do conversor vira mensagem clara. */
export function prepararAudio(bytes: Uint8Array, formato: FormatoGravacao, conversor: (b: Uint8Array) => Uint8Array): AudioPronto {
  if (formato.converter) {
    try { return { ok: true, bytes: conversor(bytes), mime: 'audio/ogg', nome: 'audio.ogg' }; } catch { return { ok: false, message: MSG_CONVERSAO }; }
  }
  return formato.mime.startsWith('audio/mp4') ? { ok: true, bytes, mime: 'audio/mp4', nome: 'audio.m4a' } : { ok: true, bytes, mime: 'audio/ogg', nome: 'audio.ogg' };
}

/** Tempo da gravação como no WhatsApp: `0:05`, `1:05`, `5:00`. */
export const formatarTempoGravacao = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** A partir de 4:50 o tempo fica âmbar, avisando que o teto de 5 min está perto. */
export const LIMITE_ALERTA_SEGUNDOS = TETO_SEGUNDOS - 10;
export const ehAlertaLimite = (segundos: number) => segundos >= LIMITE_ALERTA_SEGUNDOS;
export const MSG_LIMITE = 'Limite de 5 min';

/** "Continuar gravando" exige pausa/retomada no navegador, estar pausado e não ter batido o teto. */
export function podeContinuar(e: EstadoGravador, suportaPausa: boolean): boolean {
  return suportaPausa && e.fase === 'pausado' && e.segundos < TETO_SEGUNDOS;
}

/** Durante a gravação o composer vira só a pílula: campo, + e ⚡ somem. */
export function controlesDoComposer(gravando: boolean): { anexar: boolean; atalhos: boolean; campo: boolean } {
  return { anexar: !gravando, atalhos: !gravando, campo: !gravando };
}

/** Para onde o foco vai quando a fase muda: nunca fica perdido no body quando o botão focado some. */
export type DestinoFoco = 'campo' | 'descartar' | 'pausar' | 'continuar' | 'ouvir' | 'grupo';
export function focoDaFase(fase: FaseGravador, podeContinuarGravando: boolean): DestinoFoco {
  switch (fase) {
    case 'ocioso': return 'campo';
    case 'pedindo-permissao': return 'descartar';
    case 'gravando': return 'pausar';
    case 'pausado': return podeContinuarGravando ? 'continuar' : 'ouvir';
    case 'parado': return 'ouvir';
    case 'enviando': return 'grupo';
  }
}

/**
 * Atalhos com o foco dentro da pílula. Esc PAUSA (descartar é só pela lixeira, para não perder áudio);
 * Espaço alterna pausar/continuar quando o foco não está num botão/slider (esses já respondem a Espaço);
 * Ctrl/Cmd+Enter envia de qualquer lugar da pílula.
 */
export type AtalhoPilula = 'pausar' | 'continuar' | 'enviar';
export function atalhoDaPilula(a: { tecla: string; ctrl: boolean; meta: boolean; alvo: 'botao' | 'slider' | 'outro'; fase: FaseGravador; podeContinuar: boolean }): AtalhoPilula | null {
  if (a.tecla === 'Enter' && (a.ctrl || a.meta)) return a.fase === 'gravando' || a.fase === 'pausado' || a.fase === 'parado' ? 'enviar' : null;
  if (a.ctrl || a.meta) return null;
  if (a.tecla === 'Escape') return a.fase === 'gravando' ? 'pausar' : null;
  if (a.tecla === ' ' && a.alvo === 'outro') {
    if (a.fase === 'gravando') return 'pausar';
    if (a.fase === 'pausado' && a.podeContinuar) return 'continuar';
  }
  return null;
}

export type EventoAnuncio = { tipo: 'iniciou' } | { tipo: 'pausou'; segundos: number; limite?: boolean } | { tipo: 'continuou' } | { tipo: 'descartou' } | { tipo: 'enviando' };
/** Texto da região aria-live da gravação (leitor de tela), um por evento. */
export function anuncioDaGravacao(ev: EventoAnuncio): string {
  switch (ev.tipo) {
    case 'iniciou': return 'Gravando';
    case 'pausou': return `${ev.limite ? `${MSG_LIMITE}. ` : ''}Gravação pausada, ${formatarTempoGravacao(ev.segundos)}`;
    case 'continuou': return 'Gravando de novo';
    case 'descartou': return 'Gravação descartada';
    case 'enviando': return 'Enviando mensagem de voz';
  }
}
