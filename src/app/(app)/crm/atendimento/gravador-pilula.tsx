'use client';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { Loader2, Mic, Pause, Play, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ehAlertaLimite, formatarTempoGravacao, type FaseGravador } from './gravador-regras';
import { acaoDoTeclado, tempoDoTeclado } from './player-audio-regras';
import { alturaDaBarra, resumirNiveis, slotsDaOnda } from './gravador-onda';

/** Largura de uma barra (3px) + vão (2px): a capacidade da trilha ao vivo sai da largura medida. */
const PASSO_BARRA = 5;
const BARRAS_PREVIA = 80;
const RAIO_BOLA = 6;

export type PropsPilula = {
  fase: Exclude<FaseGravador, 'ocioso'>;
  segundos: number;
  /** Níveis recentes do microfone (onda ao vivo), do mais antigo ao mais novo. */
  niveis: readonly number[];
  /** Gravação inteira em 40 barras (onda da prévia na pausa). */
  resumo: readonly number[];
  /** Posição da prévia 0..1 e se está tocando. */
  fracao: number;
  tocando: boolean;
  previaPronta: boolean;
  podeContinuar: boolean;
  /** Aviso curto (limite de 5 min) em role=status. */
  aviso: string;
  onCapacidade: (barras: number) => void;
  onDescartar: () => void;
  onPausar: () => void;
  onContinuar: () => void;
  onOuvir: () => void;
  onBuscar: (fracao: number) => void;
  /** Tocar/pausar a prévia pelo teclado na barra (Espaço/Enter/K). */
  onAlternarPrevia?: () => void;
  onEnviar: () => void;
  /** Teclas dentro da pílula (Espaço fora de botão, Ctrl/Cmd+Enter). */
  onTeclado?: (e: KeyboardEvent<HTMLDivElement>) => void;
};

const ALVO = 'shrink-0 [&>button]:size-11 [&>button]:rounded-full';
const ALVO_ENVIAR = 'shrink-0 [&>button]:size-12 [&>button]:rounded-full';

/** Trilha da onda ao vivo: barras nascem à esquerda conforme o volume; o resto fica em pontinhos. */
function OndaViva({ niveis, onCapacidade }: { niveis: readonly number[]; onCapacidade: (n: number) => void }) {
  const trilha = useRef<HTMLSpanElement>(null);
  const [cap, setCap] = useState(48);
  useEffect(() => {
    const el = trilha.current;
    if (!el) return;
    const medir = () => { const n = Math.max(1, Math.floor(el.clientWidth / PASSO_BARRA)); setCap(n); onCapacidade(n); };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onCapacidade]);
  const slots = slotsDaOnda(niveis, cap);
  return <span ref={trilha} data-onda-viva aria-hidden="true" className="flex h-6.5 min-w-0 flex-1 items-center gap-0.5 overflow-hidden">
    {slots.map((s, i) => s.tipo === 'barra'
      ? <span key={i} style={{ '--h': `${s.altura}px` } as CSSProperties} className="h-(--h) w-0.75 shrink-0 rounded-full bg-foreground/80" />
      : <span key={i} className="size-0.75 shrink-0 rounded-full bg-muted-foreground/50" />)}
  </span>;
}

/** Onda do que foi gravado com bolinha arrastável (mesmo gesto do player das bolhas). */
function OndaPrevia({ resumo, fracao, segundos, onBuscar, onAlternar }: { resumo: readonly number[]; fracao: number; segundos: number; onBuscar: (f: number) => void; onAlternar?: () => void }) {
  const faixa = useRef<HTMLDivElement>(null);
  const arrastando = useRef(false);
  const [n, setN] = useState(BARRAS_PREVIA);
  useEffect(() => {
    const el = faixa.current;
    if (!el) return;
    const medir = () => setN(Math.min(BARRAS_PREVIA, Math.max(8, Math.floor((el.clientWidth - 12) / PASSO_BARRA))));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const barras = resumirNiveis(resumo, n);
  const doPonteiro = (e: PointerEvent<HTMLDivElement>) => {
    const r = faixa.current?.getBoundingClientRect();
    if (!r || r.width <= 2 * RAIO_BOLA) return 0;
    return Math.min(Math.max((e.clientX - r.left - RAIO_BOLA) / (r.width - 2 * RAIO_BOLA), 0), 1);
  };
  // Mesmas regras do player das bolhas: Espaço/Enter/K alternam, setas movem 5 s, Home/End vão às pontas.
  const aoTeclar = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return; // Ctrl/Cmd+Enter é do envio, tratado na pílula
    const acao = acaoDoTeclado(e.key);
    if (acao === 'alternar') { e.preventDefault(); onAlternar?.(); return; }
    if (segundos <= 0) return;
    const t = tempoDoTeclado(e.key, fracao * segundos, segundos);
    if (t === null) return;
    e.preventDefault();
    onBuscar(Math.min(Math.max(t / segundos, 0), 1));
  };
  const f = Math.min(Math.max(fracao, 0), 1);
  return <div ref={faixa} role="slider" tabIndex={0} aria-label="Posição da prévia" aria-keyshortcuts="Space K ArrowLeft ArrowRight Home End" aria-valuemin={0} aria-valuemax={segundos} aria-valuenow={Math.round(f * segundos)}
    aria-valuetext={`${formatarTempoGravacao(Math.round(f * segundos))} de ${formatarTempoGravacao(segundos)}`}
    onKeyDown={aoTeclar}
    onPointerDown={e => { arrastando.current = true; e.currentTarget.setPointerCapture(e.pointerId); onBuscar(doPonteiro(e)); }}
    onPointerMove={e => { if (arrastando.current) onBuscar(doPonteiro(e)); }}
    onPointerUp={e => { arrastando.current = false; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}
    onPointerCancel={() => { arrastando.current = false; }}
    className="relative h-8 min-w-0 flex-1 cursor-pointer touch-none rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <div aria-hidden="true" className="absolute inset-y-0 left-1.5 right-1.5 flex items-center justify-between">
      {barras.map((v, i) => <span key={i} style={{ '--h': `${alturaDaBarra(v)}px` } as CSSProperties} className={`h-(--h) w-0.75 shrink-0 rounded-full ${i / n < f ? 'bg-primary' : 'bg-muted-foreground/60'}`} />)}
    </div>
    <span data-bolinha aria-hidden="true" style={{ '--f': f } as CSSProperties} className="pointer-events-none absolute left-[calc(var(--f)*(100%-12px))] top-[calc(50%-6px)] size-3 rounded-full bg-primary" />
  </div>;
}

/**
 * Composer em gravação, como no WhatsApp: UMA pílula com tudo à direita. Gravando: lixeira, ponto, tempo, onda ao vivo,
 * pausa e enviar. Pausado: lixeira, ouvir, onda com bolinha, duração, continuar (mic) e enviar.
 */
export function PilulaGravacao(p: PropsPilula) {
  const { fase, segundos } = p;
  const gravando = fase === 'gravando';
  const codificando = fase === 'parado' && !p.previaPronta;
  const travado = fase === 'enviando';
  const enviarOff = travado || codificando;
  const enviarBtn = <span className={ALVO_ENVIAR}><Button type="button" size="icon" aria-label="Enviar mensagem de voz" title="Enviar (Ctrl+Enter)" aria-keyshortcuts="Control+Enter Meta+Enter" data-foco="enviar" aria-busy={travado || codificando} disabled={enviarOff} onClick={p.onEnviar}>
    {travado || codificando ? <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Send className="size-5" aria-hidden="true" />}</Button></span>;
  const lixeira = <span className={ALVO}><Button type="button" variant="ghost" size="icon" aria-label="Descartar gravação" title="Descartar gravação" data-foco="descartar" disabled={travado} onClick={p.onDescartar}><Trash2 className="size-5.5 text-foreground/80" aria-hidden="true" /></Button></span>;

  return <div role="group" aria-label="Gravação de áudio" tabIndex={-1} data-gravacao-raiz onKeyDown={p.onTeclado} className="relative min-w-0 flex-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <span role="status" className="absolute bottom-full right-3 mb-1.5 rounded-controle bg-warning-bg px-2.5 py-1 text-xs font-semibold text-warning-text empty:hidden">{p.aviso}</span>
    <div className="flex h-14 min-w-0 items-center justify-end gap-1 rounded-full border border-painel-borda bg-controle pl-3 pr-1.5 sm:gap-3.5 sm:pl-5">
      {lixeira}
      {fase === 'pedindo-permissao' && <span className="min-w-0 flex-1 truncate text-right text-sm text-texto-secundario">Aguardando permissão do microfone...</span>}
      {gravando && <>
        <span data-ponto-rec aria-hidden="true" className="size-2.5 shrink-0 animate-pulse rounded-full bg-error [animation-duration:1s] motion-reduce:animate-none" />
        <span role="timer" aria-label={`Gravando, ${segundos} segundos`} className={`min-w-10 shrink-0 text-lg font-medium tabular-nums ${ehAlertaLimite(segundos) ? 'text-warning-text' : 'text-foreground'}`}>{formatarTempoGravacao(segundos)}</span>
        <OndaViva niveis={p.niveis} onCapacidade={p.onCapacidade} />
        <span className={ALVO}><Button type="button" variant="ghost" size="icon" aria-label="Pausar gravação" title="Pausar (Esc)" aria-keyshortcuts="Escape" data-foco="pausar" onClick={p.onPausar}><Pause className="size-5 fill-current text-error-text" aria-hidden="true" /></Button></span>
        {enviarBtn}
      </>}
      {(fase === 'pausado' || fase === 'parado' || fase === 'enviando') && <>
        <span className={ALVO}><Button type="button" variant="ghost" size="icon" aria-label={p.tocando ? 'Pausar prévia' : 'Ouvir antes de enviar'} title={p.tocando ? 'Pausar prévia' : 'Ouvir antes de enviar'} data-foco="ouvir" disabled={travado || codificando} onClick={p.onOuvir}>
          {p.tocando ? <Pause className="size-5 fill-current" aria-hidden="true" /> : <Play className="size-5 fill-current" aria-hidden="true" />}</Button></span>
        <OndaPrevia resumo={p.resumo} fracao={p.fracao} segundos={segundos} onBuscar={p.onBuscar} onAlternar={p.onAlternarPrevia ?? p.onOuvir} />
        {codificando
          ? <span role="status" className="shrink-0 text-sm text-texto-secundario">Codificando…</span>
          : <span className={`shrink-0 text-sm font-medium tabular-nums ${ehAlertaLimite(segundos) ? 'text-warning-text' : 'text-texto-secundario'}`}>{formatarTempoGravacao(segundos)}</span>}
        {p.podeContinuar && fase === 'pausado' && <span className={ALVO}><Button type="button" variant="ghost" size="icon" aria-label="Continuar gravando" title="Continuar gravando (Espaço)" data-foco="continuar" onClick={p.onContinuar}><Mic className="size-5 text-error-text" aria-hidden="true" /></Button></span>}
        {enviarBtn}
      </>}
    </div>
  </div>;
}
