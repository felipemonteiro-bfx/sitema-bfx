/**
 * Verificação do header `X-Hub-Signature-256` dos webhooks da Meta.
 *
 * O HMAC é calculado sobre os bytes exatos que a Meta enviou — o handler
 * precisa ler `await req.text()` e validar ANTES de qualquer parse; fazer
 * `req.json()` e re-serializar quebra a assinatura.
 *
 * Isto é a única barreira de autenticação da rota: `/api/webhooks` é isento do
 * middleware de sessão (ver `src/middleware.ts`).
 */
import { createHmac, timingSafeEqual } from "crypto";

const PREFIXO = "sha256=";

export function verificarAssinaturaMeta(
  rawBody: string,
  header: string | null | undefined,
  appSecret: string
): boolean {
  if (!header || !appSecret) return false;
  if (!header.startsWith(PREFIXO)) return false;

  const recebida = header.slice(PREFIXO.length);
  const esperada = createHmac("sha256", appSecret).update(rawBody).digest("hex");

  const bufRecebida = Buffer.from(recebida, "hex");
  const bufEsperada = Buffer.from(esperada, "hex");
  // timingSafeEqual lança se os tamanhos diferem — compara antes.
  if (bufRecebida.length !== bufEsperada.length) return false;

  return timingSafeEqual(bufRecebida, bufEsperada);
}
