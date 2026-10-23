// Bolhas de mídia do atendimento (B12a) e prévia na lista (B12b).
// O vitest roda em `node`, sem jsdom: aqui só marcação estática e funções puras; clique e áudio foram vistos no navegador.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi, beforeEach } from 'vitest';
vi.stubGlobal('React', React);
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/app/(app)/crm/atendimento/midia-tentar-actions', () => ({ tentarMidiaDeNovo: vi.fn() }));

const processar = vi.fn(async (_t: string) => undefined);
vi.mock('@/lib/whatsapp-midia-download', () => ({ processarPendentesDaConversa: (t: string) => processar(t), processarMidia: vi.fn() }));

const findMany = vi.fn(async (_a: unknown) => [] as unknown[]);
vi.mock('@/lib/db', () => ({
  prisma: {
    cliente: { findMany: async () => [] },
    whatsAppMensagem: { groupBy: async () => [{ telefone: '5592999990001', _max: { criadoEm: new Date() } }], findMany: (a: unknown) => findMany(a), findFirst: async () => null },
    usuario: { findMany: async () => [] },
    config: { findFirst: async () => null },
  },
}));
vi.mock('@/lib/whatsapp-nao-respondidas', () => ({ naoRespondidasPorTelefone: async () => new Map() }));
vi.mock('@/lib/whatsapp-ultimas', () => ({ ultimasMensagensPorTelefone: async () => [] }));
vi.mock('@/components/theme-toggle', () => ({ ThemeToggle: () => null }));
vi.mock('@/components/page-header', () => ({ PageHeader: () => null }));
vi.mock('@/app/(app)/crm/atendimento/contexto', () => ({ ContextoCliente: () => null }));
vi.mock('@/app/(app)/crm/atendimento/kanban', () => ({ KanbanConversas: () => null, OrganizarConversa: () => null }));
vi.mock('@/app/(app)/crm/atendimento/reply', () => ({ Reply: () => null }));

import { Bolha, type MensagemExibida } from '@/app/(app)/crm/atendimento/bolha';
import { formatarTamanho, formatarTempo } from '@/app/(app)/crm/atendimento/status-mensagem';
import { LARGURA_MIDIA, RAIO_MIDIA } from '@/app/(app)/crm/atendimento/midia-medidas';
import { rotuloReproduzir } from '@/app/(app)/crm/atendimento/video-bolha';
import { previaDeMidia } from '@/app/(app)/crm/atendimento/previa-midia';
import { ConversaLista } from '@/app/(app)/crm/atendimento/conversa-lista';
import { TelaAtendimento } from '@/app/(app)/crm/atendimento/tela-atendimento';

const ID = '3f2b8c1e-5a4d-4e6f-9a7b-1c2d3e4f5a6b';
const midia = (o: Record<string, unknown> = {}) => ({ id: ID, tipo: 'imagem', status: 'salva', mime: 'image/jpeg', tamanho: 188416, nomeExibicao: null, legenda: null, voz: false, animada: false, ...o });
const msg = (tipo: string, direcao: 'in' | 'out', m: Record<string, unknown> = {}, extra: Record<string, unknown> = {}): MensagemExibida =>
  ({ id: 1, criadoEm: new Date('2026-10-16T18:03:00Z'), corpo: '[Foto]', direcao, origem: 'manual', status: 'entregue', tipo, midia: midia({ tipo, ...m }), ...extra }) as MensagemExibida;
const html = (m: MensagemExibida) => renderToStaticMarkup(React.createElement(Bolha, { m }));
const URL_MIDIA = `/api/whatsapp/midias/${ID}`;

describe('funções puras', () => {
  it('tempo e tamanho legíveis', () => {
    expect(formatarTempo(42)).toBe('0:42');
    expect(formatarTempo(75)).toBe('1:15');
    expect(formatarTempo(Number.NaN)).toBe('0:00');
    expect(formatarTamanho(188416)).toBe('184 kB');
    expect(formatarTamanho(1572864)).toBe('1,5 MB');
    expect(formatarTamanho(500)).toBe('500 B');
    expect(formatarTamanho(null)).toBe('');
  });
});

describe('bolhas de mídia salva', () => {
  it('áudio: botão, onda, slider, <audio preload=metadata> e avatar na voz', () => {
    const h = html(msg('audio', 'in', { mime: 'audio/ogg', voz: true }));
    expect(h).toContain('aria-label="Tocar áudio"');
    expect(h).toContain('<audio');
    expect(h).toContain('preload="metadata"');
    expect(h).toContain(`src="${URL_MIDIA}"`);
    expect(h.match(/data-barra/g)).toHaveLength(40 * 2); // cinza + camada colorida
    expect(h).toMatch(/role="slider"/);
    expect(h).toContain('data-avatar-voz');
    expect(html(msg('audio', 'in', { voz: false }))).not.toContain('data-avatar-voz');
  });
  it('foto: miniatura lazy com alt por lado, legenda e blur no discreto', () => {
    const h = html(msg('imagem', 'in', { legenda: 'É essa a lavadora' }));
    expect(h).toContain('loading="lazy"');
    expect(h).toContain('alt="Foto enviada pelo cliente"');
    expect(h).toContain('É essa a lavadora');
    expect(h).toContain('bloco-sensivel');
    expect(h).toContain(`src="${URL_MIDIA}"`);
    expect(html(msg('imagem', 'out'))).toContain('alt="Foto enviada pela BFX"');
  });
  it('vídeo: quadro com preload=metadata, ▶ central, sem controls (o visualizador é que toca)', () => {
    const h = html(msg('video', 'out', { mime: 'video/mp4' }));
    expect(h).toContain('<video');
    expect(h).not.toContain('controls');
    expect(h).not.toContain('autoPlay');
    expect(h).toContain('preload="metadata"');
    expect(h).toContain(`src="${URL_MIDIA}#t=0.1"`);
    expect(h).toContain('aria-label="Reproduzir vídeo"');
    expect(h).toContain('data-video-play');
    expect(h).toContain('data-hora-sobre-foto');
  });
  it('vídeo e foto compartilham a largura e o raio da mídia visual', () => {
    const v = html(msg('video', 'out', { mime: 'video/mp4' }));
    const f = html(msg('imagem', 'out'));
    expect(v).toContain(LARGURA_MIDIA);
    expect(f).toContain(LARGURA_MIDIA);
    expect(v).toContain(RAIO_MIDIA);
    expect(f).toContain(RAIO_MIDIA);
    expect(v).not.toContain('w-64');
  });
  it('vídeo com legenda: hora no pé do texto, não sobre o quadro', () => {
    const h = html(msg('video', 'in', { mime: 'video/mp4', legenda: 'Olha o barulho' }));
    expect(h).toContain('Olha o barulho');
    expect(h).not.toContain('data-hora-sobre-foto');
    expect(h).toContain('data-video-duracao');
  });
  it('rótulo do ▶ leva a duração quando conhecida', () => {
    expect(rotuloReproduzir(32)).toBe('Reproduzir vídeo de 0:32');
    expect(rotuloReproduzir(null)).toBe('Reproduzir vídeo');
    expect(rotuloReproduzir(Number.NaN)).toBe('Reproduzir vídeo');
  });
  it('vídeo carregando/falhou tem o mesmo desenho do estado da foto', () => {
    for (const status of ['pendente', 'falhou']) {
      const h = html(msg('video', 'in', { status }));
      expect(h).toContain('data-foto-estado');
      expect(h).toContain(LARGURA_MIDIA);
      expect(h).not.toContain('<video');
    }
    expect(html(msg('video', 'in', { status: 'falhou' }))).toContain('Tentar baixar o vídeo de novo');
  });
  it('estado da foto e álbum usam a mesma constante de largura', () => {
    expect(html(msg('imagem', 'in', { status: 'pendente' }))).toContain(LARGURA_MIDIA);
  });
  it('figurinha: sem bolha, hora em pílula', () => {
    const h = html(msg('figurinha', 'in', { mime: 'image/webp' }));
    expect(h).toContain('data-sem-bolha');
    expect(h).toContain('alt="Figurinha enviada pelo cliente"');
    expect(h).not.toContain('bg-popover rounded-2xl');
    expect(h).not.toMatch(/<article[^>]*bg-(popover|marca-tint)/);
    expect(html(msg('figurinha', 'out', { mime: 'image/webp' }))).toContain('alt="Figurinha enviada pela BFX"');
  });
  // PDF tem bolha própria (miniatura e menu da setinha): ver atendimento-pdf-previa.test.ts.
  it('documento não-PDF: ícone, nome, tamanho e download com ?baixar=1', () => {
    const h = html(msg('documento', 'out', { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', nomeExibicao: 'Contrato-venda.docx', tamanho: 188416 }));
    expect(h).toContain('Contrato-venda.docx');
    expect(h).toContain('184 kB');
    expect(h).toContain(`href="${URL_MIDIA}?baixar=1"`);
    expect(h).toContain('aria-label="Baixar Contrato-venda.docx"');
  });
});

describe('estados da mídia', () => {
  it.each(['pendente', 'baixando'])('%s: placeholder com spinner e sem URL de mídia', status => {
    const h = html(msg('imagem', 'in', { status }));
    expect(h).toContain('Carregando mídia…');
    expect(h).not.toContain('<img');
    expect(h).not.toContain(URL_MIDIA);
  });
  it('falhou: aviso e botão Tentar de novo', () => {
    const h = html(msg('documento', 'in', { status: 'falhou' }));
    expect(h).toContain('Não foi possível carregar a mídia');
    expect(h).toContain('Tentar de novo');
  });
  it('indisponivel: discreto, sem botão', () => {
    const h = html(msg('audio', 'in', { status: 'indisponivel' }));
    expect(h).toContain('Mídia não disponível');
    expect(h).not.toContain('Tentar de novo');
    expect(h).not.toContain('<audio');
  });
  it('texto comum continua igual', () => {
    const h = html({ id: 2, criadoEm: new Date(), corpo: 'Olá', direcao: 'in', origem: 'x', status: 'recebido' });
    expect(h).toContain('Olá');
    expect(h).not.toContain('<audio');
  });
});

describe('prévia na lista (B12b)', () => {
  it('mídia: ícone lucide, rótulo e legenda; sem emoji e sem [Foto]', () => {
    expect(previaDeMidia('imagem', '[Foto] É essa a lavadora')).toEqual({ icone: 'Camera', rotulo: 'Foto', legenda: 'É essa a lavadora' });
    expect(previaDeMidia('audio', '[Áudio]')).toEqual({ icone: 'Mic', rotulo: 'Áudio', legenda: '' });
    expect(previaDeMidia('documento', '[Documento] Contrato.pdf')?.legenda).toBe('Contrato.pdf');
    expect(previaDeMidia('texto', 'oi')).toBeNull();
    expect(previaDeMidia(undefined, 'oi')).toBeNull();
  });
  it('a linha da lista renderiza SVG + rótulo, sem emoji nem placeholder cru', () => {
    const item = { telefone: '5592999990001', nome: 'Ana Souza', hora: '14:03', previa: '[Foto] É essa a lavadora', previaMidia: previaDeMidia('imagem', '[Foto] É essa a lavadora'), aguardando: true, etapa: 'novas', etapaNome: 'Novas', responsavel: 'x', naoRespondidas: 1 };
    const h = renderToStaticMarkup(React.createElement(ConversaLista, { itens: [item], selecionado: undefined, base: '/crm/atendimento', busca: '', visao: 'lista', etapa: 'todas', contagens: { todas: 1 } }));
    expect(h).toContain('Foto');
    expect(h).toContain('É essa a lavadora');
    expect(h).not.toContain('[Foto]');
    expect(/\p{Extended_Pictographic}/u.test(h)).toBe(false);
    expect(h).toContain('lucide-camera');
  });
});

describe('ultimasMensagensPorTelefone seleciona o tipo', () => {
  beforeEach(() => findMany.mockClear());
  it('select inclui tipo', async () => {
    vi.doUnmock('@/lib/whatsapp-ultimas');
    vi.resetModules();
    const { ultimasMensagensPorTelefone } = await import('@/lib/whatsapp-ultimas');
    await ultimasMensagensPorTelefone([{ telefone: '5592999990001', _max: { criadoEm: new Date() } }]);
    expect((findMany.mock.calls[0]![0] as { select: Record<string, boolean> }).select.tipo).toBe(true);
  });
});

describe('abrir a conversa processa as mídias pendentes', () => {
  beforeEach(() => { processar.mockClear(); findMany.mockClear(); });
  it('chama processarPendentesDaConversa(telefone) e inclui a mídia no histórico', async () => {
    await TelaAtendimento({ searchParams: Promise.resolve({ telefone: '5592999990001', visao: 'lista' }), modo: 'sistema' });
    expect(processar).toHaveBeenCalledWith('5592999990001');
    const consultas = findMany.mock.calls.map(c => c[0] as { include?: { midia?: unknown } });
    expect(consultas.some(c => c.include?.midia)).toBe(true);
  });
  it('na visão kanban não dispara downloads', async () => {
    await TelaAtendimento({ searchParams: Promise.resolve({ visao: 'kanban' }), modo: 'sistema' });
    expect(processar).not.toHaveBeenCalled();
  });
});
