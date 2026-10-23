import Link from 'next/link';
import { ArrowLeft, Clock, Phone, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Bolha, ESTILO_BOLHA, type MensagemExibida } from './bolha';
import { LogMensagens } from './log-mensagens';
import { Reply } from './reply';
import { RespostaProvider } from './citacao-ui';
import { iniciais } from './status-mensagem';
import { nomeParaExibir, semNomeSalvo } from '@/lib/whatsapp-kanban';
import { agruparMensagens } from './agrupar-mensagens';
import { FotosProvider } from './fotos-contexto';
import { itensDaConversa } from './fotos-regras';
import { BotaoPainel } from './painel-contato';
import { AbrirEmNovaJanela } from './abrir-em-nova-janela';
import { visaoMobile } from './layout-regras';
import { QuemResponde } from './quem-responde';
import { janelaRestante } from './quem-responde-regras';

type Props = {
  telefone: string; nome: string; aberta: boolean; semResposta: boolean; estadoAutomatico: string;
  mensagens: MensagemExibida[]; fichaHref: string; novaAba?: boolean; agora?: Date;
  /** `telefone` veio da URL: no celular isso mostra o chat; sem ele, a lista. */
  telefoneExplicito?: boolean;
  /** Volta para a lista no celular (mantém busca e etapa). */
  urlLista?: string;
  /** Link da tela própria (só no sistema; na janela o ícone não aparece). */
  hrefJanela?: string;
  /** Quando o automático volta sozinho (ISO), se a pausa tem prazo. */
  retomaEm?: string | null;
  /** Fim da janela de 24h (ISO): vira "Janela aberta · 22h". */
  janelaAte?: string | null;
  /** A integração oficial não está ativa: o composer mostra o aviso de envio. */
  envioIndisponivel?: boolean;
  evolutionDisponivel?: boolean;
};

const AVISO_DETALHE = (estado: string) => estado.includes('Pausa') || estado.includes('pausado') ? 'A equipe assumiu ou o automático está pausado.' : 'Se o automático não respondeu, confira o assunto e use uma resposta pronta no ⚡. Retomar trata somente a última entrada recente sem resposta.';
const AVISO_COMPLETO = (estado: string) => `Mensagem do cliente aguardando resposta · ${AVISO_DETALHE(estado)}`;

export function ConversaChat({ telefone, nome, aberta, semResposta, estadoAutomatico, mensagens, fichaHref, novaAba = false, agora = new Date(), telefoneExplicito = true, urlLista = '/crm/atendimento?visao=lista', hrefJanela, retomaEm = null, janelaAte = null, evolutionDisponivel = false, envioIndisponivel = false }: Props) {
  // Na tela própria não há sidebar: a ficha (que vive no sistema) abre em outra aba.
  const abrir = novaAba ? { target: '_blank', rel: 'noopener' } : {};
  const dias = agruparMensagens(mensagens, agora);
  // Janela de 24h: a entrada mais recente do cliente é janelaAte - 24h.
  const restante = aberta && janelaAte ? janelaRestante(new Date(new Date(janelaAte).getTime() - 86_400_000), agora) : null;
  // Celular (< 768px de área): lista OU chat. Com telefone na URL mostra o chat.
  const visivel = visaoMobile(telefoneExplicito) === 'chat' ? 'flex' : 'hidden @xl:flex';
  return <section aria-label="Conversa selecionada" className={`${visivel} min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-painel border border-painel-borda bg-card dark:border-transparent`}>
    <style>{ESTILO_BOLHA}</style>
    <header className="flex min-h-16 shrink-0 items-center gap-1 border-b border-divisoria px-2 py-2">
      <span className="@xl:hidden"><Button asChild variant="ghost" size="icon"><Link href={urlLista} aria-label="Voltar para a lista de conversas"><ArrowLeft className="size-5" aria-hidden="true" /></Link></Button></span>
      <BotaoPainel nome={nome} className="flex min-w-0 flex-1 items-center gap-3 rounded-controle px-2 py-1 text-left hover:bg-controle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full max-sm:hidden bg-marca-tint font-display text-sm font-semibold text-marca-tint-texto">{semNomeSalvo(nome, telefone) ? <Phone className="size-5" aria-hidden="true" /> : iniciais(nome)}</span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-base font-semibold leading-tight">{nomeParaExibir(nome, telefone)}</span>
          <span className={`truncate text-xs text-muted-foreground ${semNomeSalvo(nome, telefone) ? '' : 'font-mono'}`}>{semNomeSalvo(nome, telefone) ? 'Sem nome salvo' : nomeParaExibir(telefone, telefone)}</span>
        </span>
      </BotaoPainel>
      {/* Estado da janela de 24h à direita (pílula de marca quando aberta; neutra quando encerrada). */}
      <span className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ${aberta ? 'bg-marca-tint text-marca-tint-texto' : 'bg-controle text-texto-secundario'}`}><Clock className="size-3.5" aria-hidden="true" /><span className="@max-xl:sr-only">{aberta ? `Janela aberta${restante ? ` · ${restante}` : ''}` : 'Aguardando cliente'}</span></span>
      <QuemResponde telefone={telefone} estadoAutomatico={estadoAutomatico} retomaEm={retomaEm} aberta={aberta} agora={agora} />
      <div className="flex shrink-0 items-center">
        <Button asChild variant="ghost" size="icon"><Link href={fichaHref} {...abrir} aria-label="Abrir ficha do cliente" title="Abrir ficha do cliente"><UserRound className="size-5 text-muted-foreground" aria-hidden="true" /></Link></Button>
        {hrefJanela && <span className="hidden @xl:inline-flex"><AbrirEmNovaJanela href={hrefJanela} variante="icone" /></span>}
        <BotaoPainel />
      </div>
    </header>
    <RespostaProvider key={`resposta-${telefone}`}>
    <FotosProvider key={`fotos-${telefone}`} itens={itensDaConversa(mensagens)} contato={{ nome, telefone }}>
    <LogMensagens key={`log-${telefone}`} className="flex min-h-0 flex-1 flex-col overscroll-contain overflow-y-auto bg-poco bg-[radial-gradient(var(--grafico-trilha)_1px,transparent_1px)] [background-size:18px_18px] px-3 pb-4 @xl:px-6">
      {dias.map(d => <section key={d.chave} aria-label={d.rotulo} className="flex flex-col">
        {/* Separador de data: pílula centralizada que fica fixa no topo enquanto o dia rola. */}
        <div className="sticky top-0 z-10 flex justify-center py-2"><span className="inline-flex h-7 items-center rounded-full bg-popover px-3 text-xs text-texto-secundario shadow-sm">{d.rotulo}</span></div>
        {d.itens.map(i => <Bolha key={i.m.id} m={i.m} inicioGrupo={i.inicioGrupo} nomeContato={nome} album={i.album} />)}
      </section>)}
    </LogMensagens>
    {/* Indicador mínimo (ponto + frase curta de 12px) logo acima do composer. O texto completo da regra
        continua no leitor de tela e no title; o role=status é o mesmo de antes. */}
    {semResposta && <p role="status" title={AVISO_COMPLETO(estadoAutomatico)} className="flex shrink-0 items-center gap-2 px-4 py-1.5 text-xs text-muted-foreground"><span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-primary" /><span aria-hidden="true" className="font-medium text-foreground">Cliente aguardando resposta</span><span className="sr-only"><strong>Mensagem do cliente aguardando resposta</strong> · {AVISO_DETALHE(estadoAutomatico)}</span></p>}
    <Reply key={`reply-${telefone}`} telefone={telefone} aberta={aberta} estadoAutomatico={estadoAutomatico} envioIndisponivel={envioIndisponivel} textoEvolution={!aberta&&evolutionDisponivel} />
    </FotosProvider>
    </RespostaProvider>
  </section>;
}
