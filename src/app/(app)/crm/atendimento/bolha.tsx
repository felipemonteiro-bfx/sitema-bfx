import { AlertCircle } from 'lucide-react';
import { ORIGEM_KANBAN, resumoEventoKanban } from '@/lib/whatsapp-kanban';
import { horaBolha, statusTique } from './status-mensagem';

/**
 * Entrada da bolha: opacity + translateY de 6px em 220ms na curva do sistema.
 * Vai num <style> próprio (renderizado uma vez pelo chat) porque o globals.css não é desta tarefa.
 */
export const ESTILO_BOLHA = `.bolha-entra{animation:bolha-entra 220ms var(--mov-curva) both}
@keyframes bolha-entra{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.bolha-entra{animation:none}}`;

export type MensagemExibida = { id: number; criadoEm: Date; corpo: string; direcao: string; origem: string; status: string };

const COR_TIQUE = { neutro: 'text-muted-foreground', marca: 'text-marca-tint-texto', erro: 'text-error-text' } as const;

function Tique({ status }: { status: string }) {
  const t = statusTique(status);
  const cor = COR_TIQUE[t.tom];
  if (t.tique === 'erro') {
    return <span className={`inline-flex items-center gap-1 font-medium ${cor}`}><AlertCircle role="img" aria-label={t.rotulo} className="size-3.5" />Falhou</span>;
  }
  return <svg role="img" aria-label={t.rotulo} className={`h-3 w-4 ${cor}`} viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={t.tique === 'dois' ? 'M1 6l3 3 6-7M6 9l1 1 6-7' : 'M3 6l3 3 6-7'} /></svg>;
}

export function Bolha({ m }: { m: MensagemExibida }) {
  const hora = horaBolha(m.criadoEm);
  if (m.direcao === 'sistema') {
    // Registro interno: pílula tracejada central, sem envio externo.
    return <div className="bolha-entra flex justify-center"><div className="max-w-[min(92%,520px)] rounded-interno border border-dashed border-input bg-card px-3 py-2 text-center text-sm text-texto-secundario">
      <span className="block text-xs text-muted-foreground">Registro interno · sem envio externo · {hora}</span>
      <p className="mt-0.5 whitespace-pre-wrap break-words leading-snug">{m.origem === ORIGEM_KANBAN ? resumoEventoKanban(m.corpo) : m.corpo}</p>
    </div></div>;
  }
  const saida = m.direcao === 'out';
  return <div className={`bolha-entra flex ${saida ? 'justify-end' : 'justify-start'}`}>
    <article className={`flex max-w-[min(85%,520px)] flex-col gap-1 rounded-2xl px-3 pb-1.5 pt-2 text-foreground ${saida ? 'rounded-br-sm bg-marca-tint' : 'rounded-bl-sm border border-divisoria bg-popover'}`}>
      <p className="whitespace-pre-wrap break-words text-base leading-relaxed">{m.corpo}</p>
      <span className="flex items-center justify-end gap-1.5 font-mono text-xs text-muted-foreground">
        <span className="sr-only">{saida ? 'BFX' : 'Cliente'}, </span>{hora}
        {saida && <Tique status={m.status} />}
      </span>
    </article>
  </div>;
}
