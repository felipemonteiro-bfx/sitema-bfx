import { ORIGEM_KANBAN, resumoEventoKanban } from '@/lib/whatsapp-kanban';
import { horaBolha } from './status-mensagem';
import { Tique } from './tique';

/**
 * Entrada da bolha: opacity + translateY de 6px em 220ms na curva do sistema.
 * Vai num <style> próprio (renderizado uma vez pelo chat) porque o globals.css não é desta tarefa.
 */
export const ESTILO_BOLHA = `.bolha-entra{animation:bolha-entra 220ms var(--mov-curva) both}
@keyframes bolha-entra{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.bolha-entra{animation:none}}`;

export type MensagemExibida = { id: number; criadoEm: Date; corpo: string; direcao: string; origem: string; status: string };

/** Cauda da bolha: triângulo em SVG que herda a cor do fundo (tokens, sem imagem). */
function Cauda({ saida }: { saida: boolean }) {
  return <svg data-cauda aria-hidden="true" viewBox="0 0 8 12" className={`absolute top-0 h-3 w-2 ${saida ? '-right-2 text-marca-tint' : '-left-2 -scale-x-100 text-popover'}`}><path d="M0 0h8L0 12z" fill="currentColor" /></svg>;
}

export function Bolha({ m, inicioGrupo = true }: { m: MensagemExibida; inicioGrupo?: boolean }) {
  const hora = horaBolha(m.criadoEm);
  if (m.direcao === 'sistema') {
    // Registro interno (kanban): pílula central discreta, sem envio externo.
    return <div className="bolha-entra my-2 flex justify-center"><div className="max-w-[min(92%,520px)] rounded-full bg-controle px-3 py-1 text-center text-xs text-texto-secundario">
      <span className="sr-only">Registro interno · sem envio externo · {hora}: </span>
      <span aria-hidden="true" className="text-muted-foreground">Registro interno · sem envio externo · {hora} · </span>
      <span className="whitespace-pre-wrap break-words">{m.origem === ORIGEM_KANBAN ? resumoEventoKanban(m.corpo) : m.corpo}</span>
    </div></div>;
  }
  const saida = m.direcao === 'out';
  // Espaço de 2px dentro do grupo e 12px entre grupos; só a primeira bolha tem cauda e canto reto.
  return <div className={`bolha-entra flex ${saida ? 'justify-end' : 'justify-start'} ${inicioGrupo ? 'mt-3' : 'mt-0.5'}`}>
    <article className={`relative max-w-[85%] rounded-2xl px-3 py-1.5 text-foreground sm:max-w-[65%] ${saida ? 'bg-marca-tint' : 'bg-popover'} ${inicioGrupo ? (saida ? 'rounded-tr-none' : 'rounded-tl-none') : ''}`}>
      {inicioGrupo && <Cauda saida={saida} />}
      <p className="whitespace-pre-wrap break-words text-sm leading-snug">
        {m.corpo}
        {/* Espaçador invisível: reserva o canto da hora/tique para o texto não colidir com ele. */}
        <span aria-hidden="true" className={`inline-block h-3 align-bottom ${saida ? (m.status === 'falhou' ? 'w-36' : 'w-[5.5rem]') : 'w-12'}`} />
      </p>
      <span className="absolute bottom-1 right-2.5 flex items-center gap-1 font-mono text-xs leading-none text-muted-foreground">
        <span className="sr-only">{saida ? 'BFX' : 'Cliente'}, </span>{hora}
        {saida && <Tique status={m.status} />}
      </span>
    </article>
  </div>;
}
