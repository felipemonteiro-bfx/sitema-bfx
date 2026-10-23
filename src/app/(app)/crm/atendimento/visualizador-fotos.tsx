'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Play, Reply, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatarTelefoneBr } from '@/lib/whatsapp-kanban';
import { useResposta } from './citacao-ui';
import { proximoIndice, rotuloDataVisualizador, rotuloPosicao, type ItemFoto } from './fotos-regras';
import { formatarTempo, iniciais, urlMidia } from './status-mensagem';

const LIMIAR_SWIPE = 48;

/** Miniatura da faixa: foto, ou o primeiro quadro do vídeo com ícone e duração (lida dos metadados). */
function Miniatura({ item, n, total, atual, aoEscolher }: { item: ItemFoto; n: number; total: number; atual: boolean; aoEscolher: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [duracao, setDuracao] = useState<number | null>(item.duracao ?? null);
  useEffect(() => {
    if (!atual) return;
    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    ref.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduzido ? 'auto' : 'smooth' });
  }, [atual]);
  const rotulo = item.tipo === 'video' ? `Vídeo${duracao ? ` de ${formatarTempo(duracao)}` : ''}, ${rotuloPosicao(n, total)}` : `Foto ${rotuloPosicao(n, total)}`;
  return <button ref={ref} type="button" aria-label={rotulo} aria-current={atual ? 'true' : undefined} onClick={aoEscolher}
    className={cn('relative size-16 shrink-0 overflow-hidden rounded-lg bg-poco transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none sm:size-20',
      atual ? 'opacity-100 outline-2 outline-offset-2 outline-primary' : 'opacity-70 hover:opacity-100')}>
    {item.tipo === 'video'
      ? <video src={`${urlMidia(item.midiaId)}#t=0.1`} preload="metadata" muted playsInline tabIndex={-1} onLoadedMetadata={e => setDuracao(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : null)} className="bloco-sensivel absolute inset-0 size-full object-cover" />
      // eslint-disable-next-line @next/next/no-img-element
      : <img src={urlMidia(item.midiaId)} alt="" loading="lazy" decoding="async" className="bloco-sensivel absolute inset-0 size-full object-cover" />}
    {item.tipo === 'video' && <span className="absolute bottom-1 left-1.5 flex items-center gap-1 font-mono text-xs leading-none text-white drop-shadow"><Play className="size-3 fill-current" aria-hidden="true" />{duracao ? formatarTempo(duracao) : ''}</span>}
  </button>;
}

/**
 * Tela cheia no estilo WhatsApp: remetente e data no topo com Responder/Baixar/Fechar, a mídia no maior tamanho que
 * couber, setas e teclado (← →, Esc) e swipe no toque, e a faixa de miniaturas de todas as fotos e vídeos da conversa.
 * Controlado: `indice` nulo = fechado.
 */
export function VisualizadorFotos({ itens, indice, contato, aoMudar, aoFechar, agora }: {
  itens: ItemFoto[]; indice: number | null; contato: { nome: string; telefone: string }; aoMudar: (i: number) => void; aoFechar: () => void; agora?: Date;
}) {
  const { responder } = useResposta();
  const aberto = indice !== null && itens.length > 0;
  const atual = aberto ? Math.min(indice, itens.length - 1) : 0;
  const total = itens.length;
  const item = aberto ? itens[atual] : null;
  const toque = useRef<{ x: number; y: number } | null>(null);
  // Responder fecha a tela cheia e o foco já foi para o campo de resposta: não devolve o foco à miniatura/bolha.
  const fechouPorResponder = useRef(false);
  const ir = (delta: number) => aoMudar(proximoIndice(atual, total, delta));

  useEffect(() => {
    if (!aberto) return;
    function tecla(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if ((e.target as HTMLElement | null)?.closest('video')) return; // ← → dentro do player de vídeo avançam o vídeo
      if (e.key === 'ArrowLeft') { e.preventDefault(); aoMudar(proximoIndice(atual, total, -1)); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); aoMudar(proximoIndice(atual, total, 1)); }
    }
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aberto, atual, total, aoMudar]);

  // Pré-carrega a anterior e a próxima (só imagem; vídeo carrega ao abrir).
  useEffect(() => {
    if (!aberto) return;
    for (const v of [itens[atual - 1], itens[atual + 1]]) {
      if (v && v.tipo === 'imagem') { const img = new Image(); img.decoding = 'async'; img.src = urlMidia(v.midiaId); }
    }
  }, [aberto, atual, itens]);

  if (!aberto || !item) return null;
  // Contato sem cadastro chega com o próprio telefone como nome: aparece formatado (+55 92 99999-0001).
  const remetente = item.saida ? 'Você' : (contato.nome.replace(/\D/g, '') === contato.telefone ? formatarTelefoneBr(contato.telefone) : contato.nome);
  const data = rotuloDataVisualizador(item.criadoEm, agora);
  const posicao = rotuloPosicao(atual, total);
  const aoResponder = () => { if (item.resumo) { fechouPorResponder.current = true; responder({ resumo: item.resumo, autor: remetente }); aoFechar(); } };

  return <Dialog open onOpenChange={o => { if (!o) aoFechar(); }}>
    <DialogContent telaCheia aria-describedby={undefined} className="gap-0 bg-shell p-0" onCloseAutoFocus={e => { if (fechouPorResponder.current) { fechouPorResponder.current = false; e.preventDefault(); } }}>
      <header className="flex shrink-0 items-center gap-3 px-3 py-3 sm:px-5">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-marca-tint font-display text-sm font-semibold text-marca-tint-texto">{iniciais(remetente)}</span>
        <div className="min-w-0 flex-1">
          <DialogTitle className="truncate text-base font-semibold leading-tight tracking-normal">{remetente}</DialogTitle>
          <DialogDescription className="text-sm">{data} · {posicao}</DialogDescription>
        </div>
        {item.resumo && <Button type="button" variant="ghost" size="icon" aria-label="Responder" title="Responder" onClick={aoResponder}><Reply className="size-5" aria-hidden="true" /></Button>}
        <a href={urlMidia(item.midiaId, true)} download aria-label="Baixar" title="Baixar" className={buttonVariants({ variant: 'ghost', size: 'icon' })}><Download className="size-5" aria-hidden="true" /></a>
        <span aria-hidden="true" className="mx-1 h-6 w-px bg-divisoria" />
        <DialogClose asChild><Button type="button" variant="ghost" size="icon" aria-label="Fechar"><X className="size-5" aria-hidden="true" /></Button></DialogClose>
      </header>
      <div className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-2 py-2 sm:px-24"
        onPointerDown={e => { if (e.pointerType === 'touch') toque.current = { x: e.clientX, y: e.clientY }; }}
        onPointerUp={e => {
          const ini = toque.current; toque.current = null;
          if (!ini || e.pointerType !== 'touch') return;
          const dx = e.clientX - ini.x, dy = e.clientY - ini.y;
          if (Math.abs(dx) > LIMIAR_SWIPE && Math.abs(dx) > Math.abs(dy) * 1.5) ir(dx < 0 ? 1 : -1);
        }}
        onPointerCancel={() => { toque.current = null; }}>
        {item.tipo === 'video'
          ? <video key={item.msgId} src={urlMidia(item.midiaId)} controls preload="metadata" playsInline aria-label={`Vídeo ${posicao}`} className="bloco-sensivel max-h-full max-w-full rounded-sm bg-poco object-contain" />
          // eslint-disable-next-line @next/next/no-img-element
          : <img key={item.msgId} src={urlMidia(item.midiaId)} alt={`Foto ${posicao}`} draggable={false} className="bloco-sensivel max-h-full max-w-full select-none rounded-sm object-contain motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150" />}
        {atual > 0 && <button type="button" aria-label="Foto anterior" onClick={() => ir(-1)} className="absolute left-3 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-popover/80 text-foreground backdrop-blur-sm hover:bg-controle-ativo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:hidden"><ChevronLeft className="size-5" aria-hidden="true" /></button>}
        {atual < total - 1 && <button type="button" aria-label="Próxima foto" onClick={() => ir(1)} className="absolute right-3 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-popover/80 text-foreground backdrop-blur-sm hover:bg-controle-ativo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:hidden"><ChevronRight className="size-5" aria-hidden="true" /></button>}
      </div>
      <nav aria-label="Mídias da conversa" className="flex shrink-0 items-center gap-2 overflow-x-auto border-t border-divisoria px-4 py-3 [scrollbar-width:none] sm:justify-center">
        <div className="mx-auto flex gap-2 sm:mx-0">
          {itens.map((v, i) => <Miniatura key={v.msgId} item={v} n={i} total={total} atual={i === atual} aoEscolher={() => aoMudar(i)} />)}
        </div>
      </nav>
    </DialogContent>
  </Dialog>;
}
