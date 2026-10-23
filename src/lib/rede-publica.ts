/**
 * Saída de rede para URLs de terceiros (prévia de link): só endereços públicos, conexão fixada.
 *
 * - `ipNaoPublico`: classifica IPv4/IPv6 (colchetes, IPv4 mapeado em hex, NAT64, 6to4, Teredo,
 *   multicast, reservados, CGNAT, link-local, loopback, privado). Entrada inválida FALHA FECHADO.
 * - `fetchPublicoPinado`: `node:http(s)` com `lookup` próprio. Resolve o nome, recusa se QUALQUER
 *   endereço não for público e entrega UM IP à conexão (sem segunda resolução: fecha o DNS
 *   rebinding). IP literal é checado antes. Redirect manual (até 3 saltos) revalidando esquema,
 *   porta, credencial e IP a cada salto. Sem cookies, sem Referer, `Accept-Encoding: identity`.
 */
import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import http from "node:http";
import https from "node:https";
import zlib from "node:zlib";
import { Readable } from "node:stream";

// ---------------------------------------------------------------------------------------------
// Classificação de IP
// ---------------------------------------------------------------------------------------------

function parseV4(s: string): number[] | null {
  const partes = s.split(".");
  if (partes.length !== 4) return null;
  const n: number[] = [];
  for (const p of partes) {
    if (!/^\d{1,3}$/.test(p) || (p.length > 1 && p.startsWith("0"))) return null;
    const v = Number(p);
    if (v > 255) return null;
    n.push(v);
  }
  return n;
}

function v4NaoPublico([a, b, c]: number[]): boolean {
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113)
  );
}

function parseV6(bruto: string): number[] | null {
  let s = bruto.toLowerCase();
  if (s.startsWith("[") && s.endsWith("]")) s = s.slice(1, -1);
  const zona = s.indexOf("%");
  if (zona >= 0) s = s.slice(0, zona);
  if (!s.includes(":")) return null;
  const pontos = s.lastIndexOf(".");
  if (pontos >= 0) {
    const corte = s.lastIndexOf(":");
    const v4 = parseV4(s.slice(corte + 1));
    if (!v4) return null;
    s = `${s.slice(0, corte + 1)}${((v4[0]! << 8) | v4[1]!).toString(16)}:${((v4[2]! << 8) | v4[3]!).toString(16)}`;
  }
  const dupla = s.split("::");
  if (dupla.length > 2) return null;
  const grupos = (t: string) => (t === "" ? [] : t.split(":"));
  const esq = grupos(dupla[0]!);
  const dir = dupla.length === 2 ? grupos(dupla[1]!) : [];
  const todos = [...esq, ...dir];
  if (todos.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  if (dupla.length === 1 ? esq.length !== 8 : esq.length + dir.length > 7) return null;
  const meio = dupla.length === 2 ? new Array<string>(8 - esq.length - dir.length).fill("0") : [];
  return [...esq, ...meio, ...dir].map((g) => parseInt(g, 16));
}

/** `true` para IP que não é público. Texto que não é IP também retorna `true` (falha fechado). */
export function ipNaoPublico(ip: string): boolean {
  const limpo = ip.trim();
  const v4 = parseV4(limpo);
  if (v4) return v4NaoPublico(v4);
  const g = parseV6(limpo);
  if (!g) return true;
  const [g0 = 0, g1 = 0, g2 = 0, g3 = 0, g4 = 0, g5 = 0, g6 = 0, g7 = 0] = g;
  // IPv4 mapeado (::ffff:a.b.c.d, inclusive a forma hex ::ffff:7f00:1): vale pelo IPv4.
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0xffff) {
    return v4NaoPublico([g6 >> 8, g6 & 255, g7 >> 8, g7 & 255]);
  }
  if (g0 === 0) return true; // ::, ::1, IPv4-compatível e o resto de ::/8 (reservado)
  if (g0 === 0x64 && g1 === 0xff9b) return true; // NAT64 (64:ff9b::/96 e 64:ff9b:1::/48)
  if (g0 === 0x2002) return true; // 6to4
  if (g0 === 0x2001 && (g1 === 0 || g1 === 0xdb8)) return true; // Teredo e documentação
  if (g0 === 0x100 && g1 === 0 && g2 === 0 && g3 === 0) return true; // descarte 100::/64
  if ((g0 & 0xfe00) === 0xfc00) return true; // ULA
  if ((g0 & 0xffc0) === 0xfe80 || (g0 & 0xffc0) === 0xfec0) return true; // link-local / site-local
  if ((g0 & 0xff00) === 0xff00) return true; // multicast
  return false;
}

// ---------------------------------------------------------------------------------------------
// Fetch pinado
// ---------------------------------------------------------------------------------------------

export type CodigoErroRede = "url_invalida" | "ip_nao_publico" | "dns" | "redirect" | "timeout" | "tipo" | "status" | "rede";

/** Erro com código estável e mensagem fixa: nunca carrega URL, cabeçalho nem corpo. */
export class ErroRedePublica extends Error {
  constructor(readonly codigo: CodigoErroRede) {
    super(`Rede pública: ${codigo}`);
    this.name = "ErroRedePublica";
  }
}

export type OpcoesFetch = {
  maxBytes: number;
  timeoutMs: number;
  /** Recebe o content-type (minúsculo, sem parâmetros); `false` recusa antes de ler o corpo. */
  aceitar: (contentType: string) => boolean;
};

export type RespostaPublica = {
  status: number;
  urlFinal: string;
  contentType: string;
  corpo: Buffer;
  /** `true` se o corpo passou de `maxBytes` e a leitura foi cortada. */
  truncado: boolean;
};

type Endereco = { address: string; family: number };

export type DepsFetch = {
  naoPublico?: (ip: string) => boolean;
  portaPermitida?: (porta: number) => boolean;
  resolver?: (host: string) => Promise<Endereco[]>;
};

const MAX_SALTOS = 3;
const REDIRECTS = new Set([301, 302, 303, 307, 308]);
const UA = "BFXLinkPreview/1.0";

function semColchetes(h: string): string {
  return h.startsWith("[") && h.endsWith("]") ? h.slice(1, -1) : h;
}

export function criarFetchPublico(deps: DepsFetch = {}) {
  const naoPublico = deps.naoPublico ?? ipNaoPublico;
  const portaPermitida = deps.portaPermitida ?? ((p: number) => p === 80 || p === 443);
  const resolver = deps.resolver ?? (async (h: string) => (await dnsLookup(h, { all: true })) as Endereco[]);

  /** Esquema, credencial e porta. Não resolve DNS. */
  function validar(u: URL): void {
    if (u.protocol !== "http:" && u.protocol !== "https:") throw new ErroRedePublica("url_invalida");
    if (u.username || u.password || !u.hostname) throw new ErroRedePublica("url_invalida");
    const porta = u.port ? Number(u.port) : u.protocol === "https:" ? 443 : 80;
    if (!portaPermitida(porta)) throw new ErroRedePublica("url_invalida");
  }

  /** Resolve e escolhe UM endereço; recusa se qualquer um dos resolvidos não for público. */
  async function escolherIp(host: string): Promise<Endereco> {
    const nome = semColchetes(host);
    if (isIP(nome)) {
      if (naoPublico(nome)) throw new ErroRedePublica("ip_nao_publico");
      return { address: nome, family: isIP(nome) };
    }
    let enderecos: Endereco[];
    try {
      enderecos = await resolver(nome);
    } catch {
      throw new ErroRedePublica("dns");
    }
    if (enderecos.length === 0) throw new ErroRedePublica("dns");
    if (enderecos.some((e) => naoPublico(e.address))) throw new ErroRedePublica("ip_nao_publico");
    return enderecos[0]!;
  }

  function umSalto(u: URL, alvo: Endereco, opts: OpcoesFetch, restanteMs: number) {
    return new Promise<{ status: number; location: string | null; contentType: string; corpo: Buffer; truncado: boolean }>((resolve, reject) => {
      const lib = u.protocol === "https:" ? https : http;
      let feito = false;
      const fim = (fn: () => void) => {
        if (feito) return;
        feito = true;
        clearTimeout(timer);
        fn();
      };
      const req = lib.request(
        {
          protocol: u.protocol,
          host: semColchetes(u.hostname),
          port: u.port || undefined,
          path: `${u.pathname}${u.search}`,
          method: "GET",
          agent: false,
          headers: {
            Host: u.host,
            "User-Agent": UA,
            Accept: "text/html,application/xhtml+xml,image/*;q=0.8",
            "Accept-Encoding": "identity",
          },
          // A conexão usa SEMPRE o IP já validado; o nome só vale para Host/SNI.
          lookup: (_h: string, o: unknown, cb: (...a: unknown[]) => void) => {
            if (o && typeof o === "object" && (o as { all?: boolean }).all) cb(null, [{ address: alvo.address, family: alvo.family }]);
            else cb(null, alvo.address, alvo.family);
          },
        } as https.RequestOptions,
        (res) => {
          const status = res.statusCode ?? 0;
          const location = typeof res.headers.location === "string" ? res.headers.location : null;
          if (REDIRECTS.has(status)) {
            res.resume();
            fim(() => resolve({ status, location, contentType: "", corpo: Buffer.alloc(0), truncado: false }));
            return;
          }
          const contentType = String(res.headers["content-type"] ?? "").split(";")[0]!.trim().toLowerCase();
          if (status < 200 || status >= 300) {
            res.destroy();
            fim(() => reject(new ErroRedePublica("status")));
            return;
          }
          if (!opts.aceitar(contentType)) {
            res.destroy();
            fim(() => reject(new ErroRedePublica("tipo")));
            return;
          }
          // Alguns servidores ignoram `identity` e comprimem mesmo assim: descomprime com teto no
          // corpo JÁ descomprimido (bomba de descompressão não passa de `maxBytes`).
          const enc = String(res.headers["content-encoding"] ?? "").trim().toLowerCase();
          let fonte: Readable = res;
          if (enc && enc !== "identity") {
            const dec = enc === "gzip" || enc === "x-gzip" ? zlib.createGunzip() : enc === "deflate" ? zlib.createInflate() : enc === "br" ? zlib.createBrotliDecompress() : null;
            if (!dec) {
              res.destroy();
              fim(() => reject(new ErroRedePublica("tipo")));
              return;
            }
            dec.on("error", () => fim(() => reject(new ErroRedePublica("rede"))));
            fonte = res.pipe(dec);
          }
          const partes: Buffer[] = [];
          let total = 0;
          fonte.on("data", (c: Buffer) => {
            if (feito) return;
            const sobra = opts.maxBytes - total;
            if (c.length > sobra) {
              // Passou do teto: guarda só o que cabe, corta a leitura e avisa.
              if (sobra > 0) partes.push(c.subarray(0, sobra));
              total += Math.max(sobra, 0);
              res.destroy();
              fonte.destroy();
              fim(() => resolve({ status, location: null, contentType, corpo: Buffer.concat(partes), truncado: true }));
              return;
            }
            partes.push(c);
            total += c.length;
          });
          fonte.on("end", () => fim(() => resolve({ status, location: null, contentType, corpo: Buffer.concat(partes), truncado: false })));
          res.on("error", () => fim(() => reject(new ErroRedePublica("rede"))));
          res.on("close", () => { if (fonte === res) fim(() => reject(new ErroRedePublica("rede"))); });
        },
      );
      const timer = setTimeout(() => {
        fim(() => reject(new ErroRedePublica("timeout")));
        req.destroy();
      }, Math.max(1, restanteMs));
      req.on("error", () => fim(() => reject(new ErroRedePublica("rede"))));
      req.end();
    });
  }

  return async function fetchPublico(urlInicial: string, opts: OpcoesFetch): Promise<RespostaPublica> {
    const inicio = Date.now();
    let u: URL;
    try {
      u = new URL(urlInicial);
    } catch {
      throw new ErroRedePublica("url_invalida");
    }
    for (let salto = 0; salto <= MAX_SALTOS; salto++) {
      validar(u);
      const restante = opts.timeoutMs - (Date.now() - inicio);
      if (restante <= 0) throw new ErroRedePublica("timeout");
      let timerDns: ReturnType<typeof setTimeout> | undefined;
      let alvo: Awaited<ReturnType<typeof escolherIp>>;
      try {
        alvo = await Promise.race([
          escolherIp(u.hostname),
          new Promise<never>((_, rej) => { timerDns = setTimeout(() => rej(new ErroRedePublica("timeout")), restante); timerDns.unref?.(); }),
        ]);
      } finally {
        if (timerDns) clearTimeout(timerDns);
      }
      const r = await umSalto(u, alvo, opts, opts.timeoutMs - (Date.now() - inicio));
      if (REDIRECTS.has(r.status)) {
        if (!r.location || salto === MAX_SALTOS) throw new ErroRedePublica("redirect");
        try {
          u = new URL(r.location, u);
        } catch {
          throw new ErroRedePublica("url_invalida");
        }
        continue;
      }
      return { status: r.status, urlFinal: u.href, contentType: r.contentType, corpo: r.corpo, truncado: r.truncado };
    }
    throw new ErroRedePublica("redirect");
  };
}

export const fetchPublicoPinado = criarFetchPublico();

/**
 * GET com a conexão fixada num IP JÁ validado por quem chama (sem segunda resolução de DNS). Devolve uma
 * `Response` com o corpo em fluxo e `redirect: manual` por construção (3xx volta como resposta). O nome do
 * host só vale para Host/SNI. Quem chama valida esquema, host, porta e IP, e impõe limites de bytes e tempo
 * (via `signal`).
 */
export function fetchComIpPinado(
  url: string,
  init: { headers?: Record<string, string>; signal?: AbortSignal; /** Sempre manual: 3xx volta como resposta. */ redirect?: "manual" },
  alvo: { address: string; family: number },
): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      reject(new ErroRedePublica("url_invalida"));
      return;
    }
    const modulo = u.protocol === "https:" ? https : u.protocol === "http:" ? http : null;
    if (!modulo) {
      reject(new ErroRedePublica("url_invalida"));
      return;
    }
    const req = modulo.request(
      {
        host: u.hostname,
        port: u.port ? Number(u.port) : u.protocol === "https:" ? 443 : 80,
        servername: isIP(semColchetes(u.hostname)) ? undefined : u.hostname,
        path: `${u.pathname}${u.search}`,
        method: "GET",
        agent: false,
        headers: { Host: u.host, "Accept-Encoding": "identity", ...(init.headers ?? {}) },
        signal: init.signal,
        lookup: (_h: string, o: unknown, cb: (...a: unknown[]) => void) => {
          if (o && typeof o === "object" && (o as { all?: boolean }).all) cb(null, [{ address: alvo.address, family: alvo.family }]);
          else cb(null, alvo.address, alvo.family);
        },
      } as https.RequestOptions,
      (res) => {
        const status = res.statusCode ?? 0;
        const cabecalhos = new Headers();
        for (const [k, v] of Object.entries(res.headers)) {
          if (v === undefined) continue;
          for (const item of Array.isArray(v) ? v : [v]) cabecalhos.append(k, item);
        }
        const semCorpo = status === 204 || status === 205 || status === 304 || status < 200;
        if (semCorpo) res.resume();
        resolve(new Response(semCorpo ? null : (Readable.toWeb(res) as unknown as ReadableStream<Uint8Array>), { status, headers: cabecalhos }));
      },
    );
    req.on("error", (e) => reject(e));
    req.end();
  });
}
