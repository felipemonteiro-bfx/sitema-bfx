'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { ChevronDown, Copy, Download, Reply } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { urlMidia } from './status-mensagem';

export type ItemMenu = { chave: 'responder' } | { chave: 'copiar'; texto: string } | { chave: 'baixar'; href: string };

/**
 * O que o menu da mensagem oferece: Responder (precisa de waMessageId), Copiar (precisa de texto ou legenda)
 * e Baixar (precisa de mídia salva). No celular o texto da bolha não é selecionável, então Copiar é o único caminho.
 */
export function itensMenu({ podeResponder, midiaId, texto }: { podeResponder: boolean; midiaId: string | null; texto?: string | null }): ItemMenu[] {
  const itens: ItemMenu[] = [];
  if (podeResponder) itens.push({ chave: 'responder' });
  if (texto && texto.trim()) itens.push({ chave: 'copiar', texto });
  if (midiaId) itens.push({ chave: 'baixar', href: urlMidia(midiaId, true) });
  return itens;
}

/** Copia o texto da mensagem e avisa; falha da área de transferência (permissão negada) não passa em silêncio. */
export async function copiarTexto(texto: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(texto);
    toast('Copiado');
  } catch {
    toast('Não foi possível copiar');
  }
}

type AcoesCtx = { marcarGesto: (v: boolean) => void };
const Ctx = createContext<AcoesCtx | null>(null);

/**
 * Um único menu por bolha: aberto pela setinha (hover/foco), por segurar o dedo ou pelo botão direito.
 * Os gatilhos (`SetaMenuMensagem`) ficam dentro dele; a abertura por gesto usa o estado controlado.
 */
export function MenuMensagem({ aberto, aoMudar, itens, aoResponder, consumirGesto, marcarGesto, children }: {
  aberto: boolean; aoMudar: (a: boolean) => void; itens: ItemMenu[]; aoResponder: () => void; consumirGesto: () => boolean; marcarGesto: (v: boolean) => void; children: ReactNode;
}) {
  return <Ctx.Provider value={{ marcarGesto }}>
    <DropdownMenu open={aberto} onOpenChange={aoMudar}>
      {children}
      <DropdownMenuContent align="end" onCloseAutoFocus={e => { if (consumirGesto()) e.preventDefault(); }}>
        {itens.map(i => i.chave === 'responder'
          ? <DropdownMenuItem key="responder" onSelect={() => { marcarGesto(true); aoResponder(); }}><Reply className="size-4" aria-hidden="true" />Responder</DropdownMenuItem>
          : i.chave === 'copiar'
            ? <DropdownMenuItem key="copiar" onSelect={() => { void copiarTexto(i.texto); }}><Copy className="size-4" aria-hidden="true" />Copiar</DropdownMenuItem>
            : <DropdownMenuItem key="baixar" asChild><a href={i.href} download><Download className="size-4" aria-hidden="true" />Baixar</a></DropdownMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu>
  </Ctx.Provider>;
}

/** Itens do menu da bolha atual (o PDF decide se mostra a própria setinha). */
export const useAcoesMensagem = () => useContext(Ctx);

/** Setinha ⌄ no canto: aparece no hover/foco da bolha (grupo `msg`) e some no toque, onde vale segurar o dedo. */
export function SetaMenuMensagem({ rotulo = 'Mais opções da mensagem', className = '' }: { rotulo?: string; className?: string }) {
  const ctx = useContext(Ctx);
  return <DropdownMenuTrigger asChild>
    <Button variant="revelar" size="iconXs" aria-label={rotulo} onPointerDown={() => { ctx?.marcarGesto(false); }} className={className}>
      <ChevronDown className="size-4" aria-hidden="true" />
    </Button>
  </DropdownMenuTrigger>;
}
