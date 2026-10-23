// Prévia de PDF no atendimento: marcação estática da bolha + testes de fonte das travas de segurança.
// O vitest roda em `node`: miniatura e visualizador (canvas, IntersectionObserver) foram vistos no navegador.
import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.stubGlobal('React', React);
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/app/(app)/crm/atendimento/midia-tentar-actions', () => ({ tentarMidiaDeNovo: vi.fn() }));

import { Bolha, type MensagemExibida } from '@/app/(app)/crm/atendimento/bolha';

const DIR = 'src/app/(app)/crm/atendimento/';
const ID = '3f2b8c1e-5a4d-4e6f-9a7b-1c2d3e4f5a6b';
const midia = (o: Record<string, unknown> = {}) => ({ id: ID, tipo: 'documento', status: 'salva', mime: 'application/pdf', tamanho: 96256, nomeExibicao: 'Contrato-teste.pdf', legenda: null, voz: false, animada: false, paginas: 2, ...o });
const msg = (m: Record<string, unknown> = {}): MensagemExibida =>
  ({ id: 1, criadoEm: new Date('2026-10-16T18:03:00Z'), corpo: '[Documento]', direcao: 'in', origem: 'manual', status: 'entregue', tipo: 'documento', midia: midia(m) }) as MensagemExibida;
const html = (m: MensagemExibida) => renderToStaticMarkup(React.createElement(Bolha, { m }));
const fonte = (arq: string) => readFileSync(DIR + arq, 'utf8');
const MB = 1024 * 1024;

describe('bolha de PDF', () => {
  it('mostra páginas, tipo e tamanho, botão de abrir e nenhum iframe/embed', () => {
    const h = html(msg());
    expect(h).toContain('2 páginas · PDF · 94 KB');
    expect(h).toMatch(/aria-label="Abrir Contrato-teste\.pdf/);
    expect(h).toContain('Contrato-teste.pdf');
    expect(h).not.toMatch(/<iframe|<embed|<object/);
  });
  it('como no artboard e no WhatsApp: sem botão de baixar sobre a bolha; o download fica no visualizador', () => {
    expect(html(msg())).not.toContain(`/api/whatsapp/midias/${ID}?baixar=1`);
    expect(fonte('pdf-visualizador.tsx')).toContain('urlMidia(d.id, true)');
  });
  it('baixar como no WhatsApp: setinha discreta no canto que abre menu com "Baixar"', () => {
    const h = html(msg());
    expect(h).toMatch(/aria-label="Mais opções de Contrato-teste\.pdf"/);
    expect(fonte('bolha-pdf.tsx')).toContain('SetaMenuMensagem');
    const f = fonte('menu-mensagem.tsx'); // o menu é o mesmo de todas as bolhas
    expect(f).toContain('DropdownMenu');
    expect(f).toContain('ChevronDown');
    expect(f).toContain('urlMidia(midiaId, true)');
    expect(f).toContain('variant="revelar"');
  });
  it('ícone de folha com dobra e "PDF" embaixo; resumo na fonte normal (não mono)', () => {
    const h = html(msg());
    expect(h).toContain('data-icone-pdf');
    expect(h).toContain('data-dobra');
    const resumo = h.split('2 páginas · PDF · 94 KB')[0].split('<span').pop() ?? '';
    expect(resumo).not.toContain('font-mono');
    expect(fonte('bolha-pdf.tsx')).not.toContain('FileText');
  });
  it('sem contagem de páginas, omite "N páginas"', () => {
    const h = html(msg({ paginas: null }));
    expect(h).toContain('PDF · 94 KB');
    expect(h).not.toContain('páginas');
  });
  it('PDF acima de 20 MB não monta miniatura, mas mantém o rodapé', () => {
    const h = html(msg({ tamanho: 21 * MB }));
    expect(h).toContain('2 páginas · PDF · 21 MB');
    expect(h).not.toContain('data-miniatura');
  });
  it('PDF dentro do teto reserva a área da miniatura', () => {
    expect(html(msg())).toContain('data-miniatura');
  });
  it('documento que não é PDF mostra "sem prévia"', () => {
    const h = html(msg({ mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', nomeExibicao: 'a.docx', paginas: null }));
    expect(h).toContain('sem prévia');
    expect(h).not.toContain('data-miniatura');
  });
});

describe('travas do pdf.js e do visualizador (fonte)', () => {
  const lib = fonte('pdf-cliente.ts');
  it('carrega o pdf.js só por import() dinâmico, sem import estático de valor', () => {
    expect(lib).toContain("import('pdfjs-dist')");
    for (const arq of ['pdf-cliente.ts', 'pdf-miniatura.tsx', 'pdf-visualizador.tsx', 'bolha-pdf.tsx']) {
      expect(fonte(arq)).not.toMatch(/^import (?!type)[^\n]*from 'pdfjs-dist/m);
    }
  });
  it('getDocument sem eval, sem XFA, sem autofetch nem stream', () => {
    for (const trava of ['isEvalSupported: false', 'enableXfa: false', 'disableAutoFetch: true', 'disableStream: true']) expect(lib).toContain(trava);
  });
  it('teto de 20 MB antes de buscar o arquivo', () => {
    expect(lib).toMatch(/LIMITE_VISUALIZAR_BYTES = 20 \* 1024 \* 1024/);
    expect(lib).toMatch(/content-length/i);
  });
  it('visualizador não abre PDF fora do pdf.js: sem blob:, window.open nem annotation layer', () => {
    for (const arq of ['pdf-visualizador.tsx', 'pdf-miniatura.tsx', 'bolha-pdf.tsx', 'pdf-cliente.ts']) {
      const f = fonte(arq);
      expect(f).not.toMatch(/createObjectURL|blob:|window\.open|nova aba|AnnotationLayer|annotationMode|renderForms/i);
    }
    expect(fonte('pdf-visualizador.tsx')).toContain('Baixar');
    expect(fonte('pdf-visualizador.tsx')).toContain('Fechar');
  });
  it('documento PDF continua sempre attachment na rota (sem modo inline)', async () => {
    const { contentDisposition } = await import('@/lib/whatsapp-midia-politica');
    expect(contentDisposition('documento', 'a.pdf', {})).toMatch(/^attachment/);
    expect(readFileSync('src/app/api/whatsapp/midias/[id]/route.ts', 'utf8')).not.toMatch(/inline=|searchParams\.get\(["']inline/);
  });
});

describe('visualizador de PDF sem rodapé explicativo', () => {
  it('não mostra o texto "Renderizado no seu navegador"', () => {
    expect(readFileSync('src/app/(app)/crm/atendimento/pdf-visualizador.tsx', 'utf8')).not.toContain('Renderizado no seu navegador');
  });
});
