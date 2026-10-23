'use client';
import { useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { abrirPdf, aoEntrarNaTela } from './pdf-cliente';

/**
 * Miniatura da 1ª página: só baixa e renderiza quando a bolha chega perto da tela.
 * Erro (PDF protegido, corrompido ou indisponível): some a miniatura e fica só o rodapé da bolha.
 */
export function PdfMiniatura({ id }: { id: string }) {
  const caixa = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [estado, setEstado] = useState<'espera' | 'pronta' | 'erro'>('espera');

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    let vivo = true;
    let tarefa: { cancel: () => void } | null = null;
    let soltar: (() => void) | null = null;
    const parar = aoEntrarNaTela(el, () => {
      void (async () => {
        try {
          const aberto = abrirPdf(id);
          soltar = aberto.soltar;
          if (!vivo) { soltar(); return; }
          const pdf = await aberto.pdf;
          const pagina = await pdf.getPage(1);
          const alvo = canvas.current;
          if (!vivo || !alvo) return;
          const largura = el.clientWidth || 320;
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const viewport = pagina.getViewport({ scale: (largura * dpr) / pagina.getViewport({ scale: 1 }).width });
          alvo.width = Math.floor(viewport.width);
          alvo.height = Math.floor(viewport.height);
          const render = pagina.render({ canvasContext: alvo.getContext('2d')!, viewport });
          tarefa = render;
          await render.promise;
          if (vivo) setEstado('pronta');
        } catch {
          if (vivo) setEstado('erro');
        }
      })();
    });
    return () => { vivo = false; parar(); tarefa?.cancel(); soltar?.(); };
  }, [id]);

  if (estado === 'erro') return null;
  return <div ref={caixa} data-miniatura aria-hidden="true" className="bloco-sensivel relative h-50 overflow-hidden rounded-t-lg bg-poco">
    {estado === 'espera' && <Skeleton className="absolute inset-0 rounded-none" />}
    {/* O canvas preenche a largura e é cortado embaixo: só o topo da página aparece, como no WhatsApp. */}
    <canvas ref={canvas} className={`block w-full ${estado === 'pronta' ? '' : 'invisible'}`} />
  </div>;
}
