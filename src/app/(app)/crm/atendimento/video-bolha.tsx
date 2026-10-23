'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Play, Video } from 'lucide-react';
import { formatarTempo, urlMidia } from './status-mensagem';
import { FotoBotao } from './midia-cliente';
import { HoraSobreFoto, type DadosFoto } from './foto-bolha';
import { LARGURA_MIDIA, RAIO_MIDIA } from './midia-medidas';

/** Rótulo do botão ▶: leva a duração quando já se conhece (lida dos metadados no navegador). */
export function rotuloReproduzir(duracao: number | null | undefined): string {
  return Number.isFinite(duracao) && (duracao as number) > 0 ? `Reproduzir vídeo de ${formatarTempo(duracao as number)}` : 'Reproduzir vídeo';
}

// A foto vai de ~0,79 (alta, teto de 26rem a 330px) até panorâmica; o vídeo segue a mesma régua.
const RAZAO_MIN = 330 / 416;
const RAZAO_MAX = 2;
const RAZAO_PADRAO = 16 / 9;

/**
 * Vídeo na bolha como a foto: primeiro quadro ocupando a largura, ▶ central, duração (câmera + tempo) no canto inferior
 * esquerdo e a hora sobreposta no direito (sem legenda). Não toca aqui: o clique abre o visualizador em tela cheia.
 */
export function VideoNaBolha({ d, alt, legenda }: { d: DadosFoto; alt: string; legenda: ReactNode | null }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [duracao, setDuracao] = useState<number | null>(null);
  const [razao, setRazao] = useState(RAZAO_PADRAO);
  const ler = (v: HTMLVideoElement) => {
    if (Number.isFinite(v.duration) && v.duration > 0) setDuracao(v.duration);
    if (v.videoWidth > 0 && v.videoHeight > 0) setRazao(Math.min(RAZAO_MAX, Math.max(RAZAO_MIN, v.videoWidth / v.videoHeight)));
  };
  // Os metadados podem chegar antes da hidratação: lê o que já estiver pronto.
  useEffect(() => { if (ref.current && ref.current.readyState >= 1) ler(ref.current); }, []);
  const tempo = duracao ? formatarTempo(duracao) : '';
  const marca = <span data-video-duracao className="flex items-center gap-1"><Video className="size-3.5" aria-hidden="true" />{tempo}</span>;
  return <div className={`relative ${LARGURA_MIDIA}`}>
    <FotoBotao msgId={d.msgId} rotulo={rotuloReproduzir(duracao)} className={`w-full ${RAIO_MIDIA}`}>
      <span className="relative block w-full bg-poco" style={{ aspectRatio: razao }}>
        <video ref={ref} src={`${urlMidia(d.midiaId)}#t=0.1`} preload="metadata" muted playsInline tabIndex={-1} aria-hidden="true"
          onLoadedMetadata={e => ler(e.currentTarget)} className="bloco-sensivel pointer-events-none absolute inset-0 size-full object-cover" />
        <span data-video-play aria-hidden="true" className="absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-transform group-hover/foto:scale-105 motion-reduce:transition-none">
          <Play className="ml-0.5 size-5 fill-current" />
        </span>
        {legenda
          ? <span className="pointer-events-none absolute inset-x-0 bottom-0 flex h-9 items-end bg-linear-to-t from-black/60 to-transparent px-2.5 pb-1.5 font-mono text-xs leading-none text-white">{marca}</span>
          : <HoraSobreFoto hora={d.hora} saida={d.saida} statusMsg={d.statusMsg} esquerda={marca} />}
      </span>
      <span className="sr-only">{alt}</span>
    </FotoBotao>
    {legenda}
  </div>;
}
