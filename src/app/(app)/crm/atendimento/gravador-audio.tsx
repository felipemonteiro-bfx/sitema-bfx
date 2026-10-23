'use client';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { webmParaOggOpus } from '@/lib/audio-webm-para-ogg';
import { iniciarCapturaPcm, suportaOpusWasm, type CapturaPcm } from './gravador-wasm';
import { iniciarNivel } from './gravador-nivel';
import { adicionarNivel, resumirNiveis } from './gravador-onda';
import { PilulaGravacao } from './gravador-pilula';
import type { KeyboardEvent as TeclaReact } from 'react';
import { INICIAL, MSG_LIMITE, MSG_SEM_SUPORTE, TETO_SEGUNDOS, acaoAoSoltar, anuncioDaGravacao, atalhoDaPilula, focoDaFase, escolherCaptura, escolherFormato, verificarMono, podeContinuar, prepararAudio, reduzir, type FormatoGravacao } from './gravador-regras';

const BARRAS_RESUMO = 80;

/**
 * Microfone do composer. Ocioso: só o botão redondo. Em uso: o composer vira UMA pílula (gravando: onda ao vivo, pausa,
 * enviar; pausado: ouvir, onda com bolinha, continuar, enviar). Clique alterna gravar/parar; segurar grava e soltar para;
 * Esc descarta. O envio é do composer (`onEnviar`).
 */
export function GravadorAudio({ desabilitado, onEnviar, onFase }: {
  desabilitado: boolean;
  onEnviar: (arquivo: File) => Promise<{ ok: boolean; message: string }>;
  onFase: (ativo: boolean) => void;
}) {
  const [estado, dispatch] = useReducer(reduzir, INICIAL);
  const [previa, setPrevia] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');
  const [avisoLimite, setAvisoLimite] = useState('');
  const [anuncio, setAnuncio] = useState(''); // região aria-live (leitor de tela)
  const [niveis, setNiveis] = useState<number[]>([]);
  const [resumo, setResumo] = useState<number[]>(() => new Array<number>(BARRAS_RESUMO).fill(0));
  const [fracao, setFracao] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [pausaOk, setPausaOk] = useState(true);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const pedaços = useRef<Blob[]>([]);
  const formato = useRef<FormatoGravacao | null>(null);
  const blob = useRef<Blob | null>(null);
  const pcm = useRef<CapturaPcm | null>(null); // encoder Opus WASM (quando o MediaRecorder não grava Opus)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const inicio = useRef(0); // começo do trecho em andamento
  const acumulado = useRef(0); // ms de trechos anteriores (a pausa não conta)
  const rodando = useRef(false);
  const toque = useRef(0);
  const ficha = useRef(0); // invalida pedidos de permissão cancelados no meio
  const ctx = useRef<AudioContext | null>(null); // grafo que força mono; fechado em limpar()
  const soltou = useRef<(() => void) | null>(null); // pointerup em window enquanto segura
  const parouAoSoltar = useRef(false); // soltou (após segurar) antes de o microfone liberar
  const nivelParar = useRef<(() => void) | null>(null);
  const niveisTodos = useRef<number[]>([]);
  const capacidade = useRef(48);
  const enviarAoPronto = useRef(false); // enviar durante gravação/pausa: para, codifica e envia
  const audioPrevia = useRef<HTMLAudioElement | null>(null);
  const urlParcial = useRef<string | null>(null);
  const fase = estado.fase;
  const faseRef = useRef(fase);
  const onEnviarRef = useRef(onEnviar);
  useEffect(() => { faseRef.current = fase; onEnviarRef.current = onEnviar; });

  // O botão ocioso é desmontado ao iniciar, então o pointerup dele nunca chega: escuta em window.
  const desarmarSoltar = useCallback(() => {
    if (soltou.current) { window.removeEventListener('pointerup', soltou.current); window.removeEventListener('pointercancel', soltou.current); soltou.current = null; }
  }, []);

  const largarPrevia = useCallback(() => {
    audioPrevia.current?.pause(); audioPrevia.current = null;
    if (urlParcial.current) { URL.revokeObjectURL(urlParcial.current); urlParcial.current = null; }
    setTocando(false); setFracao(0);
  }, []);

  const limpar = useCallback(() => {
    desarmarSoltar(); parouAoSoltar.current = false; enviarAoPronto.current = false;
    nivelParar.current?.(); nivelParar.current = null;
    largarPrevia();
    if (ctx.current) { void ctx.current.close().catch(() => undefined); ctx.current = null; }
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    stream.current?.getTracks().forEach(t => t.stop()); stream.current = null;
    pcm.current?.cancelar(); pcm.current = null;
    const r = recorder.current; recorder.current = null;
    if (r && r.state !== 'inactive') { r.ondataavailable = null; r.onstop = null; try { r.stop(); } catch { /* já parado */ } }
    pedaços.current = []; blob.current = null; niveisTodos.current = []; acumulado.current = 0; rodando.current = false;
    setNiveis([]); setAvisoLimite('');
  }, [desarmarSoltar, largarPrevia]);
  const cancelar = useCallback(() => { ficha.current++; limpar(); setAviso(''); dispatch({ tipo: 'cancelar' }); }, [limpar]);
  const decorridoMs = () => acumulado.current + (rodando.current ? Date.now() - inicio.current : 0);

  useEffect(() => { onFase(fase !== 'ocioso'); }, [fase, onFase]);
  useEffect(() => () => { ficha.current++; limpar(); }, [limpar]);
  // Prévia de escuta final: o object URL nasce no onstop e é revogado ao trocar, ao voltar a ocioso e ao desmontar.
  useEffect(() => () => { if (previa) URL.revokeObjectURL(previa); }, [previa]);
  useEffect(() => { if (fase === 'ocioso') setPrevia(null); }, [fase]);
  // Posição da bolinha da prévia enquanto toca.
  useEffect(() => {
    if (!tocando) return;
    let raf = 0;
    const passo = () => {
      const el = audioPrevia.current; const dur = acumulado.current / 1000;
      if (el && dur > 0) setFracao(Math.min(el.currentTime / dur, 1));
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [tocando]);

  function depoisDeCodificar() {
    if (enviarAoPronto.current) { enviarAoPronto.current = false; void enviar(); }
  }

  function parar() {
    desarmarSoltar();
    blob.current = null; // o áudio anterior (se houve) não pode ser enviado enquanto este ainda codifica
    const minhaFicha = ficha.current; // cancelar/reiniciar durante o encode invalida o resultado
    const r = recorder.current;
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    nivelParar.current?.(); nivelParar.current = null;
    largarPrevia();
    acumulado.current = decorridoMs(); rodando.current = false;
    const segundos = Math.round(acumulado.current / 1000);
    if (faseRef.current === 'gravando') dispatch({ tipo: 'tick', segundos: Math.min(segundos, TETO_SEGUNDOS) }); // fixa a duração final antes de parar
    dispatch({ tipo: 'parar' });
    const captura = pcm.current;
    if (captura) {
      pcm.current = null;
      void captura.parar().then(bytes => {
        if (minhaFicha !== ficha.current) return;
        blob.current = new Blob([bytes as BlobPart], { type: 'audio/ogg' });
        stream.current?.getTracks().forEach(t => t.stop()); stream.current = null;
        setPrevia(URL.createObjectURL(blob.current));
        depoisDeCodificar();
      }).catch(() => { if (minhaFicha !== ficha.current) return; enviarAoPronto.current = false; setAviso('Não foi possível codificar o áudio neste navegador'); dispatch({ tipo: 'cancelar' }); });
    } else if (r && r.state !== 'inactive') {
      r.onstop = () => { if (minhaFicha !== ficha.current) return; blob.current = new Blob(pedaços.current, { type: formato.current?.mime ?? '' }); stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; setPrevia(URL.createObjectURL(blob.current)); depoisDeCodificar(); };
      r.stop();
    }
  }

  function iniciarRelogio() {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      const seg = Math.floor(decorridoMs() / 1000);
      if (seg >= TETO_SEGUNDOS) { pausar(true); return; }
      dispatch({ tipo: 'tick', segundos: seg });
    }, 250);
  }

  /** Pausa a gravação (botão ou teto de 5 min): o microfone segue aberto, o áudio fica guardado para continuar ou enviar. */
  function pausar(limite = false) {
    if (faseRef.current !== 'gravando') return;
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    acumulado.current = limite ? TETO_SEGUNDOS * 1000 : decorridoMs();
    rodando.current = false;
    const r = recorder.current;
    if (r && r.state === 'recording') { try { r.pause(); r.requestData(); } catch { /* sem pausa */ } }
    pcm.current?.pausar();
    setResumo(resumirNiveis(niveisTodos.current, BARRAS_RESUMO));
    setAvisoLimite(limite ? MSG_LIMITE : '');
    const segPausa = Math.min(Math.floor(acumulado.current / 1000), TETO_SEGUNDOS);
    dispatch({ tipo: 'tick', segundos: segPausa });
    dispatch({ tipo: 'pausar' });
    setAnuncio(anuncioDaGravacao({ tipo: 'pausou', segundos: segPausa, limite }));
  }

  function continuar() {
    if (faseRef.current !== 'pausado' || acumulado.current >= TETO_SEGUNDOS * 1000) return;
    largarPrevia(); setAvisoLimite('');
    const r = recorder.current;
    if (r && r.state === 'paused') { try { r.resume(); } catch { /* sem retomada */ } }
    pcm.current?.continuar();
    inicio.current = Date.now(); rodando.current = true;
    dispatch({ tipo: 'continuar' });
    setAnuncio(anuncioDaGravacao({ tipo: 'continuou' }));
    iniciarRelogio();
  }

  /** Ouvir antes de enviar: toca o que já foi gravado (parcial na pausa; o arquivo final depois de parar). */
  async function ouvir() {
    if (audioPrevia.current && !audioPrevia.current.ended) {
      const a = audioPrevia.current;
      if (a.paused) void a.play().then(() => setTocando(true)).catch(() => setTocando(false)); else { a.pause(); setTocando(false); }
      return;
    }
    largarPrevia();
    let url = previa;
    if (!url) {
      if (pcm.current) {
        const minhaFicha = ficha.current;
        const bytes = await pcm.current.previa().catch(() => null);
        if (!bytes || minhaFicha !== ficha.current) return;
        url = urlParcial.current = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'audio/ogg' }));
      } else {
        const r = recorder.current;
        if (r && r.state === 'paused') { try { r.requestData(); } catch { /* ok */ } }
        if (!pedaços.current.length) return;
        url = urlParcial.current = URL.createObjectURL(new Blob(pedaços.current, { type: formato.current?.mime ?? '' }));
      }
    }
    const a = new Audio(url); audioPrevia.current = a;
    a.onended = () => { setTocando(false); setFracao(0); a.currentTime = 0; };
    // WebM do MediaRecorder não traz duração (Infinity): força o cálculo para permitir buscar.
    a.onloadedmetadata = () => { if (a.duration === Infinity) { a.currentTime = 1e101; a.ontimeupdate = () => { a.ontimeupdate = null; a.currentTime = 0; }; } };
    const dur = acumulado.current / 1000;
    if (fracao > 0 && fracao < 1 && dur > 0) a.currentTime = fracao * dur;
    void a.play().then(() => setTocando(true)).catch(() => setTocando(false));
  }
  function buscar(f: number) {
    setFracao(f);
    const a = audioPrevia.current; const dur = acumulado.current / 1000;
    if (a && dur > 0) { try { a.currentTime = f * dur; } catch { /* ainda sem metadados */ } }
  }

  async function iniciar() {
    if (desabilitado || fase !== 'ocioso') return;
    parouAoSoltar.current = false; blob.current = null; acumulado.current = 0; niveisTodos.current = []; setNiveis([]); setAvisoLimite('');
    setAviso(''); dispatch({ tipo: 'iniciar' });
    const meu = ++ficha.current;
    const fmt = escolherFormato(m => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m), { wasm: suportaOpusWasm() });
    if (!fmt || !navigator.mediaDevices?.getUserMedia) { setAviso(MSG_SEM_SUPORTE); dispatch({ tipo: 'sem-suporte' }); return; }
    const comecar = (s: MediaStream) => {
      rodando.current = true; inicio.current = Date.now();
      dispatch({ tipo: 'permissao-concedida' });
      setAnuncio(anuncioDaGravacao({ tipo: 'iniciou' }));
      // Onda ao vivo: o nível do microfone entra só enquanto grava (pausado a onda para).
      nivelParar.current = iniciarNivel(s, n => {
        if (faseRef.current !== 'gravando') return;
        niveisTodos.current.push(n);
        setNiveis(atual => adicionarNivel(atual, n, capacidade.current));
      });
      iniciarRelogio();
      // Soltou (depois de segurar) enquanto o navegador pedia permissão: para assim que a gravação começa.
      if (parouAoSoltar.current) { parouAoSoltar.current = false; parar(); }
    };
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true } });
      if (meu !== ficha.current) { s.getTracks().forEach(t => t.stop()); return; } // cancelado enquanto pedia
      stream.current = s; formato.current = fmt; pedaços.current = [];
      let paraGravar: MediaStream = s;
      if (fmt.encoder === 'wasm') {
        // Sem MediaRecorder de Opus: PCM mono pelo AudioWorklet e libopus em WASM (baixado só agora).
        const cap = await iniciarCapturaPcm(s);
        if (meu !== ficha.current) { cap.cancelar(); return; }
        pcm.current = cap; setPausaOk(true);
        comecar(s);
        return;
      }
      const captura = escolherCaptura({ audioContext: typeof AudioContext !== 'undefined', destinoMediaStream: typeof AudioContext !== 'undefined' && 'createMediaStreamDestination' in AudioContext.prototype });
      if (captura === 'grafo-mono') {
        const ac = new AudioContext(); ctx.current = ac;
        const destino = ac.createMediaStreamDestination();
        destino.channelCount = 1; destino.channelCountMode = 'explicit';
        ac.createMediaStreamSource(s).connect(destino);
        paraGravar = destino.stream;
      }
      // Pelo grafo mono o Chrome ainda reporta 2 canais no track de destino; a conversão já garante 1 canal.
      const mono = captura === 'direto' ? verificarMono(paraGravar.getAudioTracks()[0]?.getSettings().channelCount) : { ok: true as const };
      if (!mono.ok) { limpar(); setAviso(mono.message); dispatch({ tipo: 'sem-suporte' }); return; }
      const r = new MediaRecorder(paraGravar, { mimeType: fmt.mime });
      r.ondataavailable = e => { if (e.data.size) pedaços.current.push(e.data); };
      recorder.current = r; setPausaOk(typeof r.pause === 'function' && typeof r.resume === 'function'); r.start();
      comecar(s);
    } catch { if (meu === ficha.current) { limpar(); dispatch({ tipo: 'permissao-negada' }); } }
  }

  /** Enviar vale gravando ou pausado: para, espera o arquivo existir e envia. */
  function enviarAgora() {
    if (faseRef.current === 'gravando' || faseRef.current === 'pausado') { enviarAoPronto.current = true; parar(); return; }
    void enviar();
  }

  async function enviar() {
    if (faseRef.current !== 'parado' || !blob.current || !formato.current) return;
    const bruto = new Uint8Array(await blob.current.arrayBuffer());
    const pronto = prepararAudio(bruto, formato.current, webmParaOggOpus);
    if (!pronto.ok) { setAviso(pronto.message); return; }
    setAviso(''); dispatch({ tipo: 'enviar' }); setAnuncio(anuncioDaGravacao({ tipo: 'enviando' }));
    const arquivo = new File([pronto.bytes as BlobPart], pronto.nome, { type: pronto.mime });
    try {
      const r = await onEnviarRef.current(arquivo);
      if (r.ok) { limpar(); dispatch({ tipo: 'enviado' }); } else dispatch({ tipo: 'falhou', message: r.message });
    } catch { dispatch({ tipo: 'falhou', message: 'Não foi possível confirmar o envio. Confira o histórico antes de repetir.' }); }
  }

  // Esc PAUSA a gravação (descartar é só pela lixeira, para não perder áudio por engano).
  useEffect(() => {
    if (fase !== 'gravando') return;
    const h = (e: KeyboardEvent) => {
      if (e.defaultPrevented || atalhoDaPilula({ tecla: e.key, ctrl: e.ctrlKey, meta: e.metaKey, alvo: 'outro', fase, podeContinuar: false }) !== 'pausar') return;
      e.preventDefault(); pausar();
    };
    document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h);
  });
  // Foco acompanha a fase: o botão focado some a cada troca, então o destino é o próximo controle útil. Voltar ao campo é do composer.
  const faseAnterior = useRef<typeof fase>('ocioso');
  useEffect(() => {
    const antes = faseAnterior.current; faseAnterior.current = fase;
    if (antes === fase || fase === 'ocioso') return;
    const ativo = document.activeElement;
    if (ativo && ativo !== document.body && !ativo.closest('[data-gravacao-raiz]')) return; // a pessoa foi para outro lugar: não rouba o foco
    const raiz = document.querySelector<HTMLElement>('[data-gravacao-raiz]');
    const destino = focoDaFase(fase, podeContinuar(estado, pausaOk));
    (destino === 'grupo' ? raiz : raiz?.querySelector<HTMLElement>(`[data-foco="${destino}"]`))?.focus();
  }, [fase, estado, pausaOk]);
  function aoTeclarPilula(e: TeclaReact<HTMLDivElement>) {
    const alvo = (e.target as HTMLElement).closest('button') ? 'botao' : (e.target as HTMLElement).closest('[role="slider"]') ? 'slider' : 'outro';
    const acao = atalhoDaPilula({ tecla: e.key, ctrl: e.ctrlKey, meta: e.metaKey, alvo, fase, podeContinuar: podeContinuar(estado, pausaOk) });
    if (!acao || e.key === 'Escape') return;
    e.preventDefault(); // também impede o Enter de clicar no botão focado
    if (acao === 'pausar') pausar(); else if (acao === 'continuar') continuar(); else enviarAgora();
  }
  function descartar() { cancelar(); setAnuncio(anuncioDaGravacao({ tipo: 'descartou' })); }

  const erro = aviso || estado.erro || '';
  const regiao = <span key="regiao" aria-live="polite" role="status" className="sr-only">{anuncio}</span>;
  if (fase === 'ocioso') {
    return <>
      <span className="shrink-0 [&>button]:size-12 [&>button]:rounded-full"><Button type="button" size="icon" aria-label="Gravar áudio" title="Gravar áudio (clique ou segure)" disabled={desabilitado}
        onPointerDown={e => {
          if (e.button !== 0) return;
          toque.current = Date.now(); void iniciar();
          // Segurar e soltar: o botão some ao iniciar, então o "soltar" é ouvido na janela até parar/cancelar.
          desarmarSoltar();
          const h = () => {
            desarmarSoltar();
            // Clique curto: a gravação segue até clicar de novo. Segurou: para (MediaRecorder ou captura WASM) ou adia.
            const acao = acaoAoSoltar(Date.now() - toque.current, { recorder: !!recorder.current, pcm: !!pcm.current });
            if (acao === 'parar') parar(); else if (acao === 'adiar') parouAoSoltar.current = true;
          };
          soltou.current = h;
          window.addEventListener('pointerup', h); window.addEventListener('pointercancel', h);
        }}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toque.current = 0; void iniciar(); } }}>
        <Mic className="size-5" aria-hidden="true"/></Button></span>
      {erro && <p role="alert" className="absolute bottom-full left-3 right-3 mb-1 rounded-controle border border-divisoria bg-controle p-2 text-sm">{erro}</p>}
      {regiao}
    </>;
  }
  return <>
    <PilulaGravacao fase={fase} segundos={estado.segundos} niveis={niveis} resumo={resumo} fracao={fracao} tocando={tocando}
      previaPronta={!!previa} podeContinuar={podeContinuar(estado, pausaOk)} aviso={avisoLimite}
      onCapacidade={n => { capacidade.current = n; }} onDescartar={descartar} onTeclado={aoTeclarPilula} onAlternarPrevia={() => void ouvir()} onPausar={() => pausar()} onContinuar={continuar}
      onOuvir={() => void ouvir()} onBuscar={buscar} onEnviar={enviarAgora}/>
    {erro && <p role="alert" className="absolute bottom-full left-3 right-3 mb-1 rounded-controle border border-divisoria bg-controle p-2 text-sm">{erro}</p>}
    {regiao}
  </>;
}
