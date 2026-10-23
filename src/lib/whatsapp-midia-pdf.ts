/**
 * Contagem de páginas de PDF para a bolha do atendimento. Melhor esforço: qualquer falha ou PDF grande
 * demais vira `null` (a bolha só omite "N páginas").
 *
 * O arquivo é de terceiro (chega pelo WhatsApp): nada de parse completo do documento, que pode travar o
 * processo. Só se lê o nó raiz da árvore de páginas (`/Type /Pages` + `/Count`) direto nos bytes, em tempo
 * linear no tamanho (limitado a 10 MB). PDFs 1.5+ guardam esses objetos em streams comprimidos
 * (`/Type /ObjStm`): eles são inflados com teto de saída. PDF cifrado ou fora do padrão devolve `null`.
 */
import { inflateSync } from "node:zlib";

export const LIMITE_CONTAGEM_BYTES = 10 * 1024 * 1024;
/** Orçamento TOTAL inflado (somando todos os object streams) e de quantidade de streams: proteção contra "bomba de descompressão". */
const LIMITE_INFLADO_BYTES = 8 * 1024 * 1024;
const MAX_STREAMS = 32;
const LIMITE_PAGINAS = 100_000;

const noPaginas = /\/Type\s*\/Pages(?![A-Za-z])/;
const contagem = /\/Count\s+(\d{1,9})(?!\d)/;
const cabecalhoObj = /(\d{1,9})\s+\d{1,5}\s+obj\b/;
const inicioStream = /\bstream\r?\n?/;

/** Só o que está no nível 1 do dicionário `<< ... >>` (dicionários aninhados saem). `null` se não abrir. */
function nivelUm(dic: string): string | null {
  const ini = dic.indexOf("<<");
  if (ini < 0) return null;
  let prof = 0;
  let saida = "";
  for (let i = ini; i < dic.length; i++) {
    const c = dic.charCodeAt(i);
    if (c === 60 && dic.charCodeAt(i + 1) === 60) { prof++; i++; continue; }
    if (c === 62 && dic.charCodeAt(i + 1) === 62) { prof--; i++; if (prof === 0) return saida; continue; }
    if (prof === 1) saida += dic[i];
  }
  return null; // não fechou
}

type Achados = { paginas: Map<number, number>; catalogos: Map<number, number>; raiz: number | null };

/** Registra um objeto (já sem o corpo de stream): nó de páginas com /Count, ou catálogo com /Pages N 0 R. */
function registrar(num: number, dic: string, a: Achados): void {
  const raso = nivelUm(dic);
  if (raso === null) return;
  if (noPaginas.test(raso)) {
    const m = raso.match(contagem);
    if (m) a.paginas.set(num, Number(m[1]));
  }
  const p = raso.match(/\/Pages\s+(\d{1,9})\s+\d{1,5}\s+R/);
  if (p && /\/Type\s*\/Catalog(?![A-Za-z])/.test(raso)) a.catalogos.set(num, Number(p[1]));
}

/** Objetos de um object stream já inflado: cabeçalho `num offset ...` e `/First`. */
function lerObjStm(dic: string, inflado: string, a: Achados): void {
  const n = Number(dic.match(/\/N\s+(\d{1,6})(?!\d)/)?.[1] ?? 0);
  const first = Number(dic.match(/\/First\s+(\d{1,9})(?!\d)/)?.[1] ?? 0);
  if (!n || !first || first > inflado.length) return;
  const nums = inflado.slice(0, first).trim().split(/\s+/).map(Number);
  for (let i = 0; i < n && 2 * i + 1 < nums.length; i++) {
    const ini = first + nums[2 * i + 1]!;
    const fim = 2 * i + 3 < nums.length ? first + nums[2 * i + 3]! : inflado.length;
    if (!(ini >= first && fim >= ini)) continue;
    registrar(nums[2 * i]!, inflado.slice(ini, fim), a);
  }
}

/** Percorre os objetos do arquivo; devolve `null` se estourar o orçamento de streams/bytes inflados. */
function varrer(texto: string): Achados | null {
  const a: Achados = { paginas: new Map(), catalogos: new Map(), raiz: null };
  const r = texto.match(/\/Root\s+(\d{1,9})\s+\d{1,5}\s+R/);
  let streams = 0;
  let inflado = 0;
  for (const bloco of texto.split("endobj")) {
    const cab = bloco.match(cabecalhoObj);
    if (!cab || cab.index === undefined) continue;
    const resto = bloco.slice(cab.index + cab[0].length);
    const corte = resto.search(inicioStream);
    const dic = corte >= 0 ? resto.slice(0, corte) : resto; // o corpo do stream (conteúdo de terceiros) nunca é lido como dicionário
    const num = Number(cab[1]);
    registrar(num, dic, a);
    if (corte < 0 || !/\/Type\s*\/ObjStm/.test(dic) || !dic.includes("FlateDecode")) continue;
    if (++streams > MAX_STREAMS) return null;
    const fim = resto.lastIndexOf("endstream");
    const dados = resto.slice(corte).replace(/^stream\r?\n?/, "");
    const bytes = Buffer.from(dados.slice(0, fim >= corte ? fim - corte : undefined), "latin1");
    const sobra = LIMITE_INFLADO_BYTES - inflado;
    if (sobra <= 0) return null;
    try {
      const buf = inflateSync(bytes, { maxOutputLength: sobra });
      inflado += buf.length;
      lerObjStm(dic, buf.toString("latin1"), a);
    } catch (e) {
      if ((e as { code?: string }).code === "ERR_BUFFER_TOO_LARGE") return null; // estourou o orçamento
      /* stream corrompido: ignora */
    }
  }
  a.raiz = r ? Number(r[1]) : null;
  return a;
}

export async function contarPaginasPdf(bytes: Uint8Array): Promise<number | null> {
  if (bytes.byteLength > LIMITE_CONTAGEM_BYTES) return null;
  try {
    const texto = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("latin1");
    if (!texto.includes("%PDF-")) return null;
    const a = varrer(texto);
    if (!a) return null;
    // Preferência: catálogo do /Root -> /Pages. Senão, o maior /Count entre nós de páginas válidos (a raiz soma todos).
    const pagRaiz = a.raiz !== null ? a.catalogos.get(a.raiz) : undefined;
    const doRoot = pagRaiz !== undefined ? a.paginas.get(pagRaiz) : undefined;
    const n = doRoot ?? Math.max(0, ...a.paginas.values());
    return n >= 1 && n <= LIMITE_PAGINAS ? n : null;
  } catch {
    return null;
  }
}
