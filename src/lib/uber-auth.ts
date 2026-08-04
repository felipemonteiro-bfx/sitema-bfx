/**
 * OAuth client_credentials da Uber (Direct e Business) — mesmo endpoint,
 * escopo diferente por produto (skill uber-business-api). A Uber nao tem
 * refresh token: guardar um token estatico garante uma saida de ar
 * silenciosa quando ele vence (~30 dias). Este modulo troca
 * client_id/client_secret por um access_token sob demanda e cacheia em
 * memoria ate perto do vencimento — so client_id/client_secret ficam
 * persistidos (em Config), nunca um token.
 *
 * Corpo do POST e x-www-form-urlencoded — a Uber rejeita JSON no token
 * endpoint.
 *
 * Modulo com zero imports: usa so globais (fetch, URLSearchParams, Map,
 * console, Date), mesmo padrao de `src/lib/uber-quote-result.ts` — permite
 * verificar a logica pura (montar o corpo, decidir se o cache venceu) com
 * `node --input-type=module` nesta maquina, onde `vitest` nao roda (ver
 * CLAUDE.md).
 */

const UBER_TOKEN_URL = "https://auth.uber.com/oauth/v2/token";
// Renova antes do vencimento real para nao arriscar um token expirando no
// meio de uma chamada.
const MARGEM_SEGURANCA_SEGUNDOS = 120;
// Padrao documentado da Uber quando expires_in nao vem na resposta.
const EXPIRES_IN_PADRAO_SEGUNDOS = 2592000;

export type EscopoUber = "eats.deliveries" | "business.receipts";

/** Monta o corpo x-www-form-urlencoded do token request (JSON e rejeitado). */
export function montarCorpoTokenUber(
  clientId: string,
  clientSecret: string,
  scope: EscopoUber
): string {
  const params = new URLSearchParams();
  params.set("client_id", clientId);
  params.set("client_secret", clientSecret);
  params.set("grant_type", "client_credentials");
  params.set("scope", scope);
  return params.toString();
}

/**
 * Decide se um token em cache ja deve ser considerado expirado, com margem
 * de seguranca. `obtidoEmMs`/`agoraMs` em epoch ms; `expiresInSegundos` como
 * devolvido pela Uber.
 */
export function cacheTokenExpirado(
  obtidoEmMs: number,
  expiresInSegundos: number,
  agoraMs: number,
  margemSegundos: number = MARGEM_SEGURANCA_SEGUNDOS
): boolean {
  const expiraEmMs = obtidoEmMs + Math.max(0, expiresInSegundos - margemSegundos) * 1000;
  return agoraMs >= expiraEmMs;
}

/** Chave do cache em memoria: um token por client_id + escopo. */
export function chaveCacheTokenUber(clientId: string, scope: EscopoUber): string {
  return clientId + "::" + scope;
}

type TokenCacheEntry = { token: string; obtidoEmMs: number; expiresInSegundos: number };

const cacheTokensUber = new Map<string, TokenCacheEntry>();
// Requisicoes de refresh em voo, por chave — evita que N cotacoes simultaneas com cache
// frio disparem N POSTs paralelos no endpoint de token da Uber (limite documentado de
// 100 req/hora nesse endpoint; achado #2 da revisao de codigo).
const refreshEmVooUber = new Map<string, Promise<string>>();

/** Limpa o cache em memoria — usado nos testes para isolar casos. */
export function limparCacheTokenUber(): void {
  cacheTokensUber.clear();
  refreshEmVooUber.clear();
}

/**
 * Remove só a entrada de uma chave (client_id + escopo) — usado quando a Uber rejeita o
 * token em uso (401/403) para forçar renovação na próxima chamada, em vez de esperar o
 * cache vencer sozinho (achado #1 da revisão de código).
 */
export function limparEntradaCacheTokenUber(clientId: string, scope: EscopoUber): void {
  cacheTokensUber.delete(chaveCacheTokenUber(clientId, scope));
}

async function buscarTokenUber(clientId: string, clientSecret: string, scope: EscopoUber): Promise<string> {
  const corpo = montarCorpoTokenUber(clientId, clientSecret, scope);
  const res = await fetch(UBER_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: corpo,
  });

  if (!res.ok) {
    console.error("[uber-auth] OAuth falhou:", res.status);
    throw new Error("uber_oauth_falhou_" + res.status);
  }

  const dados = (await res.json()) as { access_token?: unknown; expires_in?: unknown };
  if (typeof dados.access_token !== "string" || !dados.access_token) {
    throw new Error("uber_oauth_resposta_invalida");
  }
  const expiresInSegundos =
    typeof dados.expires_in === "number" && dados.expires_in > 0
      ? dados.expires_in
      : EXPIRES_IN_PADRAO_SEGUNDOS;

  cacheTokensUber.set(chaveCacheTokenUber(clientId, scope), {
    token: dados.access_token,
    obtidoEmMs: Date.now(),
    expiresInSegundos,
  });
  return dados.access_token;
}

/**
 * Troca client_id/client_secret por um access_token, cacheando em memoria
 * ate perto do vencimento (`expires_in`, ~30 dias). Renova sozinho quando o
 * cache vence — nada expira na mao do usuario. Chamadas concorrentes com
 * cache frio compartilham a mesma requisicao em voo em vez de disparar uma
 * para cada.
 */
export async function obterTokenUber(
  clientId: string,
  clientSecret: string,
  scope: EscopoUber
): Promise<string> {
  const chave = chaveCacheTokenUber(clientId, scope);
  const emCache = cacheTokensUber.get(chave);
  const agora = Date.now();
  if (emCache && !cacheTokenExpirado(emCache.obtidoEmMs, emCache.expiresInSegundos, agora)) {
    return emCache.token;
  }

  const jaEmVoo = refreshEmVooUber.get(chave);
  if (jaEmVoo) return jaEmVoo;

  const promessa = buscarTokenUber(clientId, clientSecret, scope).finally(() => {
    refreshEmVooUber.delete(chave);
  });
  refreshEmVooUber.set(chave, promessa);
  return promessa;
}
