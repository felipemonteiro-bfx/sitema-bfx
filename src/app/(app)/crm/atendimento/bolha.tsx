import { ORIGEM_KANBAN, resumoEventoKanban } from '@/lib/whatsapp-kanban';
import { horaBolha, motivoFalhaMensagem } from './status-mensagem';
import { Tique } from './tique';
import { BlocoCitacao, BotaoResponder } from './citacao-ui';
import { BolhaInterativa } from './bolha-interativa';
import { resumirMensagem, type ResumoCitado } from '@/lib/whatsapp-citacao-resumo';
import { CorpoComLinks } from './link-previa-ui';
import { AlbumFotos } from './album-fotos';
import { ConteudoMidia, HoraPilula, recuoMidia, semBolha, type MidiaExibida } from './bolha-midia';

/**
 * Entrada da bolha: opacity + translateY de 6px em 220ms na curva do sistema.
 * Vai num <style> próprio (renderizado uma vez pelo chat) porque o globals.css não é desta tarefa.
 */
export const ESTILO_BOLHA = `.bolha-entra{animation:bolha-entra 220ms var(--mov-curva) both}
@keyframes bolha-entra{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
/* Destaque da mensagem citada ao clicar na citação: véu de 1,2s que some (sem movimento, só opacidade). */
.bolha-destaque::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:var(--warning);animation:bolha-destaque 1200ms ease-out both}
@keyframes bolha-destaque{from{opacity:.4}to{opacity:0}}
@media (prefers-reduced-motion:reduce){.bolha-entra{animation:none}.bolha-destaque::after{animation:none;opacity:.25}}`;

export type MensagemExibida = { id: number; criadoEm: Date; corpo: string; direcao: string; origem: string; status: string; erroMsg?: string | null;
  /** Tipo da mensagem (`texto`, `imagem`...) e a mídia ligada a ela, quando houver. */
  tipo?: string; midia?: MidiaExibida | null;
  /** wa_message_id da Meta: sem ele a mensagem não pode ser citada. */
  waMessageId?: string | null;
  /** Mensagem que esta respondeu (citação), já resolvida no servidor. */
  citacao?: ResumoCitado | null };

/** Cauda da bolha: triângulo em SVG que herda a cor do fundo (tokens, sem imagem). */
function Cauda({ saida }: { saida: boolean }) {
  return <svg data-cauda aria-hidden="true" viewBox="0 0 8 12" className={`absolute top-0 h-3 w-2 ${saida ? '-right-2 text-marca-tint' : '-left-2 -scale-x-100 text-popover'}`}><path d="M0 0h8L0 12z" fill="currentColor" /></svg>;
}

/** `album`: as 4+ fotos seguidas que formam uma bolha só; `m` é a última (Responder e o menu agem nela). */
export function Bolha({ m, inicioGrupo = true, nomeContato = 'Cliente', album }: { m: MensagemExibida; inicioGrupo?: boolean; nomeContato?: string; album?: MensagemExibida[] }) {
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
  const autor = saida ? 'Você' : nomeContato;
  const resumoResp = m.waMessageId ? resumirMensagem({ id: m.id, direcao: m.direcao, tipo: m.tipo, corpo: m.corpo, midia: m.midia }) : null;
  const midiaSalva = m.midia && m.midia.status === 'salva' ? m.midia.id : null;
  // O que "Copiar" leva: o texto da mensagem ou a legenda da mídia (a marca "[Foto]" etc. do corpo não conta).
  const texto = m.tipo && m.tipo !== 'texto' ? (m.midia?.legenda ?? null) : m.corpo;
  const interativa = { resumo: resumoResp, autor, midiaId: midiaSalva, texto };
  const responder = m.waMessageId ? <BotaoResponder resumo={resumirMensagem({ id: m.id, direcao: m.direcao, tipo: m.tipo, corpo: m.corpo, midia: m.midia })} autor={autor} saida={saida} /> : null;
  const citacao = (classe: string) => (m.citacao ? <BlocoCitacao r={m.citacao} autor={nomeContato} className={classe} /> : null);
  if (m.midia && m.tipo && m.tipo !== 'texto') {
    const midia = m.midia;
    const dados = { m: midia, hora, saida, status: m.status, nome: nomeContato, quando: m.criadoEm, msgId: m.id };
    const recuo = album ? 'p-1' : recuoMidia(midia);
    if (semBolha(midia)) {
      // Figurinha: sem fundo nem cauda; a hora fica numa pílula embaixo.
      return <div className={`bolha-entra flex ${saida ? 'justify-end' : 'justify-start'} ${inicioGrupo ? 'mt-3' : 'mt-0.5'}`}>
        <BolhaInterativa id={`msg-${m.id}`} semBolha {...interativa} className={`group/msg relative flex max-w-[85%] flex-col gap-1 ${saida ? 'items-end' : 'items-start'}`}>
          {m.citacao && <div className="w-64 max-w-full rounded-xl bg-popover p-1">{citacao('')}</div>}
          <ConteudoMidia {...dados} />
          <HoraPilula hora={hora} saida={saida} status={m.status} />
          {responder}
        </BolhaInterativa>
      </div>;
    }
    return <div className={`bolha-entra flex ${saida ? 'justify-end' : 'justify-start'} ${inicioGrupo ? 'mt-3' : 'mt-0.5'}`}>
      <BolhaInterativa id={`msg-${m.id}`} {...interativa} semSeta={midia.tipo === 'documento' && midia.mime === 'application/pdf'} className={`group/msg relative max-w-[85%] rounded-2xl text-foreground sm:max-w-[65%] ${recuo} ${saida ? 'bg-marca-tint' : 'bg-popover'} ${inicioGrupo ? (saida ? 'rounded-tr-none' : 'rounded-tl-none') : ''}`}>
        {inicioGrupo && <Cauda saida={saida} />}
        {citacao(recuo === 'p-1' ? 'mb-1' : '-mx-2 -mt-1 mb-2')}
        {/* As fotos anteriores do álbum não têm bolha própria: âncoras para a citação ainda achar a mensagem. */}
        {album?.slice(0, -1).map(a => <span key={a.id} id={`msg-${a.id}`} className="sr-only" />)}
        {album ? <AlbumFotos album={album} nome={nomeContato} /> : <ConteudoMidia {...dados} />}
        {responder}
      </BolhaInterativa>
    </div>;
  }
  // Espaço de 2px dentro do grupo e 12px entre grupos; só a primeira bolha tem cauda e canto reto.
  return <div className={`bolha-entra flex ${saida ? 'justify-end' : 'justify-start'} ${inicioGrupo ? 'mt-3' : 'mt-0.5'}`}>
    <BolhaInterativa id={`msg-${m.id}`} {...interativa} className={`group/msg relative max-w-[85%] rounded-2xl px-3 py-1.5 text-foreground sm:max-w-[65%] ${saida ? 'bg-marca-tint' : 'bg-popover'} ${inicioGrupo ? (saida ? 'rounded-tr-none' : 'rounded-tl-none') : ''}`}>
      {inicioGrupo && <Cauda saida={saida} />}
      {citacao('-mx-2 -mt-1 mb-1.5')}
      {/* Texto com links clicáveis; a prévia da 1ª URL carrega sob demanda. O espaçador reserva o canto da hora/tique. */}
      <CorpoComLinks corpo={m.corpo} aoTopo={!m.citacao} reserva={saida ? (m.status === 'falhou' ? 'w-36' : 'w-[5.5rem]') : 'w-12'} />
      {saida && m.status === 'falhou' && <p className="mb-5 mt-2 text-xs text-error-text">{motivoFalhaMensagem(m.erroMsg)}</p>}
      <span className="absolute bottom-1 right-2.5 flex items-center gap-1 font-mono text-xs leading-none text-muted-foreground">
        <span className="sr-only">{saida ? 'BFX' : 'Cliente'}, </span>{hora}
        {saida && <Tique status={m.status} />}
      </span>
      {responder}
    </BolhaInterativa>
  </div>;
}
