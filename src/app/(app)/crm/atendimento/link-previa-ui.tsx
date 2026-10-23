'use client';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Globe, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { partirTexto, primeiraUrl } from '@/lib/linkificar';

/**
 * Links clicáveis e prévia (og-card) das mensagens do atendimento.
 *
 * - `TextoComLinks`: o texto com âncoras (só http/https validados; nova aba, sem Referer).
 * - `CorpoComLinks`: texto + prévia da PRIMEIRA URL, buscada sob demanda quando a bolha entra na tela.
 * - `PreviaComposer`: a mesma prévia, compacta, acima do campo de escrita (com "Enviar sem prévia").
 *
 * Tudo que vem da página alheia (título, descrição, site) é texto do React: nunca `innerHTML`.
 * A imagem vem do proxy assinado do servidor, nunca direto do site.
 */

export type Previa =
  | { semPrevia: true; dominio: string; seguro: boolean }
  | { semPrevia?: false; titulo: string; descricao: string; site: string; dominio: string; seguro: boolean; imagem: string | null; larga: boolean };

const REL = 'noopener noreferrer nofollow';

// --- busca: fila de uma por vez (o servidor aceita 1 em voo por usuário) + memória da sessão ---
const memo = new Map<string, Promise<Previa | null>>();
let fila: Promise<unknown> = Promise.resolve();

async function carregar(url: string, tentativa = 0): Promise<Previa | null> {
  try {
    const r = await fetch(`/api/whatsapp/link-previa?url=${encodeURIComponent(url)}`, { credentials: 'same-origin' });
    if (r.status === 429 && tentativa < 2) {
      await new Promise((ok) => setTimeout(ok, 1500));
      return carregar(url, tentativa + 1);
    }
    return r.ok ? ((await r.json()) as Previa) : null;
  } catch {
    return null;
  }
}

export function buscarPrevia(url: string): Promise<Previa | null> {
  let p = memo.get(url);
  if (!p) {
    p = fila.then(() => carregar(url));
    fila = p;
    memo.set(url, p);
    void p.then((r) => { if (!r) memo.delete(url); });
  }
  return p;
}

function dominioDe(url: string): { dominio: string; seguro: boolean } {
  try {
    const u = new URL(url);
    return { dominio: u.hostname.replace(/^www\./i, ''), seguro: u.protocol === 'https:' };
  } catch {
    return { dominio: url, seguro: false };
  }
}

/** `undefined` = ainda carregando; `null`-like não existe: falha vira `semPrevia` com o domínio da URL. */
function usePrevia(url: string | null, ativo: boolean): Previa | undefined {
  const [previa, setPrevia] = useState<{ url: string; p: Previa } | undefined>();
  useEffect(() => {
    if (!url || !ativo) return;
    let vivo = true;
    void buscarPrevia(url).then((p) => {
      if (vivo) setPrevia({ url, p: p ?? { semPrevia: true, ...dominioDe(url) } });
    });
    return () => { vivo = false; };
  }, [url, ativo]);
  return previa && previa.url === url ? previa.p : undefined;
}

function useVisivel(ref: React.RefObject<Element | null>, ligado: boolean): boolean {
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    if (!ligado || visivel) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setVisivel(true); return; }
    const o = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setVisivel(true); o.disconnect(); } }, { rootMargin: '160px' });
    o.observe(el);
    return () => o.disconnect();
  }, [ligado, visivel, ref]);
  return visivel;
}

/** Âncora validada: só chega aqui URL que passou por `urlSegura`. */
function Ancora({ href, className, children, ...resto }: { href: string; className?: string; children: ReactNode } & React.AriaAttributes) {
  return <a href={href} target="_blank" rel={REL} referrerPolicy="no-referrer" className={className} {...resto}>{children}</a>;
}

export function TextoComLinks({ texto }: { texto: string }) {
  const partes = useMemo(() => partirTexto(texto), [texto]);
  return <>{partes.map((p, i) => p.tipo === 'link'
    ? <Ancora key={i} href={p.url} className="break-all text-marca-tint-texto underline underline-offset-4 hover:brightness-110 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{p.texto}</Ancora>
    : <span key={i}>{p.texto}</span>)}</>;
}

const PREFIXO_IMAGEM = '/api/whatsapp/link-previa/imagem?';
/** O navegador só pede a imagem ao nosso proxy assinado; qualquer outra URL é ignorada. */
function imagemDoProxy(src: string | null | undefined): string | null {
  return typeof src === 'string' && src.startsWith(PREFIXO_IMAGEM) && src.length > PREFIXO_IMAGEM.length ? src : null;
}

function Imagem({ src, className, onErro }: { src: string; className: string; onErro: () => void }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={onErro} onLoad={e => { if (e.currentTarget.naturalWidth === 0) onErro(); }} className={className} />;
}

function Dominio({ dominio, seguro }: { dominio: string; seguro: boolean }) {
  return <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"><Globe className="size-3 shrink-0" aria-hidden="true" /><span className="truncate">{dominio}</span></span>;
}

const CARTAO = 'block overflow-hidden rounded-xl bg-card-elevated text-foreground no-underline transition-colors duration-150 hover:bg-controle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none';

/** Cartão da prévia. Grande quando a página informa imagem larga; compacto com miniatura; só texto sem imagem. */
export function CartaoPrevia({ url, p, className = '' }: { url: string; p: Extract<Previa, { semPrevia?: false }>; className?: string }) {
  const [imgOk, setImgOk] = useState(true);
  const imagem = imgOk ? imagemDoProxy(p.imagem) : null;
  const titulo = p.titulo || p.site || p.dominio;
  const rotulo = `Prévia do link: ${titulo} — ${p.dominio} (abre em nova aba)`;
  if (imagem && p.larga) {
    return <Ancora href={url} aria-label={rotulo} className={`${CARTAO} ${className}`}>
      <Imagem src={imagem} onErro={() => setImgOk(false)} className="h-44 w-full bg-controle object-cover" />
      <span className="flex flex-col gap-0.5 px-3 py-2.5">
        <span className="line-clamp-2 text-sm font-semibold leading-snug">{titulo}</span>
        {p.descricao && <span className="line-clamp-2 text-sm leading-snug text-texto-secundario">{p.descricao}</span>}
        <Dominio dominio={p.dominio} seguro={p.seguro} />
      </span>
    </Ancora>;
  }
  return <Ancora href={url} aria-label={rotulo} className={`${CARTAO} flex items-stretch ${className}`}>
    {imagem && <Imagem src={imagem} onErro={() => setImgOk(false)} className="w-21 shrink-0 self-stretch bg-controle object-cover" />}
    <span className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-2.5">
      <span className="line-clamp-2 text-sm font-semibold leading-snug">{titulo}</span>
      {p.descricao && <span className="truncate text-sm text-texto-secundario">{p.descricao}</span>}
      <Dominio dominio={p.dominio} seguro={p.seguro} />
    </span>
  </Ancora>;
}

const estaNoFim = (el: HTMLElement) => el.scrollHeight - el.scrollTop - el.clientHeight < 80;

/**
 * Corpo de texto da bolha: cartão da primeira URL (acima), o texto com âncoras e, se a prévia
 * falhar ou não houver, só o texto com o link. `reserva` é o espaçador invisível do canto da hora.
 */
export function CorpoComLinks({ corpo, reserva, aoTopo = true }: { corpo: string; reserva: string; aoTopo?: boolean }) {
  const url = useMemo(() => primeiraUrl(corpo), [corpo]);
  const raiz = useRef<HTMLDivElement>(null);
  const visivel = useVisivel(raiz, url !== null);
  const previa = usePrevia(url, visivel);
  // Se o registro estava colado no fim, o cartão que chega não pode empurrar a conversa para cima.
  const colava = useRef(false);
  useEffect(() => {
    const log = raiz.current?.closest<HTMLElement>('[role="log"]');
    if (log && !previa) colava.current = estaNoFim(log);
  });
  useLayoutEffect(() => {
    if (!previa) return;
    const log = raiz.current?.closest<HTMLElement>('[role="log"]');
    if (log && colava.current) log.scrollTop = log.scrollHeight;
  }, [previa]);
  const cartao = previa && !previa.semPrevia ? previa : null;
  return <div ref={raiz} className={cartao ? 'w-72 max-w-full sm:w-84' : undefined}>
    {cartao && url && <CartaoPrevia url={url} p={cartao} className={`-mx-2 mb-1.5 ${aoTopo ? '-mt-1' : ''}`} />}
    <p className="whitespace-pre-wrap break-words text-sm leading-snug">
      <TextoComLinks texto={corpo} />
      <span aria-hidden="true" className={`inline-block h-3 align-bottom ${reserva}`} />
    </p>
  </div>;
}

/** Atraso do composer entre parar de digitar e buscar a prévia. */
export const ATRASO_PREVIA_MS = 700;

export function useUrlComAtraso(texto: string, ms = ATRASO_PREVIA_MS): string | null {
  const atual = useMemo(() => primeiraUrl(texto), [texto]);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (atual === null) { setUrl(null); return; }
    const t = setTimeout(() => setUrl(atual), ms);
    return () => clearTimeout(t);
  }, [atual, ms]);
  return url;
}

/** Prévia compacta acima do campo; o X é "Enviar sem prévia" (a mensagem sai com preview_url:false). */
export function PreviaComposer({ url, onRemover }: { url: string; onRemover: () => void }) {
  const previa = usePrevia(url, true);
  if (!previa || previa.semPrevia) return null;
  const titulo = previa.titulo || previa.site || previa.dominio;
  return <div role="group" aria-label="Prévia do link que será enviado" className="mx-3 mt-2 flex items-center gap-2.5 rounded-xl bg-card-elevated p-2">
    {imagemDoProxy(previa.imagem) && <ImagemComposer src={imagemDoProxy(previa.imagem)!} />}
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="truncate text-sm font-semibold">{titulo}</span>
      <span className="truncate text-xs text-texto-secundario">{previa.descricao ? `${previa.descricao} · ` : ''}{previa.dominio}</span>
    </div>
    <Button type="button" variant="ghost" size="icon" aria-label="Enviar sem prévia" title="Enviar sem prévia" onClick={onRemover}><X className="size-4.5" aria-hidden="true" /></Button>
  </div>;
}

function ImagemComposer({ src }: { src: string }) {
  const [ok, setOk] = useState(true);
  return ok ? <Imagem src={src} onErro={() => setOk(false)} className="size-14 shrink-0 rounded-lg bg-controle object-cover" /> : null;
}
