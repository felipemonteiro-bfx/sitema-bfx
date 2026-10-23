import { AlertCircle, Clock } from 'lucide-react';
import { statusTique } from './status-mensagem';

const COR_TIQUE = { neutro: 'text-muted-foreground', marca: 'text-marca-tint-texto', erro: 'text-error-text' } as const;

/**
 * Tique de status da mensagem da BFX: 1 (enviado), 2 cinza (entregue), 2 verde-marca (lido),
 * relógio (pendente/gerando) e erro com rótulo. O texto acessível é o mesmo de sempre.
 */
export function Tique({ status, sobreFoto = false }: { status: string; sobreFoto?: boolean }) {
  const t = statusTique(status);
  // Sobre a foto o fundo é sempre o degradê escuro: branco (lida) ou branco a 70% (demais); o erro mantém a cor própria.
  const cor = sobreFoto && t.tom !== 'erro' ? (t.tom === 'marca' ? 'text-white' : 'text-white/70') : COR_TIQUE[t.tom];
  if (t.tique === 'erro') {
    return <span className={`inline-flex items-center gap-1 font-medium ${cor}`}><AlertCircle role="img" aria-label={t.rotulo} className="size-3.5" />Falhou</span>;
  }
  if (status === 'pendente' || status === 'gerando') return <Clock role="img" aria-label={t.rotulo} className={`size-3 ${cor}`} />;
  return <svg role="img" aria-label={t.rotulo} className={`h-3 w-4 ${cor}`} viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={t.tique === 'dois' ? 'M1 6l3 3 6-7M6 9l1 1 6-7' : 'M3 6l3 3 6-7'} /></svg>;
}
