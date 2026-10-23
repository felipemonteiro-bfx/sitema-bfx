import { CELULAS_ALBUM, restantesAlbum } from './fotos-regras';
import { horaBolha, urlMidia } from './status-mensagem';
import { FotoBotao } from './midia-cliente';
import { EstadoFoto, HoraSobreFoto, type DadosFoto } from './foto-bolha';
import { LARGURA_MIDIA } from './midia-medidas';
import { Legenda, type MidiaExibida } from './bolha-midia';
import type { MensagemExibida } from './bolha';

const lado = (saida: boolean) => (saida ? 'pela BFX' : 'pelo cliente');

/**
 * Álbum: 4 ou mais fotos seguidas numa bolha só, grade 2×2. A quarta célula leva "+N" (as fotos que sobram) sobre a
 * foto escurecida; cada célula tem a própria hora e abre a tela cheia naquela foto.
 */
export function AlbumFotos({ album, nome }: { album: MensagemExibida[]; nome: string }) {
  const total = album.length;
  const saida = album[0].direcao === 'out';
  const restantes = restantesAlbum(total);
  const ultima = album[total - 1];
  const legenda = ultima.midia?.legenda ?? null;
  return <div className={LARGURA_MIDIA}>
    <div role="group" aria-label={`Álbum com ${total} fotos ${saida ? 'enviado pela BFX' : `de ${nome}`}`} className="grid grid-cols-2 gap-1">
      {album.slice(0, CELULAS_ALBUM).map((m, i) => {
        const md = m.midia as MidiaExibida;
        const d: DadosFoto = { msgId: m.id, midiaId: md.id, status: md.status, tamanho: md.tamanho, hora: horaBolha(m.criadoEm), saida, statusMsg: m.status };
        const posicao = `${i + 1} de ${total}`;
        const classe = 'aspect-square w-full rounded-lg';
        if (md.status !== 'salva') return <div key={m.id} data-celula-album><EstadoFoto d={d} rotuloFalha={`Tentar baixar a foto ${posicao} de novo`} className={classe} /></div>;
        const ultimaCelula = i === CELULAS_ALBUM - 1 && restantes > 0;
        return <FotoBotao key={m.id} msgId={m.id} className={classe} rotulo={ultimaCelula ? `Ver mais ${restantes} fotos` : `Abrir foto ${posicao} em tela cheia`}>
          <span data-celula-album className="contents">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urlMidia(md.id)} alt={`Foto ${posicao} enviada ${lado(saida)}`} loading="lazy" decoding="async" className={`bloco-sensivel absolute inset-0 size-full bg-poco object-cover ${ultimaCelula ? 'brightness-50' : ''}`} />
            {ultimaCelula && <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-4xl font-medium text-white">+{restantes}</span>}
            <HoraSobreFoto hora={d.hora} saida={saida} statusMsg={m.status} compacta />
          </span>
        </FotoBotao>;
      })}
    </div>
    {legenda && <Legenda texto={legenda} ctx={{ hora: horaBolha(ultima.criadoEm), saida, status: ultima.status }} />}
  </div>;
}
