'use client';
import { useState, type ReactNode } from 'react';
import { SetaMenuMensagem } from './menu-mensagem';
import { podeVisualizar } from './pdf-cliente';
import { PdfMiniatura } from './pdf-miniatura';
import { PdfVisualizador } from './pdf-visualizador';
import { formatarTamanho } from './status-mensagem';

export type DadosPdf = { id: string; nome: string; tamanho: number | null; paginas: number | null; remetente: string; hora: string; /** Quando a mensagem foi enviada (o visualizador mostra "Hoje às…"). */ quando?: Date | string };

/** "2 páginas · PDF · 94 KB" (sem a contagem quando ela não existe), com "KB" maiúsculo como no WhatsApp. */
export function resumoPdf(d: Pick<DadosPdf, 'tamanho' | 'paginas'>): string {
  const paginas = d.paginas ? `${d.paginas} ${d.paginas === 1 ? 'página' : 'páginas'}` : '';
  return [paginas, 'PDF', formatarTamanho(d.tamanho).replace(' kB', ' KB')].filter(Boolean).join(' · ');
}

/** Bolha de PDF: miniatura da 1ª página, rodapé com nome e resumo; a bolha toda abre o visualizador. */
export function BolhaPdf({ d, fim, legenda }: { d: DadosPdf; fim: ReactNode; legenda: string | null }) {
  const [aberto, setAberto] = useState(false);
  const resumo = resumoPdf(d);
  return <div className="flex w-72 max-w-full flex-col gap-1 sm:w-85">
    <div className="group relative overflow-hidden rounded-lg bg-poco">
      <button type="button" onClick={() => setAberto(true)} aria-haspopup="dialog" aria-label={`Abrir ${d.nome}, ${resumo}`}
        className="flex w-full flex-col text-left transition duration-150 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">
        {podeVisualizar(d.tamanho) && <PdfMiniatura id={d.id} />}
        <span className="flex items-start gap-3 px-3.5 pb-3.5 pt-3">
          <IconePdf />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="bloco-sensivel break-words text-base leading-snug">{d.nome}</span>
            <span className="text-sm text-muted-foreground">{resumo}</span>
          </span>
        </span>
      </button>
      {/* Como no WhatsApp: nada de botão grande na bolha; a setinha aparece no hover/foco e abre o menu (Responder e Baixar, o mesmo da bolha). */}
      <SetaMenuMensagem rotulo={`Mais opções de ${d.nome}`} className="absolute right-1.5 top-1.5" />
    </div>
    {legenda && <p className="whitespace-pre-wrap break-words px-1 text-sm leading-snug">{legenda}</p>}
    <div className="flex justify-end px-1">{fim}</div>
    {aberto && <PdfVisualizador d={d} aberto={aberto} aoMudar={setAberto} />}
  </div>;
}

/** Folha vermelha com a dobra no canto e "PDF" embaixo (o ícone do WhatsApp, token arquivo-pdf: branco sobre vermelho fechado). */
function IconePdf() {
  return <span aria-hidden="true" data-icone-pdf className="relative flex h-9 w-7.5 shrink-0 items-end justify-center rounded-sm rounded-tr-lg bg-arquivo-pdf pb-1.5 text-arquivo-pdf-texto">
    <span data-dobra className="absolute right-0 top-0 size-2.5 rounded-bl-sm rounded-tr-lg bg-arquivo-pdf-texto/40" />
    <span className="text-xs font-bold leading-none">PDF</span>
  </span>;
}
