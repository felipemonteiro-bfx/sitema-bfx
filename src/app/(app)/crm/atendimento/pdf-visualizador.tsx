'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { ChevronDown, ChevronUp, Download, X, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { abrirPdf, podeVisualizar } from './pdf-cliente';
import { RAZAO_PADRAO, avisoLimitePaginas, paginasExibidas } from './pdf-regras';
import { dataRelativa, formatarTamanho, iniciais, urlMidia } from './status-mensagem';

const ZOOMS = [50, 75, 100, 125, 150, 200] as const;
const LARGURA_MAXIMA = 880;

export type DadosVisualizador = { id: string; nome: string; tamanho: number | null; paginas: number | null; remetente: string; hora: string; quando?: Date | string };

/** Uma página: reserva a altura certa e só pinta no canvas enquanto está perto da área visível. */
function PaginaPdf({ pdf, numero, largura, razao, raiz, aoMedir }: { pdf: PDFDocumentProxy; numero: number; largura: number; razao: number; raiz: React.RefObject<HTMLDivElement | null>; aoMedir: (numero: number, razao: number) => void }) {
  const caixa = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = caixa.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setVisivel(true); return; }
    const obs = new IntersectionObserver(([e]) => setVisivel(e.isIntersecting), { root: raiz.current, rootMargin: '900px 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [raiz]);

  useEffect(() => {
    const alvo = canvas.current;
    if (!alvo) return;
    if (!visivel) { alvo.width = 0; alvo.height = 0; return; }
    let vivo = true;
    let tarefa: { cancel: () => void } | null = null;
    void (async () => {
      try {
        const pagina = await pdf.getPage(numero);
        if (!vivo) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const base = pagina.getViewport({ scale: 1 });
        aoMedir(numero, base.height / base.width);
        const viewport = pagina.getViewport({ scale: (largura * dpr) / base.width });
        alvo.width = Math.floor(viewport.width);
        alvo.height = Math.floor(viewport.height);
        const render = pagina.render({ canvasContext: alvo.getContext('2d')!, viewport });
        tarefa = render;
        await render.promise;
      } catch { /* render cancelado ou página ilegível: fica o fundo em branco */ }
    })();
    return () => { vivo = false; tarefa?.cancel(); };
    // aoMedir é estável (setState do pai).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visivel, pdf, numero, largura]);

  return <div ref={caixa} data-pagina={numero} style={{ width: largura, height: Math.round(largura * razao) }} className="bloco-sensivel relative mx-auto shrink-0 bg-popover shadow-(--shadow-lg)">
    <canvas ref={canvas} role="img" aria-label={`Página ${numero}`} className="block size-full" />
  </div>;
}

type Carga = { estado: 'carregando' } | { estado: 'erro' } | { estado: 'grande' } | { estado: 'pronto'; pdf: PDFDocumentProxy };

function Corpo({ d, atual, aoMudarPagina, aoCarregar, zoom, registrarNavegar }: {
  d: DadosVisualizador; atual: number; aoMudarPagina: (n: number) => void; aoCarregar: (paginas: number) => void; zoom: number; registrarNavegar: (fn: (n: number) => void) => void;
}) {
  const rolagem = useRef<HTMLDivElement>(null);
  const [carga, setCarga] = useState<Carga>(podeVisualizar(d.tamanho) ? { estado: 'carregando' } : { estado: 'grande' });
  const [espaco, setEspaco] = useState(LARGURA_MAXIMA);
  const [razoes, setRazoes] = useState<Record<number, number>>({});
  const medir = useCallback((n: number, r: number) => setRazoes(a => (Math.abs((a[n] ?? RAZAO_PADRAO) - r) < 0.005 ? a : { ...a, [n]: r })), []);

  useEffect(() => {
    if (!podeVisualizar(d.tamanho)) return;
    let vivo = true;
    const aberto = abrirPdf(d.id);
    aberto.pdf.then(pdf => {
      // Nada de getPage em todas as páginas: cada uma reserva a proporção padrão e se mede ao ficar visível.
      if (vivo) { setCarga({ estado: 'pronto', pdf }); aoCarregar(pdf.numPages); }
    }).catch(() => { if (vivo) setCarga({ estado: 'erro' }); });
    return () => { vivo = false; aberto.soltar(); };
    // aoCarregar é um setState estável do pai.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.id, d.tamanho]);

  useEffect(() => {
    const el = rolagem.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver(() => setEspaco(Math.max(240, el.clientWidth - (el.clientWidth >= 640 ? 160 : 48))));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const navegar = useCallback((n: number) => {
    const el = rolagem.current;
    const pagina = el?.querySelector<HTMLElement>(`[data-pagina="${n}"]`);
    if (el && pagina) el.scrollTo({ top: pagina.offsetTop - 16 });
  }, []);
  useEffect(() => registrarNavegar(navegar), [navegar, registrarNavegar]);

  function aoRolar() {
    const el = rolagem.current;
    if (!el) return;
    const limite = el.scrollTop + el.clientHeight * 0.4;
    let n = 1;
    for (const p of el.querySelectorAll<HTMLElement>('[data-pagina]')) {
      if (p.offsetTop <= limite) n = Number(p.dataset.pagina); else break;
    }
    if (n !== atual) aoMudarPagina(n);
  }

  if (carga.estado === 'grande' || carga.estado === 'erro') {
    return <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p role="status" className="max-w-sm text-base text-foreground">
        {carga.estado === 'grande' ? 'Arquivo grande demais para visualizar aqui — baixe para abrir.' : 'Não foi possível abrir este PDF aqui — baixe para ver.'}
      </p>
      <a href={urlMidia(d.id, true)} download className={buttonVariants({ variant: 'default' })}><Download className="size-4" aria-hidden="true" />Baixar</a>
    </div>;
  }

  const largura = Math.round(Math.min(LARGURA_MAXIMA, espaco) * (zoom / 100));
  return <div ref={rolagem} onScroll={aoRolar} tabIndex={0} aria-label="Páginas do documento" className="relative flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-20">
    {carga.estado === 'carregando'
      ? <><span role="status" className="sr-only">Carregando PDF…</span><Skeleton className="mx-auto h-[70dvh] w-full max-w-[880px]" /></>
      : <>
        {Array.from({ length: paginasExibidas(carga.pdf.numPages) }, (_, i) => <PaginaPdf key={i} pdf={carga.pdf} numero={i + 1} largura={largura} razao={razoes[i + 1] ?? RAZAO_PADRAO} raiz={rolagem} aoMedir={medir} />)}
        {avisoLimitePaginas(carga.pdf.numPages) && <p role="status" className="mx-auto py-2 text-center text-sm text-muted-foreground">{avisoLimitePaginas(carga.pdf.numPages)}</p>}
      </>}
  </div>;
}

/** Visualizador em tela cheia: páginas empilhadas, régua de páginas, zoom e teclado. Tudo renderizado no navegador. */
export function PdfVisualizador({ d, aberto, aoMudar }: { d: DadosVisualizador; aberto: boolean; aoMudar: (a: boolean) => void }) {
  const [atual, setAtual] = useState(1);
  const [zoom, setZoom] = useState<number>(100);
  const navegarRef = useRef<(n: number) => void>(() => {});
  const [lidas, setLidas] = useState(0);
  const totalReal = lidas || d.paginas || 0;
  const total = paginasExibidas(totalReal);
  const registrar = useCallback((fn: (n: number) => void) => { navegarRef.current = fn; }, []);
  const ir = useCallback((n: number) => {
    if (total < 1) return;
    const alvo = Math.min(total, Math.max(1, n));
    setAtual(alvo);
    navegarRef.current(alvo);
  }, [total]);

  useEffect(() => {
    if (!aberto) return;
    function tecla(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (['ArrowDown', 'ArrowRight', 'PageDown'].includes(e.key)) { e.preventDefault(); ir(atual + 1); }
      else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); ir(atual - 1); }
    }
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aberto, atual, ir]);

  const mudarZoom = (passo: 1 | -1) => setZoom(z => ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, ZOOMS.indexOf(z as (typeof ZOOMS)[number]) + passo))]);
  const quando = d.quando ? dataRelativa(d.quando) : d.hora;
  const resumo = [quando, totalReal ? `${totalReal} ${totalReal === 1 ? 'página' : 'páginas'}` : '', formatarTamanho(d.tamanho).replace(' kB', ' KB')].filter(Boolean).join(' · ');

  return <Dialog open={aberto} onOpenChange={aoMudar}>
    <DialogContent telaCheia aria-describedby={undefined} className="gap-0 bg-poco p-0">
      <header className="flex items-center gap-3 border-b border-divisoria bg-popover px-4 py-3">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-marca-tint text-sm font-semibold text-marca-tint-texto">{iniciais(d.remetente)}</span>
        <div className="min-w-0 flex-1">
          <DialogTitle className="truncate text-base font-semibold leading-tight tracking-normal">{d.remetente} · <span className="bloco-sensivel">{d.nome}</span></DialogTitle>
          <DialogDescription className="truncate text-sm">{resumo}</DialogDescription>
        </div>
        <a href={urlMidia(d.id, true)} download className={buttonVariants({ variant: 'outline', size: 'sm' })}><Download className="size-4" aria-hidden="true" />Baixar</a>
        <DialogClose asChild><Button type="button" variant="ghost" size="icon" aria-label="Fechar"><X className="size-4" aria-hidden="true" /></Button></DialogClose>
      </header>
      <div className="relative flex min-h-0 flex-1">
        <Corpo d={d} atual={atual} aoMudarPagina={setAtual} aoCarregar={setLidas} zoom={zoom} registrarNavegar={registrar} />
        {/* Régua: cartão flutuante por cima da área escura (não ocupa coluna); a página fica centralizada na largura toda. */}
        {total > 0 && <nav aria-label="Navegação do PDF" className="absolute right-5 top-1/2 flex w-14 -translate-y-1/2 flex-col items-center gap-1.5 rounded-2xl border border-divisoria bg-popover/90 px-1.5 py-2 backdrop-blur-sm">
          <div role="status" aria-live="polite" aria-label={`Página ${atual} de ${total}`} className="flex flex-col items-center gap-1.5">
            <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-lg border border-divisoria bg-controle text-sm font-semibold">{atual}</span>
            <span aria-hidden="true" className="flex h-7 items-center text-sm text-muted-foreground">{total}</span>
          </div>
          <div aria-hidden="true" className="my-0.5 h-px w-7 bg-divisoria" />
          <Button type="button" variant="ghost" size="icon" aria-label="Página anterior" disabled={atual <= 1} onClick={() => ir(atual - 1)}><ChevronUp className="size-5" aria-hidden="true" /></Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Próxima página" disabled={atual >= total} onClick={() => ir(atual + 1)}><ChevronDown className="size-5" aria-hidden="true" /></Button>
          <div aria-hidden="true" className="my-0.5 h-px w-7 bg-divisoria" />
          <Button type="button" variant="ghost" size="icon" aria-label={`Aumentar zoom (${zoom}%)`} disabled={zoom >= ZOOMS[ZOOMS.length - 1]} onClick={() => mudarZoom(1)}><ZoomIn className="size-5" aria-hidden="true" /></Button>
          <Button type="button" variant="ghost" size="icon" aria-label={`Diminuir zoom (${zoom}%)`} disabled={zoom <= ZOOMS[0]} onClick={() => mudarZoom(-1)}><ZoomOut className="size-5" aria-hidden="true" /></Button>
        </nav>}
      </div>
    </DialogContent>
  </Dialog>;
}

