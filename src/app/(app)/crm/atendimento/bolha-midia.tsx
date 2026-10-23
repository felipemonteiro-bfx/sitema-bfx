import type { ReactNode } from 'react';
import { TextoComLinks } from './link-previa-ui';
import { AlertCircle, Download, FileText, Info, Loader2 } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button-variants';
import { formatarTamanho, rotuloRemetente, urlMidia } from './status-mensagem';
import { Tique } from './tique';
import { BolhaPdf } from './bolha-pdf';
import { BotaoTentarDeNovo } from './midia-cliente';
import { EstadoFoto, FotoNaBolha } from './foto-bolha';
import { VideoNaBolha } from './video-bolha';
import { LARGURA_MIDIA, RAIO_MIDIA } from './midia-medidas';
import { PlayerAudio } from './player-audio';

/** O que a bolha precisa saber da mídia (sem chave de storage nem id da Meta). */
export type MidiaExibida = {
  id: string; tipo: string; status: string; mime: string; tamanho: number | null;
  nomeExibicao: string | null; legenda: string | null; voz: boolean; animada: boolean;
  /** Só PDF: contagem de páginas (nula quando não deu para contar). */
  paginas?: number | null;
  /** Só áudio: transcrição salva (feita no navegador, NÃO verificada) e os 40 picos da onda (0-31). */
  transcricao?: string | null;
  onda?: number[] | null;
};

const salva = (m: MidiaExibida) => m.status === 'salva';

/** Figurinha salva não tem bolha: só a imagem e a hora numa pílula embaixo. */
export const semBolha = (m: MidiaExibida) => m.tipo === 'figurinha' && salva(m);

/** Foto que ainda não está salva mas vai aparecer (carregando ou falhou): a bolha já é de foto, com a pílula no lugar. */
const fotoEmEstado = (m: MidiaExibida) => (m.tipo === 'imagem' || m.tipo === 'video') && ['pendente', 'baixando', 'falhou'].includes(m.status);

/** Foto e vídeo ocupam a bolha inteira (borda de 4px); o resto usa o recuo normal do texto. */
export const recuoMidia = (m: MidiaExibida) => ((salva(m) && (m.tipo === 'imagem' || m.tipo === 'video')) || fotoEmEstado(m) ? 'p-1' : 'px-3 py-2');

export type Contexto = { hora: string; saida: boolean; status: string };

/** Hora e, nas mensagens da BFX, o tique de entrega; o prefixo fica só para leitor de tela. */
export function Hora({ hora, saida, status }: Contexto) {
  return <span className="flex shrink-0 items-center gap-1 font-mono text-xs leading-none text-muted-foreground">
    <span className="sr-only">{saida ? 'BFX' : 'Cliente'}, </span>{hora}{saida && <Tique status={status} />}
  </span>;
}

export function Legenda({ texto, ctx }: { texto: string | null; ctx: Contexto }) {
  return <div className="flex items-end justify-between gap-3 px-1.5 pb-0.5 pt-1">
    <p className="min-w-0 whitespace-pre-wrap break-words text-sm leading-snug"><TextoComLinks texto={texto ?? ''} /></p>
    <Hora {...ctx} />
  </div>;
}

const lado = (saida: boolean) => (saida ? 'pela BFX' : 'pelo cliente');

function extensao(m: MidiaExibida): string {
  const nome = m.nomeExibicao ?? '';
  const ponto = nome.lastIndexOf('.');
  if (ponto > 0 && nome.length - ponto <= 6) return nome.slice(ponto + 1).toUpperCase();
  return m.mime === 'application/pdf' ? 'PDF' : 'ARQ';
}

function Estado({ m, ctx }: { m: MidiaExibida; ctx: Contexto }) {
  if (m.status === 'falhou') {
    return <div className="flex w-64 max-w-full flex-col gap-2">
      <p className="flex items-start gap-2 text-sm text-foreground"><AlertCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />Não foi possível carregar a mídia</p>
      <div className="flex items-end justify-between gap-2"><BotaoTentarDeNovo id={m.id} /><Hora {...ctx} /></div>
    </div>;
  }
  if (m.status === 'indisponivel') {
    return <div className="flex w-56 max-w-full items-end justify-between gap-3">
      <p className="flex items-center gap-2 text-sm text-muted-foreground"><Info className="size-4 shrink-0" aria-hidden="true" />Mídia não disponível</p>
      <Hora {...ctx} />
    </div>;
  }
  // pendente | baixando (e qualquer valor desconhecido): nunca monta URL de mídia que ainda não existe.
  return <div className="flex w-56 max-w-full items-end justify-between gap-3">
    <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />Carregando mídia…</p>
    <Hora {...ctx} />
  </div>;
}

/** Conteúdo da bolha de mídia. O invólucro (cauda, cor, grupo) é da `Bolha`. */
export function ConteudoMidia({ m, hora, saida, status, nome: contato, quando, msgId }: { m: MidiaExibida; nome?: string; quando?: Date | string; msgId?: number } & Contexto): ReactNode {
  const ctx = { hora, saida, status };
  if (m.tipo === 'video' && fotoEmEstado(m) && msgId !== undefined) {
    const d = { msgId, midiaId: m.id, status: m.status, tamanho: m.tamanho, hora, saida, statusMsg: status };
    return <div className={LARGURA_MIDIA}><EstadoFoto d={d} rotuloFalha="Tentar baixar o vídeo de novo" className={`aspect-4/3 w-full ${RAIO_MIDIA}`} /></div>;
  }
  if (fotoEmEstado(m) && msgId !== undefined) {
    return <FotoNaBolha d={{ msgId, midiaId: m.id, status: m.status, tamanho: m.tamanho, hora, saida, statusMsg: status }} alt={`Foto enviada ${lado(saida)}`} legenda={null} />;
  }
  if (!salva(m)) return <Estado m={m} ctx={ctx} />;
  switch (m.tipo) {
    case 'audio':
      return <PlayerAudio id={m.id} voz={m.voz} saida={saida} nome={contato} fim={<Hora {...ctx} />} tamanho={m.tamanho} onda={m.onda} transcricao={m.transcricao} />;
    case 'imagem':
      return <FotoNaBolha d={{ msgId: msgId ?? 0, midiaId: m.id, status: m.status, tamanho: m.tamanho, hora, saida, statusMsg: status }} alt={`Foto enviada ${lado(saida)}`}
        legenda={m.legenda ? <Legenda texto={m.legenda} ctx={ctx} /> : null} />;
    case 'video':
      return <VideoNaBolha d={{ msgId: msgId ?? 0, midiaId: m.id, status: m.status, tamanho: m.tamanho, hora, saida, statusMsg: status }} alt={`Vídeo enviado ${lado(saida)}`}
        legenda={m.legenda ? <Legenda texto={m.legenda} ctx={ctx} /> : null} />;
    case 'figurinha':
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={urlMidia(m.id)} alt={`Figurinha enviada ${lado(saida)}`} loading="lazy" className="bloco-sensivel size-40 object-contain" />;
    case 'documento': {
      const nome = m.nomeExibicao ?? 'arquivo';
      if (m.mime === 'application/pdf') {
        return <BolhaPdf d={{ id: m.id, nome, tamanho: m.tamanho, paginas: m.paginas ?? null, remetente: rotuloRemetente({ saida, nome: contato }), hora, quando }} legenda={m.legenda} fim={<Hora {...ctx} />} />;
      }
      return <div className="flex w-64 max-w-full flex-col gap-1 sm:w-72">
        <div className="flex items-center gap-3 rounded-interno bg-poco p-2.5">
          <span aria-hidden="true" className="flex h-12 w-10 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md bg-controle text-xs font-bold text-texto-secundario"><FileText className="size-4" />{extensao(m)}</span>
          <span className="bloco-sensivel flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm">{nome}</span>
            <span className="font-mono text-xs text-muted-foreground">{[formatarTamanho(m.tamanho), 'sem prévia'].filter(Boolean).join(' · ')}</span>
          </span>
          <a href={urlMidia(m.id, true)} download aria-label={`Baixar ${nome}`} className={buttonVariants({ variant: 'ghost', size: 'icon' })}><Download className="size-4" aria-hidden="true" /></a>
        </div>
        {m.legenda && <p className="whitespace-pre-wrap break-words px-1 text-sm leading-snug"><TextoComLinks texto={m.legenda} /></p>}
        <div className="flex justify-end px-1"><Hora {...ctx} /></div>
      </div>;
    }
    default:
      return <Estado m={{ ...m, status: 'indisponivel' }} ctx={ctx} />;
  }
}

/** Pílula da hora da figurinha (fica fora da imagem, já que não há bolha). */
export function HoraPilula(ctx: Contexto) {
  return <span className="inline-flex items-center rounded-full bg-popover px-2 py-1"><Hora {...ctx} /></span>;
}
