'use client';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { Mic, Pause, Phone, Play } from 'lucide-react';
import { iniciais, urlMidia } from './status-mensagem';
import { ATRASO_BARRA_MS, anuncioDoPlayer, ESCALA_ESQUELETO, QTD_BARRAS, acaoDoTeclado, escalaDoPico, lerVelocidadeSalva, proximaVelocidade, salvarVelocidade, rotuloVelocidade, tempoDoTeclado, tempoPorPosicao, textoDoTempo } from './player-audio-regras';
import { registrarDuracao } from './duracao-audio';
import { pcmDaMidia } from './audio-decodificado';
import { ATRASO_ONDA_VISIVEL_MS, calcularOnda, podeCalcularOnda } from './onda-regras';
import { salvarOnda } from './transcricao-actions';
import { TranscricaoAudio } from './transcricao-audio';

/** Só um áudio toca por vez na tela: ao começar um, o anterior é pausado. */
let audioAtivo: HTMLAudioElement | null = null;

// Velocidade compartilhada por todos os players da aba e lembrada no navegador (preferência da pessoa).
const ouvintesVelocidade = new Set<() => void>();
let velocidadeMemoria: number | null = null;
const armazemLocal = () => { try { return window.localStorage; } catch { return null; } };
function velocidadeAtual(): number { return velocidadeMemoria ??= lerVelocidadeSalva(armazemLocal()); }
function assinarVelocidade(avisar: () => void) { ouvintesVelocidade.add(avisar); return () => { ouvintesVelocidade.delete(avisar); }; }
function definirVelocidade(v: number) { velocidadeMemoria = v; salvarVelocidade(v, armazemLocal()); ouvintesVelocidade.forEach(f => f()); }

/** Raio da bolinha (13px de diâmetro). A onda começa depois do diâmetro, para a bolinha parada no início não a cobrir. */
const RAIO = 6.5;
const reduzMovimento = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * Barras da onda. Cada barra tem a altura cheia e a escala vertical (`--s`) vem do pico: ao chegar a onda real a escala
 * transiciona (transform, sem layout) com um atraso curto por barra. Sem onda: esqueleto baixo e uniforme.
 */
function Barras({ onda, cor, esqueleto }: { onda: number[] | null; cor: string; esqueleto: boolean }) {
  const atraso = reduzMovimento() ? 0 : ATRASO_BARRA_MS;
  return <div {...(esqueleto ? { 'data-onda-esqueleto': '' } : {})} className="absolute inset-y-0 left-3.5 right-0 flex items-center justify-between">
    {Array.from({ length: QTD_BARRAS }, (_, i) => {
      const s = onda ? escalaDoPico(onda[i] ?? 0) : ESCALA_ESQUELETO;
      return <span key={i} data-barra style={{ '--s': s, '--d': `${i * atraso}ms` } as CSSProperties}
        className={`block h-full w-0.75 shrink-0 origin-center scale-y-(--s) rounded-full transition-transform delay-(--d) duration-240 ease-out motion-reduce:transition-none ${cor}`} />;
    })}
  </div>;
}

/**
 * Player de áudio como no WhatsApp: play/pausa, onda REAL do som com bolinha arrastável, tempo embaixo, hora à direita e,
 * na voz, o avatar do autor (com microfone) que vira o botão de velocidade enquanto toca. A onda vem do banco; sem ela,
 * ao entrar na tela o áudio é decodificado uma vez, os picos são calculados e guardados. O progresso é desenhado por
 * requestAnimationFrame direto no DOM (variável CSS e transform), sem re-renderizar a lista.
 */
export function PlayerAudio({ id, voz, saida, nome, fim, tamanho, onda: ondaInicial, transcricao }: {
  id: string; voz: boolean; saida: boolean; nome?: string; fim?: ReactNode;
  tamanho?: number | null; onda?: number[] | null; transcricao?: string | null;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const faixa = useRef<HTMLDivElement>(null);
  const bola = useRef<HTMLSpanElement>(null);
  const largura = useRef(0);
  const arrastando = useRef(false);
  const fracaoArrasto = useRef(0);
  const segundoMostrado = useRef(-1);
  const tentouOnda = useRef(false);
  const [tocando, setTocando] = useState(false);
  const [atual, setAtual] = useState(0);
  const [total, setTotal] = useState(0);
  const velocidade = useSyncExternalStore(assinarVelocidade, velocidadeAtual, () => 1);
  const [anuncio, setAnuncio] = useState(''); // região aria-live: Tocando, Pausado, velocidade
  const [onda, setOnda] = useState<number[] | null>(ondaInicial ?? null);
  useEffect(() => { if (ondaInicial) setOnda(ondaInicial); }, [ondaInicial]);

  // Posição da bolinha e da camada colorida: escrita direta no DOM (nada de setState a 60 fps).
  const pintar = useCallback((fracao: number) => {
    const f = Math.min(Math.max(fracao, 0), 1);
    const x = RAIO + f * Math.max(largura.current - 2 * RAIO, 0);
    faixa.current?.style.setProperty('--x', `${x}px`);
    if (bola.current) bola.current.style.transform = `translateX(${x - RAIO}px)`;
  }, []);

  // Largura da trilha em cache (ResizeObserver); repinta no mesmo ponto quando muda.
  useEffect(() => {
    const el = faixa.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      largura.current = e?.contentRect.width ?? 0;
      const d = ref.current?.duration;
      pintar(d && Number.isFinite(d) ? (ref.current?.currentTime ?? 0) / d : 0);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [pintar]);

  // Os metadados podem chegar antes da hidratação (o <audio> já vem no HTML do servidor): o evento se perde.
  useEffect(() => {
    const el = ref.current;
    if (el && el.readyState >= 1 && Number.isFinite(el.duration)) { setTotal(el.duration); registrarDuracao(id, el.duration); }
  }, [id]);

  // Progresso por requestAnimationFrame enquanto toca; o segundo exibido só muda (setState) uma vez por segundo.
  useEffect(() => {
    if (!tocando) return;
    let raf = 0;
    const passo = () => {
      const el = ref.current;
      if (el && !arrastando.current && Number.isFinite(el.duration) && el.duration > 0) {
        pintar(el.currentTime / el.duration);
        const s = Math.floor(el.currentTime);
        if (s !== segundoMostrado.current) { segundoMostrado.current = s; setAtual(el.currentTime); }
      }
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [tocando, pintar]);

  // Onda real, sob demanda: quando o atendente dá play OU quando a bolha fica visível por 1,5 s (e o áudio é pequeno).
  // Decodifica uma vez, calcula os picos e guarda no banco (só se ainda não há). A fila do decodificador já limita a concorrência.
  const temOnda = useRef(!!onda);
  useEffect(() => { temOnda.current = !!onda; }, [onda]);
  const vivo = useRef(true);
  useEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  const iniciarOnda = useCallback((motivo: 'play' | 'visivel') => {
    if (temOnda.current || tentouOnda.current || !podeCalcularOnda(motivo, tamanho)) return;
    tentouOnda.current = true;
    void pcmDaMidia(id).then(pcm => {
      if (!vivo.current) return;
      const nova = calcularOnda(pcm);
      setOnda(nova);
      void salvarOnda(id, nova).catch(() => undefined);
    }).catch(() => undefined); // falhou (formato, rede): fica no esqueleto
  }, [id, tamanho]);
  useEffect(() => {
    const el = faixa.current;
    if (onda || !el || tentouOnda.current || !podeCalcularOnda('visivel', tamanho) || typeof IntersectionObserver === 'undefined') return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(entradas => {
      if (entradas.some(e => e.isIntersecting)) {
        if (!timer) timer = setTimeout(() => { io.disconnect(); iniciarOnda('visivel'); }, ATRASO_ONDA_VISIVEL_MS);
      } else if (timer) { clearTimeout(timer); timer = undefined; }
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => { if (timer) clearTimeout(timer); io.disconnect(); };
  }, [onda, tamanho, iniciarOnda]);

  function alternar() {
    const el = ref.current;
    if (!el) return;
    if (el.paused) { el.playbackRate = velocidade; void el.play().catch(() => setTocando(false)); } else el.pause();
  }
  function ir(segundos: number) {
    const el = ref.current;
    if (!el) return;
    el.currentTime = segundos;
    segundoMostrado.current = Math.floor(segundos);
    setAtual(segundos);
    pintar(total > 0 ? segundos / total : 0);
  }
  const fracaoDoPonteiro = (e: PointerEvent<HTMLDivElement>) => {
    const r = faixa.current?.getBoundingClientRect();
    if (!r || r.width <= 2 * RAIO) return 0;
    return Math.min(Math.max((e.clientX - r.left - RAIO) / (r.width - 2 * RAIO), 0), 1);
  };
  function arrastar(e: PointerEvent<HTMLDivElement>) {
    const f = fracaoDoPonteiro(e);
    fracaoArrasto.current = f;
    pintar(f); // imediato; o áudio só salta ao soltar
    const s = Math.floor(f * total);
    if (s !== segundoMostrado.current) { segundoMostrado.current = s; setAtual(f * total); }
  }
  function soltar(e: PointerEvent<HTMLDivElement>) {
    if (!arrastando.current) return;
    arrastando.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    ir(tempoPorPosicao(fracaoArrasto.current, total));
  }
  function aoTeclar(e: KeyboardEvent<HTMLDivElement>) {
    const acao = acaoDoTeclado(e.key);
    if (acao === 'alternar') { e.preventDefault(); alternar(); return; }
    const t = tempoDoTeclado(e.key, atual, total);
    if (t === null) return;
    e.preventDefault();
    ir(t);
  }
  function trocarVelocidade() {
    const v = proximaVelocidade(velocidade);
    definirVelocidade(v);
    setAnuncio(anuncioDoPlayer({ tipo: 'velocidade', valor: v }));
    if (ref.current) ref.current.playbackRate = v;
  }
  const botaoVelocidade = (oculto: boolean) => <button type="button" onClick={trocarVelocidade} tabIndex={oculto ? -1 : 0} aria-hidden={oculto || undefined} aria-label={`Velocidade ${rotuloVelocidade(velocidade)}, tocar para mudar`}
    className="inline-flex h-7 min-w-11 items-center justify-center rounded-full bg-controle px-2.5 text-xs font-semibold text-foreground transition-colors duration-150 hover:bg-controle-ativo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">{rotuloVelocidade(velocidade)}</button>;
  const troca = 'absolute inset-0 flex items-center justify-center transition duration-150 motion-reduce:transition-none';

  return <div className="flex w-72 max-w-full flex-col gap-1.5 sm:w-95">
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={alternar} aria-label={tocando ? 'Pausar áudio' : 'Tocar áudio'}
        className="relative size-10 shrink-0 rounded-full text-foreground hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Play aria-hidden="true" className={`${troca} m-auto size-5 fill-current ${tocando ? 'scale-50 opacity-0' : 'scale-100 opacity-100'}`} />
        <Pause aria-hidden="true" className={`${troca} m-auto size-5 fill-current ${tocando ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} />
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div ref={faixa} role="slider" tabIndex={0} aria-label="Posição do áudio" aria-keyshortcuts="Space K ArrowLeft ArrowRight Home End" aria-valuemin={0} aria-valuemax={Math.round(total)} aria-valuenow={Math.round(atual)} aria-valuetext={`${textoDoTempo(tocando, atual, total)} de ${textoDoTempo(false, 0, total)}`}
          style={{ '--x': `${RAIO}px` } as CSSProperties}
          onKeyDown={aoTeclar}
          onPointerDown={e => { arrastando.current = true; e.currentTarget.setPointerCapture(e.pointerId); arrastar(e); }}
          onPointerMove={e => { if (arrastando.current) arrastar(e); }}
          onPointerUp={soltar}
          onPointerCancel={soltar}
          className="relative h-6.5 cursor-pointer touch-pan-y rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <div data-onda aria-hidden="true" className="absolute inset-0">
            <Barras onda={onda} esqueleto={!onda} cor="bg-muted-foreground/50" />
            <div data-onda-tocada className="absolute inset-0 [clip-path:inset(0_calc(100%-var(--x))_0_0)]">
              <Barras onda={onda} esqueleto={!onda} cor="bg-primary" />
            </div>
          </div>
          <span ref={bola} data-bolinha aria-hidden="true" className="pointer-events-none absolute left-0 top-[calc(50%-6.5px)] size-3.25 rounded-full bg-primary will-change-transform" />
        </div>
        <div className="flex items-center justify-between gap-2 font-mono text-xs text-muted-foreground">
          <span data-tempo className={tocando ? 'text-marca-tint-texto' : undefined}>{textoDoTempo(tocando, atual, total)}</span>
          {fim}
        </div>
      </div>
      {voz
        ? <span className="relative ml-1.5 size-13 shrink-0">
            <span className={`${troca} ${tocando ? 'scale-90 opacity-0' : 'scale-100 opacity-100'}`} aria-hidden={tocando || undefined}>
              <span data-avatar-voz aria-hidden="true" className={`flex size-13 items-center justify-center rounded-full font-display text-base font-semibold ${saida ? 'bg-primary text-primary-foreground' : 'bg-warning-bg text-warning-text'}`}>{(() => { const ini = iniciais(saida ? 'Você' : (nome ?? '')); return ini === '#' ? <Phone className="size-5" aria-hidden="true" /> : ini; })()}</span>
              <Mic aria-hidden="true" className="absolute -bottom-0.5 -right-1 size-3.5 text-marca-tint-texto" />
            </span>
            <span className={`${troca} ${tocando ? 'scale-100 opacity-100' : 'pointer-events-none scale-90 opacity-0'}`}>{botaoVelocidade(!tocando)}</span>
          </span>
        : <span className="ml-1 shrink-0">{botaoVelocidade(false)}</span>}
    </div>
    <span aria-live="polite" role="status" className="sr-only">{anuncio}</span>
    <TranscricaoAudio id={id} tamanho={tamanho ?? null} duracao={total} transcricao={transcricao} />
    <audio ref={ref} src={urlMidia(id)} preload="metadata"
      onLoadedMetadata={e => { setTotal(e.currentTarget.duration); registrarDuracao(id, e.currentTarget.duration); }}
      onDurationChange={e => { if (Number.isFinite(e.currentTarget.duration)) { setTotal(e.currentTarget.duration); registrarDuracao(id, e.currentTarget.duration); } }}
      onPlay={e => {
        if (audioAtivo && audioAtivo !== e.currentTarget) audioAtivo.pause();
        audioAtivo = e.currentTarget;
        e.currentTarget.playbackRate = velocidade;
        setTocando(true);
        setAnuncio(anuncioDoPlayer({ tipo: 'tocando' }));
        iniciarOnda('play');
      }}
      onPause={e => { setTocando(false); setAnuncio(anuncioDoPlayer({ tipo: 'pausado' })); setAtual(e.currentTarget.currentTime); if (e.currentTarget.duration > 0) pintar(e.currentTarget.currentTime / e.currentTarget.duration); }}
      onEnded={() => { setTocando(false); setAtual(0); segundoMostrado.current = 0; pintar(0); audioAtivo = null; }} />
  </div>;
}
