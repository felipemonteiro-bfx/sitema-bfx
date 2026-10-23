'use client';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { FileText, Image as IconeFoto, Mic, Reply, Sticker, Video } from 'lucide-react';
import { formatarTempo, urlMidia } from './status-mensagem';
import { useDuracao } from './duracao-audio';
import type { ResumoCitado } from '@/lib/whatsapp-citacao-resumo';

/** Mensagem escolhida para responder + o nome de quem a escreveu ("Você" ou o contato). */
export type Citando = { resumo: ResumoCitado; autor: string };

type RespostaCtx = { citando: Citando | null; responder: (c: Citando) => void; cancelarResposta: () => void };
const SEM_RESPOSTA: RespostaCtx = { citando: null, responder: () => undefined, cancelarResposta: () => undefined };
const Ctx = createContext<RespostaCtx>(SEM_RESPOSTA);

/** Liga a bolha (botão Responder) ao composer (faixa "Respondendo a"). Um por conversa. */
export function RespostaProvider({ children }: { children: ReactNode }) {
  const [citando, setCitando] = useState<Citando | null>(null);
  const responder = useCallback((c: Citando) => setCitando(c), []);
  const cancelarResposta = useCallback(() => setCitando(null), []);
  const valor = useMemo(() => ({ citando, responder, cancelarResposta }), [citando, responder, cancelarResposta]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
export const useResposta = (): RespostaCtx => useContext(Ctx);

const ICONES = { audio: Mic, imagem: IconeFoto, video: Video, figurinha: Sticker, documento: FileText } as const;

/** Linha de resumo: ícone do tipo + rótulo (+ duração da voz) (+ legenda). Texto: uma linha truncada. */
export function LinhaResumo({ r }: { r: ResumoCitado }) {
  const duracao = useDuracao(r.tipo === 'audio' ? r.midiaId : undefined);
  const Icone = ICONES[r.tipo as keyof typeof ICONES];
  const rotulo = duracao ? `${r.corpoResumo} · ${formatarTempo(duracao)}` : r.corpoResumo;
  return <span className="flex min-w-0 items-center gap-1.5 text-sm text-texto-secundario">
    {Icone && <Icone aria-hidden="true" className="size-3.5 shrink-0" />}
    <span className="truncate">{rotulo}{r.legenda ? ` · ${r.legenda}` : ''}</span>
  </span>;
}

export const corAutor = (direcao: string) => direcao === 'out'
  ? { barra: 'bg-primary', nome: 'text-marca-tint-texto' }
  : { barra: 'bg-warning', nome: 'text-warning-text' };

function Miniatura({ r }: { r: ResumoCitado }) {
  if (!r.miniaturaId) return null;
  const alvo = urlMidia(r.miniaturaId);
  return <span aria-hidden="true" className="relative block w-14 shrink-0 self-stretch bg-poco">
    {r.tipo === 'video'
      ? <video src={`${alvo}#t=0.1`} preload="metadata" muted playsInline tabIndex={-1} className="bloco-sensivel absolute inset-0 size-full object-cover" />
      // eslint-disable-next-line @next/next/no-img-element
      : <img src={alvo} alt="" loading="lazy" decoding="async" className="bloco-sensivel absolute inset-0 size-full object-cover" />}
  </span>;
}

/** Rola até a mensagem citada e a destaca por 1,2s. Se ela não está carregada, não faz nada. */
export function irParaMensagem(id: number): void {
  const alvo = document.getElementById(`msg-${id}`);
  if (!alvo) return;
  const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  alvo.scrollIntoView({ block: 'center', behavior: reduzido ? 'auto' : 'smooth' });
  alvo.classList.remove('bolha-destaque');
  void alvo.offsetWidth; // reinicia a animação se o clique se repetir
  alvo.classList.add('bolha-destaque');
  window.setTimeout(() => alvo.classList.remove('bolha-destaque'), 1300);
}

/** Bloco da citação no topo da bolha. É um botão: clicar leva à mensagem citada. */
export function BlocoCitacao({ r, autor, className = '' }: { r: ResumoCitado; autor: string; className?: string }) {
  const cor = corAutor(r.direcao);
  const nome = r.indisponivel ? null : (r.direcao === 'out' ? 'Você' : autor);
  const rotuloAcessivel = r.indisponivel ? 'Mensagem citada indisponível' : `Ir para a mensagem citada: ${nome}, ${r.corpoResumo}`;
  // O <button> não estica sozinho: a <div> leva as margens da variante e o botão ocupa a largura toda.
  return <div className={className}><button type="button" data-citacao disabled={!!r.indisponivel} aria-label={rotuloAcessivel} onClick={() => irParaMensagem(r.id)}
    className="flex w-full min-w-0 overflow-hidden rounded-lg bg-poco/60 text-left enabled:cursor-pointer enabled:hover:bg-poco/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <span aria-hidden="true" className={`w-1 shrink-0 ${r.indisponivel ? 'bg-muted-foreground' : cor.barra}`} />
    <span className="flex min-w-0 flex-1 flex-col gap-0.5 py-2 pl-2.5 pr-2.5">
      {nome && <span className={`truncate text-sm font-semibold ${cor.nome}`}>{nome}</span>}
      {r.indisponivel
        ? <span className="text-sm italic text-texto-secundario">{r.corpoResumo}</span>
        : <LinhaResumo r={r} />}
    </span>
    <Miniatura r={r} />
  </button></div>;
}

/** Botão redondo ao lado da bolha (aparece no hover e no foco). Só "Responder": reagir fica fora do escopo. */
export function BotaoResponder({ resumo, autor, saida }: { resumo: ResumoCitado; autor: string; saida: boolean }) {
  const { responder } = useResposta();
  return <span className={`absolute top-1/2 hidden -translate-y-1/2 items-center opacity-0 transition-opacity duration-150 group-hover/msg:opacity-100 group-focus-within/msg:opacity-100 motion-reduce:transition-none sm:flex ${saida ? 'right-full pr-2' : 'left-full pl-2'}`}>
    <button type="button" aria-label="Responder" title="Responder" onClick={() => responder({ resumo, autor })}
      className="flex size-8 items-center justify-center rounded-full bg-controle text-texto-secundario hover:bg-controle-ativo hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Reply aria-hidden="true" className="size-4.5" />
    </button>
  </span>;
}
