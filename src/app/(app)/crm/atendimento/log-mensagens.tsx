'use client';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { estaNoFim } from './layout-regras';

/**
 * Registro de mensagens (role="log"). Abre rolado para o fim e volta ao fim a cada atualização
 * de 30s — a menos que a pessoa tenha subido para ler o histórico; aí aparece o botão
 * "ir para o fim". Só rolagem: nada aqui lê nem envia dados.
 */
export function LogMensagens({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const colado = useRef(true);
  const [noFim, setNoFim] = useState(true);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && colado.current) el.scrollTop = el.scrollHeight;
  });
  function irParaOFim() {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  return <div className="relative flex min-h-0 flex-1 flex-col">
    <div ref={ref} role="log" aria-label="Mensagens" tabIndex={0} className={className}
      onScroll={e => { const el = e.currentTarget; const fim = estaNoFim(el.scrollHeight, el.scrollTop, el.clientHeight); colado.current = fim; setNoFim(fim); }}>{children}</div>
    {!noFim && <Button type="button" variant="outline" size="sm" onClick={irParaOFim} className="absolute bottom-3 right-4 rounded-full bg-card shadow-[var(--shadow-md)]"><ArrowDown className="size-4" aria-hidden="true" />Ir para o fim</Button>}
  </div>;
}
