'use client';
import { useLayoutEffect, useRef, type ReactNode } from 'react';

/** Ajusta a conversa ao espaço real do shell, inclusive quando o cabeçalho quebra linhas. */
export function AreaVisivel({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const area = ref.current;
    if (!area) return;
    let frame = 0;
    const medir = () => {
      const main = area.closest('main');
      if (!main) return;
      const estilo = getComputedStyle(main);
      const moldura = main.parentElement ? getComputedStyle(main.parentElement) : null;
      const rodape = parseFloat(estilo.paddingBottom) + parseFloat(estilo.borderBottomWidth) + (moldura ? parseFloat(moldura.paddingBottom) : 0);
      const topo = area.getBoundingClientRect().top + window.scrollY;
      const viewport = window.visualViewport;
      const fundo = viewport ? viewport.height + viewport.pageTop : window.innerHeight + window.scrollY;
      const altura = `${Math.max(0, Math.floor(fundo - topo - rodape))}px`;
      if (area.style.height !== altura) area.style.height = altura;
    };
    const agendar = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(medir); };
    medir();
    const observer = new ResizeObserver(agendar);
    if (area.parentElement) observer.observe(area.parentElement);
    window.addEventListener('resize', agendar);
    window.visualViewport?.addEventListener('resize', agendar);
    window.visualViewport?.addEventListener('scroll', agendar);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize', agendar); window.visualViewport?.removeEventListener('resize', agendar); window.visualViewport?.removeEventListener('scroll', agendar); };
  }, []);
  return <div ref={ref} data-atendimento-raiz className="@container min-h-0" style={{ height: '50dvh' }}>{children}</div>;
}
