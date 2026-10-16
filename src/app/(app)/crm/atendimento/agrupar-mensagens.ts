import { chaveDia, rotuloDia } from './status-mensagem';

/** Mensagens do mesmo lado com menos de 5 min entre uma e a seguinte formam um grupo. */
export const JANELA_GRUPO_MS = 5 * 60_000;

type Base = { criadoEm: Date; direcao: string };
export type ItemLog<T extends Base> = { tipo: 'msg' | 'sistema'; m: T; inicioGrupo: boolean };
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
  return dias;
}
