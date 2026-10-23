'use client';
import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PanelRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { painelAberto, proximoPainel } from './layout-regras';

/** Largura da ÁREA DA TELA (não da viewport): a sidebar come espaço no sistema e não existe na janela própria. */
const LARGURA_PAINEL_INLINE = 1280;
const RAIZ = '[data-atendimento-raiz]';

function useAreaLarga(): boolean {
  const assinar = useCallback((cb: () => void) => {
    const el = document.querySelector(RAIZ);
    if (!el || typeof ResizeObserver === 'undefined') { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb); }
    const ro = new ResizeObserver(cb);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const foto = () => (document.querySelector(RAIZ)?.clientWidth ?? window.innerWidth) >= LARGURA_PAINEL_INLINE;
  // No servidor assume área larga: o CSS (`hidden @7xl:flex`) esconde o painel nas áreas estreitas até hidratar.
  return useSyncExternalStore(assinar, foto, () => true);
}

/** Troca só o ?painel= da URL atual, mantendo telefone, busca e etapa. */
function useMudarPainel() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (valor: '0' | '1') => {
    const qs = new URLSearchParams(sp?.toString() ?? '');
    qs.set('painel', valor);
    router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
  };
}

/**
 * Botão que abre/fecha o painel de dados do contato (cabeçalho do chat). Sem `children` é o ícone;
 * com `children` envolve avatar e nome, como o cabeçalho do WhatsApp Web.
 */
export function BotaoPainel({ children, className, nome }: { children?: ReactNode; className?: string; nome?: string }) {
  const sp = useSearchParams();
  const mudar = useMudarPainel();
  const param = sp?.get('painel');
  const aberto = painelAberto(param);
  const acao = aberto ? 'Ocultar' : 'Mostrar';
  const clique = () => mudar(proximoPainel(param));
  if (children) {
    return <button type="button" onClick={clique} aria-expanded={aberto} aria-controls="painel-contato" aria-label={`${acao} dados do contato${nome ? ` de ${nome}` : ''}`}
      className={className}>{children}</button>;
  }
  return <Button type="button" variant="ghost" size="icon" onClick={clique} aria-expanded={aberto} aria-label={`${acao} dados do contato`} title={`${acao} dados do contato`}>
    <PanelRight className="size-5 text-muted-foreground" aria-hidden="true" /></Button>;
}

/**
 * Painel de dados do contato (como "Dados do contato" do WhatsApp Web). Fechado por padrão em qualquer
 * largura; abre só com ?painel=1 (clique no nome/avatar do chat): coluna que estreita o chat em área >= 1280px,
 * Sheet pela direita abaixo disso. Esc e o X fecham.
 * O conteúdo (server component) é montado uma vez só: em coluna ou dentro do Sheet.
 */
export function PainelContato({ painel, children }: { painel?: string; children: ReactNode }) {
  const largo = useAreaLarga();
  const mudar = useMudarPainel();
  // Esc fecha o painel em coluna (no Sheet, quem fecha é o próprio Radix).
  useEffect(() => {
    if (painel !== '1' || !largo) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') mudar('0'); };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  });
  if (painel !== '1') return null;
  if (!largo) {
    return <Sheet open onOpenChange={o => { if (!o) mudar('0'); }}>
      <SheetContent side="right" className="w-[min(22rem,100vw)] overflow-y-auto p-0 sm:max-w-none">
        <SheetTitle className="flex h-14 items-center border-b border-divisoria px-4 text-base">Dados do contato</SheetTitle>
        <SheetDescription className="sr-only">Cadastro, atendimento, fidelidade e últimas vendas do contato.</SheetDescription>
        <div id="painel-contato" aria-label="Dados do contato" className="flex flex-col">{children}</div>
      </SheetContent>
    </Sheet>;
  }
  return <aside id="painel-contato" aria-label="Dados do contato" className="hidden min-h-0 w-80 shrink-0 flex-col overflow-hidden rounded-painel border border-painel-borda bg-card @7xl:flex dark:border-transparent">
    <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-divisoria pl-4 pr-2">
      <h2 className="text-base font-semibold">Dados do contato</h2>
      <Button type="button" variant="ghost" size="icon" aria-label="Fechar dados do contato" onClick={() => mudar('0')}><X className="size-5 text-muted-foreground" aria-hidden="true" /></Button>
    </div>
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
  </aside>;
}
