/**
 * Cliente da Graph API para mídia do WhatsApp (Meta Cloud API).
 *
 * - `obterInfoMidia`: id de entrada (webhook, vale 7 dias) -> URL temporária (vale ~5 min).
 * - `baixarConteudo`: baixa da URL com as defesas de SSRF/tamanho/integridade.
 * - `subirMidiaParaMeta` + `enviarMidia`: upload em `/media` e envio por id.
 *
 * As credenciais são lidas aqui, sem passar pelo master switch `whatsappAutoEnabled`
 * (que só governa o envio automático). Nenhum erro deste módulo carrega token, URL do
 * lookaside (traz `hash`) nem corpo cru da Meta: só código e mensagem fixa.
 */
import { lookup } from "node:dns/promises";
import { prisma } from "@/lib/db";
import { sha256Hex } from "@/lib/arquivo-financeiro";
import { fetchComIpPinado, ipNaoPublico } from "@/lib/rede-publica";
import { MetaProvider } from "@/lib/providers/whatsapp-meta";
import type { WhatsAppMedia, WhatsAppSendResult } from "@/lib/whatsapp-provider";
import { limiteMaximoEntrada, nomeSeguro, type TipoMidia } from "@/lib/whatsapp-midia-politica";

const HOST_GRAPH = "graph.facebook.com";
const HOST_CDN = "lookaside.fbsbx.com";
/** Sem receber nenhum byte por este tempo, o download é abortado (inatividade, não tempo total). */
const INATIVIDADE_PADRAO_MS = 20_000;
/** Teto total: base fixa + 1 s a cada 64 KB esperados (conexão lenta mas viva ainda termina). */
const TETO_BASE_MS = 30_000;
const TETO_BYTES_POR_SEGUNDO = 64 * 1024;
const TIMEOUT_CHAMADA_MS = 15_000;
const TIMEOUT_UPLOAD_MS = 60_000;
const MAX_SALTOS = 1;

export type CodigoErroMidia =
  | "sem_credenciais"
  | "media_id_invalido"
  | "midia_indisponivel"
  | "url_expirada"
  | "url_invalida"
  | "redirect_invalido"
  | "tamanho_excedido"
  | "sha_divergente"
  | "timeout"
  | "rede"
  | "falha_http"
  | "resposta_invalida"
  | "upload_falhou";

const MENSAGENS: Record<CodigoErroMidia, string> = {
  sem_credenciais: "Credenciais da Meta não configuradas.",
  media_id_invalido: "Identificador de mídia inválido.",
  midia_indisponivel: "Mídia indisponível na Meta.",
  url_expirada: "A URL da mídia expirou; peça uma nova.",
  url_invalida: "URL de mídia não permitida.",
  redirect_invalido: "Redirecionamento de mídia não permitido.",
  tamanho_excedido: "Mídia maior que o limite permitido.",
  sha_divergente: "O conteúdo baixado não confere com o hash informado.",
  timeout: "Tempo esgotado ao falar com a Meta.",
  rede: "Falha de rede ao falar com a Meta.",
  falha_http: "A Meta recusou a requisição de mídia.",
  resposta_invalida: "Resposta inesperada da Meta.",
  upload_falhou: "Falha ao enviar a mídia para a Meta.",
};

/** Erro com código estável e mensagem fixa (sem dados da requisição nem causa encadeada). */
export class ErroMidiaMeta extends Error {
  constructor(readonly codigo: CodigoErroMidia) {
    super(MENSAGENS[codigo]);
    this.name = "ErroMidiaMeta";
  }
}

export type CredenciaisMeta = { token: string; phoneNumberId: string; apiVersion: string };
export type InfoMidia = {
  mediaId: string;
  url: string;
  mime?: string;
  /** Hex minúsculo de 64 caracteres, quando a Meta informa. */
  sha256?: string;
  tamanho?: number;
};

function str(v: unknown): string | undefined {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > 0 ? s : undefined;
}

/** Token, phone_number_id e versão da API de `Config`/env; `null` se faltar token ou número. */
export async function credenciaisMeta(): Promise<CredenciaisMeta | null> {
  const cfg = (await prisma.config.findFirst()) as Record<string, unknown> | null;
  const token = str(cfg?.metaWhatsappToken) || str(process.env.META_WHATSAPP_TOKEN);
  const phoneNumberId = str(cfg?.metaWhatsappPhoneNumberId) || str(process.env.META_WHATSAPP_PHONE_NUMBER_ID);
  const apiVersion = str(cfg?.metaWhatsappApiVersion) || str(process.env.META_WHATSAPP_API_VERSION) || "v21.0";
  if (!token || !phoneNumberId) return null;
  return { token, phoneNumberId, apiVersion };
}

async function exigirCredenciais(): Promise<CredenciaisMeta> {
  const c = await credenciaisMeta();
  if (!c) throw new ErroMidiaMeta("sem_credenciais");
  return c;
}

const authz = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Garante https, host EXATO do CDN, sem credenciais embutidas e sem porta diferente de 443. */
function validarUrlCdn(bruta: string, codigo: "url_invalida" | "redirect_invalido", base?: URL): URL {
  let u: URL;
  try {
    u = new URL(bruta, base);
  } catch {
    throw new ErroMidiaMeta(codigo);
  }
  if (u.protocol !== "https:" || u.hostname !== HOST_CDN || u.username || u.password || u.port !== "") {
    throw new ErroMidiaMeta(codigo);
  }
  return u;
}

export { ipNaoPublico };

/**
 * Resolve o host do CDN UMA vez, recusa se QUALQUER endereço não for público (SSRF por DNS) e devolve o
 * endereço escolhido: o download conecta nele (`fetchComIpPinado`), sem segunda resolução (fecha o DNS rebinding).
 */
async function exigirDnsPublico(host: string): Promise<{ address: string; family: number }> {
  let enderecos: Array<{ address: string; family: number }>;
  try {
    enderecos = await lookup(host, { all: true });
  } catch {
    throw new ErroMidiaMeta("rede");
  }
  if (enderecos.length === 0 || enderecos.some((e) => ipNaoPublico(e.address))) throw new ErroMidiaMeta("url_invalida");
  return enderecos[0]!;
}

/** Timeout (de `AbortSignal.timeout` ou do nosso controle) vira `timeout`; o resto, `rede`. */
function erroDeFetch(e: unknown): ErroMidiaMeta {
  const nome = (e as { name?: string } | null)?.name;
  return new ErroMidiaMeta(nome === "TimeoutError" || nome === "AbortError" ? "timeout" : "rede");
}

function normalizarSha(v: unknown): string | undefined {
  return typeof v === "string" && /^[0-9a-f]{64}$/i.test(v.trim()) ? v.trim().toLowerCase() : undefined;
}

/** GET do id de entrada: devolve a URL temporária e os metadados. 404 = `midia_indisponivel`. */
export async function obterInfoMidia(mediaId: string): Promise<InfoMidia> {
  if (!/^\d+$/.test(mediaId)) throw new ErroMidiaMeta("media_id_invalido");
  const cred = await exigirCredenciais();
  const endpoint = `https://${HOST_GRAPH}/${cred.apiVersion}/${mediaId}?phone_number_id=${encodeURIComponent(cred.phoneNumberId)}`;
  let res: Response;
  try {
    res = await fetch(endpoint, { method: "GET", headers: authz(cred.token), redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_CHAMADA_MS) });
    if (res.status >= 300 && res.status < 400) {
      // Um salto, só no mesmo host da Graph API (o token nunca vai para outro destino).
      const destino = res.headers.get("location");
      await res.body?.cancel().catch(() => {});
      let u: URL | null = null;
      try {
        u = destino ? new URL(destino, endpoint) : null;
      } catch {
        u = null;
      }
      if (!u || u.protocol !== "https:" || u.hostname !== HOST_GRAPH || u.username || u.password || u.port !== "") {
        throw new ErroMidiaMeta("redirect_invalido");
      }
      res = await fetch(u.href, { method: "GET", headers: authz(cred.token), redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_CHAMADA_MS) });
    }
  } catch (e) {
    if (e instanceof ErroMidiaMeta) throw e;
    throw erroDeFetch(e);
  }
  if (res.status >= 300 && res.status < 400) throw new ErroMidiaMeta("redirect_invalido");
  if (res.status === 404) throw new ErroMidiaMeta("midia_indisponivel");
  if (!res.ok) throw new ErroMidiaMeta("falha_http");
  const dados = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  const url = str(dados?.url);
  if (!url) throw new ErroMidiaMeta("resposta_invalida");
  const tamanho = Number(dados?.file_size);
  return {
    mediaId,
    url,
    mime: str(dados?.mime_type),
    sha256: normalizarSha(dados?.sha256),
    tamanho: Number.isFinite(tamanho) && tamanho >= 0 ? tamanho : undefined,
  };
}

/** Lê o corpo em pedaços e aborta ao passar do limite (não confia em Content-Length). */
async function lerLimitado(res: Response, limite: number, sinal: AbortSignal, aoReceber: () => void): Promise<Uint8Array> {
  const declarado = Number(res.headers.get("content-length"));
  if (Number.isFinite(declarado) && declarado > limite) {
    await res.body?.cancel().catch(() => {});
    throw new ErroMidiaMeta("tamanho_excedido");
  }
  if (!res.body) {
    const tudo = new Uint8Array(await res.arrayBuffer());
    aoReceber();
    if (tudo.length > limite) throw new ErroMidiaMeta("tamanho_excedido");
    return tudo;
  }
  const leitor = res.body.getReader();
  const pedacos: Uint8Array[] = [];
  let total = 0;
  // O aborto precisa interromper a leitura parada (corpo sem bytes), não só o fetch.
  const abortou = new Promise<never>((_, rej) => {
    const f = () => rej(Object.assign(new Error("abortado"), { name: "AbortError" }));
    if (sinal.aborted) f();
    else sinal.addEventListener("abort", f, { once: true });
  });
  abortou.catch(() => {});
  for (;;) {
    const { done, value } = await Promise.race([leitor.read(), abortou]);
    if (done) break;
    aoReceber();
    total += value.length;
    if (total > limite) {
      await leitor.cancel().catch(() => {});
      throw new ErroMidiaMeta("tamanho_excedido");
    }
    pedacos.push(value);
  }
  const saida = new Uint8Array(total);
  let pos = 0;
  for (const p of pedacos) {
    saida.set(p, pos);
    pos += p.length;
  }
  return saida;
}

/**
 * Baixa o conteúdo da URL temporária. Só `https://lookaside.fbsbx.com`, com no máximo um
 * redirecionamento revalidado no mesmo host, tempo máximo, corte por bytes lidos e sha256
 * conferido. 404 da URL = `url_expirada` (quem chama pede nova info).
 */
export async function baixarConteudo(
  info: InfoMidia,
  opcoes: { tipo: TipoMidia; limiteBytes?: number; inatividadeMs?: number; tetoMs?: number },
): Promise<{ bytes: Uint8Array; sha256: string; mime?: string }> {
  const limite = opcoes.limiteBytes ?? limiteMaximoEntrada(opcoes.tipo);
  let alvo = validarUrlCdn(info.url, "url_invalida");
  if (info.tamanho !== undefined && info.tamanho > limite) throw new ErroMidiaMeta("tamanho_excedido");
  const cred = await exigirCredenciais();

  // Dois relógios: inatividade (renovada a cada pedaço recebido) e teto total proporcional ao tamanho.
  const inatividadeMs = opcoes.inatividadeMs ?? INATIVIDADE_PADRAO_MS;
  const tetoMs = opcoes.tetoMs ?? TETO_BASE_MS + Math.ceil((info.tamanho ?? limite) / TETO_BYTES_POR_SEGUNDO) * 1000;
  const controle = new AbortController();
  let estourou = false;
  const estourar = () => {
    estourou = true;
    controle.abort();
  };
  let timerInatividade = setTimeout(estourar, inatividadeMs);
  const aoReceber = () => {
    clearTimeout(timerInatividade);
    timerInatividade = setTimeout(estourar, inatividadeMs);
  };
  const timerTeto = setTimeout(estourar, tetoMs);
  try {
    let saltos = 0;
    let res: Response;
    for (;;) {
      const ip = await exigirDnsPublico(alvo.hostname);
      res = await fetchComIpPinado(alvo.href, { headers: authz(cred.token), redirect: "manual", signal: controle.signal }, ip);
      if (res.status < 300 || res.status >= 400) break;
      await res.body?.cancel().catch(() => {});
      const destino = res.headers.get("location");
      if (saltos >= MAX_SALTOS || !destino) throw new ErroMidiaMeta("redirect_invalido");
      alvo = validarUrlCdn(destino, "redirect_invalido", alvo);
      saltos++;
    }
    if (res.status === 404 || res.status === 410) throw new ErroMidiaMeta("url_expirada");
    if (!res.ok) throw new ErroMidiaMeta("falha_http");
    aoReceber();
    const bytes = await lerLimitado(res, limite, controle.signal, aoReceber);
    const hash = sha256Hex(bytes);
    if (info.sha256 && info.sha256 !== hash) throw new ErroMidiaMeta("sha_divergente");
    return { bytes, sha256: hash, mime: info.mime };
  } catch (e) {
    if (e instanceof ErroMidiaMeta) throw e;
    throw new ErroMidiaMeta(estourou ? "timeout" : "rede");
  } finally {
    clearTimeout(timerInatividade);
    clearTimeout(timerTeto);
  }
}

/** Upload multipart em `/{phone-number-id}/media`; devolve o `uploadMediaId` (vale 30 dias). */
export async function subirMidiaParaMeta(bytes: Uint8Array, mime: string, nome: string): Promise<string> {
  const cred = await exigirCredenciais();
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", mime);
  form.append("file", new Blob([bytes as BlobPart], { type: mime }), nomeSeguro(nome));
  let res: Response;
  try {
    // Sem Content-Type: o boundary do multipart é definido pelo FormData.
    res = await fetch(`https://${HOST_GRAPH}/${cred.apiVersion}/${cred.phoneNumberId}/media`, {
      method: "POST",
      headers: authz(cred.token),
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_UPLOAD_MS),
    });
  } catch (e) {
    throw erroDeFetch(e);
  }
  if (!res.ok) throw new ErroMidiaMeta("upload_falhou");
  const dados = (await res.json().catch(() => null)) as { id?: unknown } | null;
  const id = str(dados?.id);
  if (!id) throw new ErroMidiaMeta("upload_falhou");
  return id;
}

/**
 * Envia uma mídia já enviada à Meta. Passa pelo `post()` do MetaProvider com
 * `freeServiceOnly`: fora da janela de 24 h nada é enviado.
 */
export async function enviarMidia(args: WhatsAppMedia & { para: string }): Promise<WhatsAppSendResult> {
  const cred = await credenciaisMeta();
  if (!cred) return { ok: false, error: "sem_credenciais", provider: "meta_cloud" };
  const provider = new MetaProvider({ ...cred, freeServiceOnly: true });
  const { para, ...media } = args;
  return provider.sendMedia(para, media);
}
