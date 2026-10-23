// Foto na bolha, álbum e tela cheia (estilo WhatsApp). O vitest roda em `node`: funções puras + marcação estática;
// clique, teclado e swipe foram vistos no navegador (ver relato da tarefa).
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.stubGlobal('React', React);
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/app/(app)/crm/atendimento/midia-tentar-actions', () => ({ tentarMidiaDeNovo: vi.fn() }));

import { agruparMensagens } from '@/app/(app)/crm/atendimento/agrupar-mensagens';
import { itensDaConversa, proximoIndice, restantesAlbum, rotuloDataVisualizador, rotuloPosicao, indicePorMensagem } from '@/app/(app)/crm/atendimento/fotos-regras';
import { Bolha, type MensagemExibida } from '@/app/(app)/crm/atendimento/bolha';
import { VisualizadorFotos } from '@/app/(app)/crm/atendimento/visualizador-fotos';

const midia = (id: string, o: Record<string, unknown> = {}) => ({ id, tipo: 'imagem', status: 'salva', mime: 'image/jpeg', tamanho: 118000, nomeExibicao: null, legenda: null, voz: false, animada: false, ...o });
const IDS = Array.from({ length: 9 }, (_, i) => `3f2b8c1e-5a4d-4e6f-9a7b-1c2d3e4f5a0${i}`);
const foto = (n: number, minuto: number, direcao = 'in', o: Record<string, unknown> = {}, extra: Record<string, unknown> = {}): MensagemExibida =>
  ({ id: n, criadoEm: new Date(Date.UTC(2026, 9, 16, 18, minuto)), corpo: '[Foto]', direcao, origem: 'manual', status: 'entregue', tipo: 'imagem', waMessageId: `wa${n}`, midia: midia(IDS[n % 9], o), ...extra }) as MensagemExibida;
const agora = new Date('2026-10-16T19:00:00Z');
const itens = (ms: MensagemExibida[]) => agruparMensagens(ms, agora).flatMap(d => d.itens);

describe('álbum: agrupamento', () => {
  it('4 fotos seguidas viram um item álbum', () => {
    const r = itens([foto(1, 0), foto(2, 1), foto(3, 2), foto(4, 3)]);
    expect(r).toHaveLength(1);
    expect(r[0].tipo).toBe('album');
    expect(r[0].album?.map(m => m.id)).toEqual([1, 2, 3, 4]);
    expect(r[0].m.id).toBe(4); // responder/menu usam a última
    expect(r[0].inicioGrupo).toBe(true);
  });
  it('2 ou 3 fotos continuam separadas', () => {
    expect(itens([foto(1, 0), foto(2, 1), foto(3, 2)]).map(i => i.tipo)).toEqual(['msg', 'msg', 'msg']);
  });
  it('mais de 5 min entre fotos quebra o álbum; exatamente 5 min junta', () => {
    expect(itens([foto(1, 0), foto(2, 1), foto(3, 2), foto(4, 3), foto(5, 9), foto(6, 10)]).map(i => i.tipo)).toEqual(['album', 'msg', 'msg']);
    expect(itens([foto(1, 0), foto(2, 5), foto(3, 10), foto(4, 15)]).map(i => i.tipo)).toEqual(['album']);
  });
  it('direção diferente quebra o álbum', () => {
    expect(itens([foto(1, 0), foto(2, 1), foto(3, 2, 'out'), foto(4, 3), foto(5, 4)]).map(i => i.tipo)).toEqual(['msg', 'msg', 'msg', 'msg', 'msg']);
  });
  it('legenda: a última pode ter; foto legendada no meio encerra o grupo', () => {
    const ok = itens([foto(1, 0), foto(2, 1), foto(3, 2), foto(4, 3, 'in', { legenda: 'as quatro' })]);
    expect(ok.map(i => i.tipo)).toEqual(['album']);
    expect(ok[0].m.midia?.legenda).toBe('as quatro');
    const meio = itens([foto(1, 0), foto(2, 1, 'in', { legenda: 'x' }), foto(3, 2), foto(4, 3), foto(5, 4)]);
    expect(meio.map(i => i.tipo)).toEqual(['msg', 'msg', 'msg', 'msg', 'msg']);
  });
  it('vídeo, texto ou registro interno no meio não entram no álbum', () => {
    const video = foto(3, 2, 'in', { tipo: 'video' }, { tipo: 'video' });
    expect(itens([foto(1, 0), foto(2, 1), video, foto(4, 3), foto(5, 4)]).map(i => i.tipo)).toEqual(['msg', 'msg', 'msg', 'msg', 'msg']);
  });
  it('depois do álbum a mensagem seguinte do mesmo lado continua o grupo (sem cauda)', () => {
    const texto = { id: 5, criadoEm: new Date(Date.UTC(2026, 9, 16, 18, 6)), corpo: 'olá', direcao: 'in', origem: 'manual', status: 'entregue' } as MensagemExibida;
    const r = itens([foto(1, 0), foto(2, 1), foto(3, 2), foto(4, 3), texto]);
    expect(r.map(i => [i.tipo, i.inicioGrupo])).toEqual([['album', true], ['msg', false]]);
  });
  it('+N: restantes depois da 4ª célula', () => {
    expect(restantesAlbum(7)).toBe(3);
    expect(restantesAlbum(4)).toBe(0);
  });
});

describe('tela cheia: regras puras', () => {
  it('data relativa em Manaus', () => {
    expect(rotuloDataVisualizador(new Date('2026-10-16T19:54:00Z'), agora)).toBe('Hoje às 15:54');
    expect(rotuloDataVisualizador(new Date('2026-10-15T19:54:00Z'), agora)).toBe('Ontem às 15:54');
    expect(rotuloDataVisualizador(new Date('2026-10-01T19:54:00Z'), agora)).toBe('01/10/2026 às 15:54');
  });
  it('navegação por índice fica nos limites', () => {
    expect(proximoIndice(0, 7, -1)).toBe(0);
    expect(proximoIndice(0, 7, 1)).toBe(1);
    expect(proximoIndice(6, 7, 1)).toBe(6);
    expect(proximoIndice(3, 0, 1)).toBe(0);
    expect(rotuloPosicao(2, 7)).toBe('3 de 7');
  });
  it('itens: só foto e vídeo salvos, em ordem, com o índice da mensagem', () => {
    const ms = [foto(1, 0), foto(2, 1, 'in', { status: 'pendente' }), foto(3, 2, 'out', { tipo: 'video' }, { tipo: 'video' }), foto(4, 3, 'in', { tipo: 'audio' }, { tipo: 'audio' })];
    const it = itensDaConversa(ms);
    expect(it.map(i => [i.msgId, i.tipo])).toEqual([[1, 'imagem'], [3, 'video']]);
    expect(indicePorMensagem(it, 3)).toBe(1);
    expect(indicePorMensagem(it, 2)).toBe(-1);
    expect(it[1].saida).toBe(true);
  });
});

describe('foto na bolha', () => {
  const h = (m: MensagemExibida, album?: MensagemExibida[]) => renderToStaticMarkup(React.createElement(Bolha, { m, album }));
  it('sem legenda: hora sobreposta na foto, zoom-in, tique nas enviadas', () => {
    const r = h(foto(1, 0));
    expect(r).toContain('data-hora-sobre-foto');
    expect(r).toContain('cursor-zoom-in');
    expect(r).not.toContain('data-legenda-foto');
    const s = h(foto(2, 0, 'out'));
    expect(s).toContain('data-hora-sobre-foto');
    expect(s).toContain('aria-label="Entregue"');
  });
  it('com legenda: hora no pé do texto, não sobre a foto', () => {
    const r = h(foto(1, 0, 'in', { legenda: 'É essa a lavadora?' }));
    expect(r).toContain('É essa a lavadora?');
    expect(r).not.toContain('data-hora-sobre-foto');
  });
  it('carregando: borrado com pílula de tamanho e sem URL', () => {
    const r = h(foto(1, 0, 'in', { status: 'baixando' }));
    expect(r).toContain('data-foto-estado="carregando"');
    expect(r).toContain('115 kB');
    expect(r).not.toContain('<img');
  });
  it('falhou: pílula com tamanho que tenta de novo', () => {
    const r = h(foto(1, 0, 'in', { status: 'falhou' }));
    expect(r).toContain('data-foto-estado="falhou"');
    expect(r).toContain('Tentar baixar a foto de novo');
    expect(r).toContain('115 kB');
  });
  it('indisponível definitivo segue como estava', () => {
    expect(h(foto(1, 0, 'in', { status: 'indisponivel' }))).toContain('Mídia não disponível');
  });
});

describe('álbum na bolha', () => {
  const fotos7 = Array.from({ length: 7 }, (_, i) => foto(i + 1, i));
  const r = renderToStaticMarkup(React.createElement(Bolha, { m: fotos7[6], album: fotos7 }));
  it('grade de 4 células com +3 na quarta e hora em cada uma', () => {
    expect(r).toContain('role="group"');
    expect(r).toContain('Álbum com 7 fotos');
    expect((r.match(/data-celula-album/g) ?? []).length).toBe(4);
    expect(r).toContain('+3');
    expect(r).toContain('Ver mais 3 fotos');
    expect((r.match(/data-hora-sobre-foto/g) ?? []).length).toBe(4);
  });
  it('4 fotos: sem +N', () => {
    const q = fotos7.slice(0, 4);
    const x = renderToStaticMarkup(React.createElement(Bolha, { m: q[3], album: q }));
    expect(x).not.toContain('+0');
    expect(x).not.toContain('Ver mais');
  });
  it('legenda da última aparece no pé do álbum', () => {
    const q = [...fotos7.slice(0, 3), foto(9, 4, 'in', { legenda: 'as quatro' })];
    expect(renderToStaticMarkup(React.createElement(Bolha, { m: q[3], album: q }))).toContain('as quatro');
  });
});

describe('visualizador', () => {
  it('fechado não renderiza nada', () => {
    const it = itensDaConversa([foto(1, 0)]);
    expect(renderToStaticMarkup(React.createElement(VisualizadorFotos, { itens: it, indice: null, aoMudar: () => undefined, aoFechar: () => undefined, contato: { nome: 'Ana', telefone: '5592994070720' }, agora }))).toBe('');
  });
});
