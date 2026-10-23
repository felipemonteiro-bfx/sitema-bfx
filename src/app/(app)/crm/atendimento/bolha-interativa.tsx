'use client';
import { useRef, useState, type ReactNode } from 'react';
import { Reply } from 'lucide-react';
import type { ResumoCitado } from '@/lib/whatsapp-citacao-resumo';
import { useResposta } from './citacao-ui';
import { useGestoResponder } from './gesto-responder';
import { itensMenu, MenuMensagem, SetaMenuMensagem } from './menu-mensagem';

/**
 * O <article> da bolha com o que é de toque/menu: deslizar para a direita responde, segurar o dedo ou o botão
 * direito abrem o menu, e a setinha ⌄ aparece no hover. Sem `resumo` (mensagem sem waMessageId) não há Responder.
 */
export function BolhaInterativa({ id, className, semBolha, resumo, autor, midiaId, texto, semSeta, children }: {
  id: string; className: string; semBolha?: boolean; resumo: ResumoCitado | null; autor: string; midiaId: string | null; texto?: string | null; semSeta?: boolean; children: ReactNode;
}) {
  const { responder } = useResposta();
  const [aberto, setAberto] = useState(false);
  const viaGesto = useRef(false);
  const marcarGesto = (v: boolean) => { viaGesto.current = v; };
  const consumirGesto = () => { const v = viaGesto.current; viaGesto.current = false; return v; };
  const itens = itensMenu({ podeResponder: !!resumo, midiaId, texto });
  const aoResponder = () => { if (resumo) responder({ resumo, autor }); };
  const refBolha = useRef<HTMLElement | null>(null);
  const refIcone = useRef<HTMLElement | null>(null);
  useGestoResponder(refBolha, refIcone, { ativo: !!resumo, aoResponder, aoSegurar: () => { marcarGesto(true); setAberto(true); } });
  const comMenu = itens.length > 0;
  return <MenuMensagem aberto={aberto} aoMudar={setAberto} itens={itens} aoResponder={aoResponder} consumirGesto={consumirGesto} marcarGesto={marcarGesto}>
    <article id={id} ref={refBolha} {...(semBolha ? { 'data-sem-bolha': '' } : {})} {...(resumo ? { 'data-gesto-responder': '' } : {})}
      className={`${className} ${resumo ? 'touch-pan-y pointer-coarse:select-none pointer-coarse:[-webkit-touch-callout:none] pointer-coarse:[&_a]:[-webkit-touch-callout:default] pointer-coarse:[&_a_*]:[-webkit-touch-callout:default]' : ''}`}
      onContextMenu={comMenu ? e => {
        if ((e.target as HTMLElement).closest('a[href]')) return; // links mantêm o menu nativo (copiar endereço)
        if (window.getSelection()?.toString().trim()) return; // texto selecionado: o menu nativo copia a seleção
        e.preventDefault(); marcarGesto(true); setAberto(true);
      } : undefined}>
      {resumo && <span ref={refIcone} aria-hidden="true" data-icone-gesto style={{ opacity: 0, transform: 'translateY(-50%) scale(0.6)' }}
        className="pointer-events-none absolute right-full top-1/2 mr-2 flex size-8 items-center justify-center rounded-full bg-controle text-texto-secundario">
        <Reply className="size-4.5" />
      </span>}
      {children}
      {comMenu && !semSeta && <SetaMenuMensagem className="absolute right-1 top-1 z-10" />}
    </article>
  </MenuMensagem>;
}
