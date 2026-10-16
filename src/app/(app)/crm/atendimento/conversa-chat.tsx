import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { Bolha, ESTILO_BOLHA, type MensagemExibida } from './bolha';
import { LogMensagens } from './log-mensagens';
import { Reply } from './reply';
import { chaveDia, iniciais, rotuloDia } from './status-mensagem';

type Props = {
  telefone: string; nome: string; aberta: boolean; semResposta: boolean; estadoAutomatico: string;
  mensagens: MensagemExibida[]; fichaHref: string; novaAba?: boolean; agora?: Date;
};

export function ConversaChat({ telefone, nome, aberta, semResposta, estadoAutomatico, mensagens, fichaHref, novaAba = false, agora = new Date() }: Props) {
  // Na tela própria não há sidebar: a ficha (que vive no sistema) abre em outra aba.
  const abrir = novaAba ? { target: '_blank', rel: 'noopener' } : {};
  let diaAnterior = '';
  const itens = mensagens.flatMap(m => {
    const dia = chaveDia(m.criadoEm);
    const separador = dia !== diaAnterior ? [<div key={`dia-${dia}`} className="flex justify-center"><span className="inline-flex h-7 items-center rounded-full bg-controle px-3 text-xs text-texto-secundario">{rotuloDia(m.criadoEm, agora)}</span></div>] : [];
    diaAnterior = dia;
    return [...separador, <Bolha key={m.id} m={m} />];
  });
  return <section aria-label="Conversa selecionada" className="order-1 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-painel border border-painel-borda bg-card dark:border-transparent lg:order-none">
    <style>{ESTILO_BOLHA}</style>
    <header className="flex flex-wrap items-center gap-3 border-b border-divisoria px-4 py-3">
      <a href="#conversas" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary lg:hidden"><ArrowLeft className="size-4" aria-hidden="true" />Conversas</a>
      <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-marca-tint font-display text-base font-semibold text-marca-tint-texto">{iniciais(nome)}</span>
      <div className="min-w-[9rem] flex-1">
        <h2 className="truncate text-base font-semibold"><Link className="hover:underline hover:underline-offset-4" href={fichaHref} {...abrir}>{nome}</Link></h2>
        <Link href={fichaHref} {...abrir} aria-label="Abrir ficha pelo telefone" className="inline-block py-1 font-mono text-sm text-muted-foreground hover:underline hover:underline-offset-4">+{telefone}</Link>
      </div>
      <span className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-semibold ${aberta ? 'bg-marca-tint text-marca-tint-texto' : 'bg-controle text-texto-secundario'}`}><Clock className="size-3.5" aria-hidden="true" />{aberta ? 'Janela aberta' : 'Aguardando cliente'}</span>
    </header>
    <LogMensagens key={`log-${telefone}`} className="flex max-h-[65dvh] min-h-64 flex-1 flex-col gap-2.5 overflow-y-auto bg-poco bg-[radial-gradient(var(--grafico-trilha)_1px,transparent_1px)] [background-size:18px_18px] px-3 py-5 sm:px-6 lg:max-h-none lg:min-h-0">
      {itens}
    </LogMensagens>
    {/* Indicador discreto (antes era uma faixa verde larga no topo do chat): uma linha muted logo
        acima do composer, com o mesmo texto e o mesmo role=status. */}
    {semResposta && <p role="status" className="flex items-start gap-2 border-t border-divisoria px-4 py-2 text-xs leading-snug text-muted-foreground"><span aria-hidden="true" className="mt-1 size-2 shrink-0 rounded-full bg-primary" /><span><strong className="font-semibold text-foreground">Mensagem do cliente aguardando resposta</strong> · {estadoAutomatico.includes('Pausa') || estadoAutomatico.includes('pausado') ? 'A equipe assumiu ou o automático está pausado.' : 'Se o automático não respondeu, confira o assunto e use uma resposta pronta abaixo. Retomar trata somente a última entrada recente sem resposta.'}</span></p>}
    <Reply key={`reply-${telefone}`} telefone={telefone} aberta={aberta} estadoAutomatico={estadoAutomatico} />
  </section>;
}
