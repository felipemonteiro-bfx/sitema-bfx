/**
 * Peças da prévia de link (og-card) do atendimento: parser de <meta>, URL assinada do proxy de
 * imagem, detecção de imagem por magic bytes, cache LRU e limitador. Tudo puro/em memória.
 *
 * Tudo que vem da página alheia (título, descrição, site, imagem) é TEXTO: o parser decodifica
 * entidades uma única vez e a UI nunca usa `innerHTML`.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

// ---------------------------------------------------------------------------------------------
// Parser de meta
// ---------------------------------------------------------------------------------------------

export type MetaPagina = { titulo: string; descricao: string; site: string; imagem: string | null; larga: boolean };

const ENTIDADES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", copy: "©", reg: "®", middot: "·", bull: "•", eacute: "é",
};

/** Decodifica entidades básicas em UMA passada (nada de dupla decodificação). */
function decodificar(s: string): string {
  return s.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,8});/gi, (todo, nome: string) => {
    if (nome.startsWith("#")) {
      const cp = nome[1]!.toLowerCase() === "x" ? parseInt(nome.slice(2), 16) : parseInt(nome.slice(1), 10);
      if (!Number.isFinite(cp) || cp <= 0 || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) return "";
      return String.fromCodePoint(cp);
    }
    return ENTIDADES[nome.toLowerCase()] ?? todo;
  });
}

/** Remove controles e caracteres de direção (spoofing), colapsa espaço e trunca por pontos de código. */
function limpar(s: string, max: number): string {
  const t = s
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const pontos = Array.from(t);
  return pontos.length <= max ? t : `${pontos.slice(0, max - 1).join("").trimEnd()}…`;
}

const MAX_CABECA = 256 * 1024;
const MAX_TAGS = 300;

function atributos(tag: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const a of tag.slice(0, 4096).matchAll(/([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    const nome = a[1]!.toLowerCase();
    if (!m.has(nome)) m.set(nome, a[2] ?? a[3] ?? a[4] ?? "");
  }
  return m;
}

function urlHttp(bruta: string, base: string): string | null {
  const t = bruta.trim();
  if (!t || t.length > 2048) return null;
  try {
    const u = new URL(t, base);
    if ((u.protocol !== "http:" && u.protocol !== "https:") || u.username || u.password) return null;
    return u.href;
  } catch {
    return null;
  }
}

export function extrairMeta(html: string, urlFinal: string): MetaPagina {
  const trecho = html.slice(0, MAX_CABECA);
  const meta = new Map<string, string>();
  // Varredura linear: cada <meta vai até o primeiro ">" e as ocorrências dentro dele são puladas.
  let ate = -1;
  let n = 0;
  for (const m of trecho.matchAll(/<meta\b/gi)) {
    const ini = m.index ?? 0;
    if (ini < ate) continue;
    const fim = trecho.indexOf(">", ini);
    if (fim < 0) break;
    ate = fim;
    if (++n > MAX_TAGS) break;
    const at = atributos(trecho.slice(ini + 5, fim));
    const chave = (at.get("property") ?? at.get("name") ?? "").trim().toLowerCase();
    const conteudo = at.get("content");
    if (chave && conteudo !== undefined && !meta.has(chave)) meta.set(chave, conteudo);
  }

  let tituloTag = "";
  const abre = trecho.match(/<title\b[^>]*>/i);
  if (abre && abre.index !== undefined) {
    const depois = trecho.slice(abre.index + abre[0].length, abre.index + abre[0].length + 2000);
    const fecha = depois.search(/<\/title/i);
    tituloTag = fecha >= 0 ? depois.slice(0, fecha) : depois;
  }

  const pega = (...chaves: string[]) => {
    for (const c of chaves) {
      const v = meta.get(c);
      if (v && v.trim()) return v;
    }
    return "";
  };
  const imagemBruta = pega("og:image", "og:image:url", "og:image:secure_url", "twitter:image", "twitter:image:src");
  const imagem = imagemBruta ? urlHttp(decodificar(imagemBruta), urlFinal) : null;
  const w = parseInt(pega("og:image:width"), 10);
  const h = parseInt(pega("og:image:height"), 10);
  const larga = imagem !== null && Number.isFinite(w) && Number.isFinite(h) && w >= 300 && h > 0 && w / h >= 1.4;

  return {
    titulo: limpar(decodificar(pega("og:title", "twitter:title") || tituloTag), 200),
    descricao: limpar(decodificar(pega("og:description", "twitter:description", "description")), 300),
    site: limpar(decodificar(pega("og:site_name")), 100),
    imagem,
    larga,
  };
}

// ---------------------------------------------------------------------------------------------
// URL assinada do proxy de imagem
// ---------------------------------------------------------------------------------------------

export const TTL_IMAGEM_MS = 24 * 60 * 60 * 1000;
const ROTA_IMAGEM = "/api/whatsapp/link-previa/imagem";

function chave(): Buffer {
  return createHmac("sha256", process.env.SESSION_SECRET || "dev-secret").update("link-previa-v1:").digest();
}
const assinatura = (exp: string, u: string) => createHmac("sha256", chave()).update(`${exp}.${u}`).digest("hex");

export function assinarImagem(urlImagem: string, agora = Date.now()): string {
  const exp = String(agora + TTL_IMAGEM_MS);
  return `${ROTA_IMAGEM}?u=${encodeURIComponent(urlImagem)}&exp=${exp}&sig=${assinatura(exp, urlImagem)}`;
}

/** Devolve a URL da imagem se a assinatura confere e não expirou; senão `null`. */
export function verificarImagem(u: string | null, exp: string | null, sig: string | null, agora = Date.now()): string | null {
  if (!u || !exp || !sig || !/^\d{1,15}$/.test(exp) || !/^[0-9a-f]{64}$/.test(sig)) return null;
  const esperado = Buffer.from(assinatura(exp, u), "hex");
  const recebido = Buffer.from(sig, "hex");
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return null;
  if (Number(exp) < agora) return null;
  return u;
}

/** Tipo pelo conteúdo (magic bytes). Só JPEG, PNG e WebP: nada de SVG nem GIF. */
export function detectarImagem(b: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length >= 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

// ---------------------------------------------------------------------------------------------
// Cache LRU e limitador
// ---------------------------------------------------------------------------------------------

export class CacheLru<T> {
  private mapa = new Map<string, { v: T; ate: number }>();
  constructor(private max: number, private now: () => number = Date.now) {}
  get size() { return this.mapa.size; }
  get(k: string): T | undefined {
    const e = this.mapa.get(k);
    if (!e) return undefined;
    if (e.ate < this.now()) { this.mapa.delete(k); return undefined; }
    this.mapa.delete(k);
    this.mapa.set(k, e); // o mais recente vai para o fim
    return e.v;
  }
  set(k: string, v: T, ttlMs: number) {
    this.mapa.delete(k);
    this.mapa.set(k, { v, ate: this.now() + ttlMs });
    while (this.mapa.size > this.max) this.mapa.delete(this.mapa.keys().next().value as string);
  }
}

export type Aquisicao = { ok: true; liberar: () => void } | { ok: false; motivo: "limite" | "ocupado" | "global" };

export class LimitadorPrevia {
  private janelas = new Map<number, number[]>();
  private voo = new Map<number, number>();
  private global = 0;
  private opts: { porMinuto: number; global: number; porUsuarioEmVoo: number; now: () => number };
  constructor(o: { porMinuto: number; global: number; porUsuarioEmVoo?: number; now?: () => number }) {
    this.opts = { porMinuto: o.porMinuto, global: o.global, porUsuarioEmVoo: o.porUsuarioEmVoo ?? 1, now: o.now ?? Date.now };
  }
  adquirir(usuario: number): Aquisicao {
    const agora = this.opts.now();
    const recentes = (this.janelas.get(usuario) ?? []).filter((t) => agora - t < 60_000);
    if (recentes.length >= this.opts.porMinuto) { this.janelas.set(usuario, recentes); return { ok: false, motivo: "limite" }; }
    if ((this.voo.get(usuario) ?? 0) >= this.opts.porUsuarioEmVoo) return { ok: false, motivo: "ocupado" };
    if (this.global >= this.opts.global) return { ok: false, motivo: "global" };
    recentes.push(agora);
    this.janelas.set(usuario, recentes);
    this.voo.set(usuario, (this.voo.get(usuario) ?? 0) + 1);
    this.global++;
    let liberado = false;
    return {
      ok: true,
      liberar: () => {
        if (liberado) return;
        liberado = true;
        this.global--;
        const v = (this.voo.get(usuario) ?? 1) - 1;
        if (v <= 0) this.voo.delete(usuario); else this.voo.set(usuario, v);
      },
    };
  }
}

/** Tenta adquirir vaga e, se só faltar concorrência (`ocupado`/`global`), espera até `maxMs`. */
export async function aguardarVaga(l: LimitadorPrevia, usuario: number, maxMs: number, passoMs = 100): Promise<Aquisicao> {
  const fim = Date.now() + maxMs;
  for (;;) {
    const r = l.adquirir(usuario);
    if (r.ok || r.motivo === "limite" || Date.now() >= fim) return r;
    await new Promise((ok) => setTimeout(ok, passoMs));
  }
}
