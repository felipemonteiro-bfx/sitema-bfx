/**
 * pdf.js no navegador: carregamento sob demanda, cache de documento por id e travas de segurança.
 * O PDF é baixado pela rota autenticada (same-origin, sempre `attachment`) e renderizado em <canvas>;
 * nada é aberto pelo leitor nativo do navegador e nada sai do sistema.
 */
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { criarCacheComReferencias } from './pdf-cache';
import { urlMidia } from './status-mensagem';

/** Acima disto a bolha não busca o arquivo: só mostra o rodapé e oferece o download. */
export const LIMITE_VISUALIZAR_BYTES = 20 * 1024 * 1024;

/** `tamanho` desconhecido não passa: sem o número, não dá para garantir o teto antes de buscar. */
export const podeVisualizar = (tamanho: number | null | undefined): boolean =>
  typeof tamanho === 'number' && tamanho <= LIMITE_VISUALIZAR_BYTES;

let carregando: Promise<typeof import('pdfjs-dist')> | null = null;

/** O pdf.js (pesado) só entra no bundle da página quando a primeira bolha de PDF aparece na tela. */
export function carregarPdfjs(): Promise<typeof import('pdfjs-dist')> {
  carregando ??= import('pdfjs-dist').then(pdfjs => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    return pdfjs;
  });
  carregando.catch(() => { carregando = null; });
  return carregando;
}

/**
 * Até 3 documentos ociosos guardados (cada um segura worker, fontes e páginas em memória); o menos usado é destruído.
 * Documento em uso (miniatura ou visualizador montado) nunca é destruído: ver `abrirPdf`/`soltar`.
 */
const MAX_DOCUMENTOS = 3;
const documentos = criarCacheComReferencias<Promise<PDFDocumentProxy>>(MAX_DOCUMENTOS, p => { void p.then(d => d.destroy()).catch(() => {}); });

async function baixarEAbrir(id: string): Promise<PDFDocumentProxy> {
  const [pdfjs, resposta] = await Promise.all([carregarPdfjs(), fetch(urlMidia(id), { credentials: 'same-origin' })]);
  if (!resposta.ok) throw new Error('pdf_indisponivel');
  const declarado = Number(resposta.headers.get('content-length'));
  if (Number.isFinite(declarado) && declarado > LIMITE_VISUALIZAR_BYTES) {
    void resposta.body?.cancel();
    throw new Error('pdf_grande_demais');
  }
  const bytes = new Uint8Array(await resposta.arrayBuffer());
  if (bytes.byteLength > LIMITE_VISUALIZAR_BYTES) throw new Error('pdf_grande_demais');
  return pdfjs.getDocument({
    data: bytes,
    isEvalSupported: false,
    enableXfa: false,
    disableAutoFetch: true,
    disableStream: true,
  }).promise;
}

/**
 * Um único download e um único parse por mídia: miniatura e visualizador compartilham o documento.
 * Quem abre DEVE chamar `soltar()` ao desmontar; só então o documento pode ser destruído pelo limite.
 */
export function abrirPdf(id: string): { pdf: Promise<PDFDocumentProxy>; soltar: () => void } {
  const ref = documentos.adquirir(id, baixarEAbrir.bind(null, id));
  ref.valor.catch(() => documentos.descartar(id));
  return { pdf: ref.valor, soltar: ref.soltar };
}

/** Observa o elemento até ele chegar perto da tela (uma vez). Sem IntersectionObserver, dispara já. */
export function aoEntrarNaTela(el: Element, cb: () => void, margem = '300px'): () => void {
  if (typeof IntersectionObserver === 'undefined') { cb(); return () => {}; }
  const obs = new IntersectionObserver(entradas => {
    if (entradas.some(e => e.isIntersecting)) { obs.disconnect(); cb(); }
  }, { rootMargin: margem });
  obs.observe(el);
  return () => obs.disconnect();
}
