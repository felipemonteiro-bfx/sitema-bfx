import type { ReactNode } from 'react';
import { Loader2, Info } from 'lucide-react';
import { formatarTamanho, urlMidia } from './status-mensagem';
import { Tique } from './tique';
import { BotaoTentarFoto, FotoBotao } from './midia-cliente';
import { LARGURA_MIDIA, RAIO_MIDIA } from './midia-medidas';

/** O que a foto precisa da mídia e da mensagem (a hora e o status vêm de cada mensagem). */
export type DadosFoto = { msgId: number; midiaId: string; status: string; tamanho: number | null; hora: string; saida: boolean; statusMsg: string };

/**
 * Hora na foto sem legenda: branca sobre um degradê escuro no canto inferior direito (a escala de
 * contraste é a da própria foto, igual nos dois temas), com os tiques nas enviadas.
 */
export function HoraSobreFoto({ hora, saida, statusMsg, compacta = false, esquerda }: { hora: string; saida: boolean; statusMsg: string; compacta?: boolean; esquerda?: ReactNode }) {
  return <span data-hora-sobre-foto className={`pointer-events-none absolute inset-x-0 bottom-0 flex items-end ${esquerda ? 'justify-between' : 'justify-end'} bg-linear-to-t from-black/60 to-transparent font-mono leading-none text-white ${compacta ? 'h-9 gap-1 px-2 pb-1.5 text-xs' : 'h-11 gap-1 rounded-b-[10px] px-2.5 pb-2 text-xs'}`}>
    {esquerda ?? null}
    <span className="flex items-end gap-1"><span className="sr-only">{saida ? 'BFX' : 'Cliente'}, </span>{hora}{saida && <Tique status={statusMsg} sobreFoto />}</span>
  </span>;
}

/** Fundo da foto que ainda não chegou: sem miniatura, então um bloco neutro; a pílula diz o que está acontecendo. */
export function EstadoFoto({ d, rotuloFalha, className = '' }: { d: DadosFoto; rotuloFalha: string; className?: string }) {
  const tamanho = formatarTamanho(d.tamanho);
  if (d.status === 'falhou') {
    return <div data-foto-estado="falhou" className={`relative overflow-hidden bg-controle ${className}`}>
      <BotaoTentarFoto id={d.midiaId} rotulo={`${rotuloFalha}${tamanho ? `, ${tamanho}` : ''}`}>{tamanho || 'Baixar'}</BotaoTentarFoto>
      <HoraSobreFoto hora={d.hora} saida={d.saida} statusMsg={d.statusMsg} compacta />
    </div>;
  }
  if (d.status === 'indisponivel') {
    return <div data-foto-estado="indisponivel" className={`relative flex items-center justify-center overflow-hidden bg-controle ${className}`}>
      <span className="flex h-10 items-center gap-2 rounded-full bg-poco/80 px-3.5 text-sm text-muted-foreground"><Info className="size-4" aria-hidden="true" />Indisponível</span>
      <HoraSobreFoto hora={d.hora} saida={d.saida} statusMsg={d.statusMsg} compacta />
    </div>;
  }
  return <div data-foto-estado="carregando" className={`relative flex items-center justify-center overflow-hidden bg-controle ${className}`}>
    <span role="status" className="sr-only">Carregando mídia…</span>
    <span aria-hidden="true" className="flex h-10 items-center gap-2 rounded-full bg-poco/80 px-3.5 text-sm font-medium text-foreground backdrop-blur-sm">
      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />{tamanho}
    </span>
    <HoraSobreFoto hora={d.hora} saida={d.saida} statusMsg={d.statusMsg} compacta />
  </div>;
}

/** Foto única na bolha: ocupa a bolha (até 330px), abre a tela cheia; com legenda a hora vai no pé do texto. */
export function FotoNaBolha({ d, alt, legenda }: { d: DadosFoto; alt: string; legenda: ReactNode | null }) {
  const salva = d.status === 'salva';
  return <div className={`relative ${LARGURA_MIDIA}`}>
    {salva
      ? <FotoBotao msgId={d.msgId} rotulo={`Abrir ${alt.toLowerCase()} em tela cheia`} className={`w-full ${RAIO_MIDIA}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urlMidia(d.midiaId)} alt={alt} loading="lazy" decoding="async" className="bloco-sensivel block h-auto max-h-[26rem] min-h-40 w-full bg-poco object-cover" />
        {!legenda && <HoraSobreFoto hora={d.hora} saida={d.saida} statusMsg={d.statusMsg} />}
      </FotoBotao>
      : <EstadoFoto d={d} rotuloFalha="Tentar baixar a foto de novo" className={`aspect-4/3 w-full ${RAIO_MIDIA}`} />}
    {legenda}
  </div>;
}
