import { chaveDia, rotuloDia } from './status-mensagem';
import { MINIMO_ALBUM } from './fotos-regras';

/** Mensagens do mesmo lado com menos de 5 min entre uma e a seguinte formam um grupo. */
export const JANELA_GRUPO_MS = 5 * 60_000;

/** `tipo`/`midia` só existem nas mensagens do histórico; sem eles a mensagem nunca vira foto de álbum. */
type Base = { criadoEm: Date; direcao: string; tipo?: string; midia?: { legenda?: string | null } | null; citacao?: unknown };
/**
 * `album` só vem no item tipo 'album': todas as fotos do grupo, e `m` é a última (é nela que Responder e o menu agem).
 */
export type ItemLog<T extends Base> = { tipo: 'msg' | 'sistema' | 'album'; m: T; inicioGrupo: boolean; album?: T[] };
export type DiaLog<T extends Base> = { chave: string; rotulo: string; itens: ItemLog<T>[] };

/**
 * Organiza o histórico (já em ordem cronológica) em dias, e cada dia em itens marcados com
 * `inicioGrupo`. Só a primeira bolha do grupo leva a "cauda" e o espaço maior acima.
 * Função pura de exibição: não altera nem descarta nenhuma mensagem.
 */
export function agruparMensagens<T extends Base>(mensagens: T[], agora: Date = new Date()): DiaLog<T>[] {
  const dias: DiaLog<T>[] = [];
  let anterior: T | null = null;
  for (const m of mensagens) {
    const chave = chaveDia(m.criadoEm);
    let dia = dias[dias.length - 1];
    if (!dia || dia.chave !== chave) { dia = { chave, rotulo: rotuloDia(m.criadoEm, agora), itens: [] }; dias.push(dia); anterior = null; }
    const sistema = m.direcao === 'sistema';
    const continua = !sistema && !!anterior && anterior.direcao === m.direcao
      && m.criadoEm.getTime() - anterior.criadoEm.getTime() < JANELA_GRUPO_MS;
    dia.itens.push({ tipo: sistema ? 'sistema' : 'msg', m, inicioGrupo: !continua });
    anterior = sistema ? null : m;
  }
  return dias.map(d => ({ ...d, itens: juntarAlbuns(d.itens) }));
}

const ehFoto = (m: Base) => m.tipo === 'imagem' && !!m.midia;
/** Legenda e citação só aparecem na bolha do álbum (a da última foto): a foto que tem uma das duas encerra o grupo. */
const temLegenda = (m: Base) => !!m.midia?.legenda || !!m.citacao;

/**
 * Fotos seguidas (mesmo lado, até 5 min entre uma e a seguinte, sem legenda nem citação — a última pode ter) viram um álbum
 * quando são 4 ou mais. Foto legendada ou citada encerra o grupo. Menos de 4 continuam bolhas separadas.
 */
function juntarAlbuns<T extends Base>(itens: ItemLog<T>[]): ItemLog<T>[] {
  const saida: ItemLog<T>[] = [];
  let corrida: ItemLog<T>[] = [];
  const fechar = () => {
    if (corrida.length >= MINIMO_ALBUM) saida.push({ tipo: 'album', m: corrida[corrida.length - 1].m, inicioGrupo: corrida[0].inicioGrupo, album: corrida.map(i => i.m) });
    else saida.push(...corrida);
    corrida = [];
  };
  for (const item of itens) {
    if (item.tipo !== 'msg' || !ehFoto(item.m)) { fechar(); saida.push(item); continue; }
    const ultima = corrida[corrida.length - 1];
    const emenda = ultima && ultima.m.direcao === item.m.direcao && !temLegenda(ultima.m)
      && item.m.criadoEm.getTime() - ultima.m.criadoEm.getTime() <= JANELA_GRUPO_MS;
    if (ultima && !emenda) fechar();
    corrida.push(item);
  }
  fechar();
  return saida;
}
