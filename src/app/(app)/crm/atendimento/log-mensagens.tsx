'use client';
import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Registro de mensagens (role="log"). Mantém a rolagem no fim — a mensagem mais recente
 * fica à vista ao abrir e a cada atualização de 30s —, a menos que a pessoa tenha subido
 * para ler o histórico. Só rolagem: nada aqui lê nem envia dados.
 */
export function LogMensagens({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const colado = useRef(true);
  useEffect(() => {
    const el = ref.current;
    if (el && colado.current) el.scrollTop = el.scrollHeight;
  });
  return <div ref={ref} role="log" aria-label="Mensagens" tabIndex={0} className={className}
    onScroll={e => { const el = e.currentTarget; colado.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>{children}</div>;
}
