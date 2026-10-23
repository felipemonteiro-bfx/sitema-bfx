/**
 * Divide um texto em partes de texto e de link (só http/https e `www.`).
 *
 * Puro e sem DOM: serve à bolha (render) e ao composer (prévia). A URL de cada link passa por
 * `new URL` e só vale com esquema http(s), host e SEM credenciais. Nada é decodificado: o `href`
 * é o que o `URL` normaliza (percent-encoding preservado), nunca interpretado como HTML.
 */

export type ParteTexto = { tipo: 'texto'; texto: string };
export type ParteLink = { tipo: 'link'; texto: string; url: string };
export type Parte = ParteTexto | ParteLink;

/** Candidato: http(s):// ou www., colado em início de palavra (nada alfanumérico ou @ antes). */
const CANDIDATO = /(?<![A-Za-z0-9@])(?:https?:\/\/|www\.)[^\s<>]+/gi;
const PONTUACAO_FINAL = new Set(['.', ',', ';', ':', '!', '?', '"', "'"]);
const PARES: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
/** Teto de comprimento de um candidato: acima disso não vira link (evita URL monstruosa na tela). */
const MAX_URL = 2048;

function contar(s: string, c: string): number {
  let n = 0;
  for (const ch of s) if (ch === c) n++;
  return n;
}

/** Tira o que o autor quase certamente não quis na URL: pontuação final e fechamentos sem abertura. */
function aparar(bruto: string): string {
  let s = bruto;
  for (;;) {
    const ultimo = s.slice(-1);
    if (PONTUACAO_FINAL.has(ultimo)) {
      s = s.slice(0, -1);
      continue;
    }
    const abre = PARES[ultimo];
    if (abre && contar(s, ultimo) > contar(s, abre)) {
      s = s.slice(0, -1);
      continue;
    }
    return s;
  }
}

/** Devolve a URL normalizada se o texto for um link http(s) aceitável; senão `null`. */
export function urlSegura(texto: string): string | null {
  const t = texto.trim();
  if (!t || t.length > MAX_URL) return null;
  const comEsquema = /^https?:\/\//i.test(t) ? t : /^www\./i.test(t) ? `https://${t}` : null;
  if (!comEsquema) return null;
  let u: URL;
  try {
    u = new URL(comEsquema);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (u.username || u.password) return null;
  // Host precisa ter ao menos um caractere alfanumérico (recusa "https://." e similares).
  if (!/[A-Za-z0-9]/.test(u.hostname)) return null;
  return u.href;
}

export function partirTexto(texto: string): Parte[] {
  const partes: Parte[] = [];
  let cursor = 0;
  const juntar = (t: string) => {
    if (!t) return;
    const ultima = partes[partes.length - 1];
    if (ultima?.tipo === 'texto') ultima.texto += t;
    else partes.push({ tipo: 'texto', texto: t });
  };
  for (const m of texto.matchAll(CANDIDATO)) {
    const inicio = m.index ?? 0;
    const bruto = m[0];
    const exibido = aparar(bruto);
    const url = urlSegura(exibido);
    if (!url) continue; // fica como texto (será juntado ao trecho vizinho)
    juntar(texto.slice(cursor, inicio));
    partes.push({ tipo: 'link', texto: exibido, url });
    cursor = inicio + exibido.length;
  }
  juntar(texto.slice(cursor));
  return partes;
}

/** Prévia da lista: cada link vira "🔗 dominio.com" (sem esquema, "www." nem caminho); o resto do texto fica. */
export function linksComoDominio(texto: string): string {
  return partirTexto(texto)
    .map(p => (p.tipo === 'texto' ? p.texto : `🔗 ${new URL(p.url).hostname.replace(/^www\./i, '')}`))
    .join('');
}

/** Href validado da PRIMEIRA URL do texto, ou `null`. */
export function primeiraUrl(texto: string): string | null {
  for (const p of partirTexto(texto)) if (p.tipo === 'link') return p.url;
  return null;
}

/**
 * O composer manda `preview_url:true` por padrão. O X "Enviar sem prévia" guarda a URL dispensada;
 * só vale enquanto ela ainda for a primeira URL do texto (a que o WhatsApp usaria).
 */
export function enviarComPrevia(texto: string, dispensada: string | null): boolean {
  return !(dispensada !== null && primeiraUrl(texto) === dispensada);
}
