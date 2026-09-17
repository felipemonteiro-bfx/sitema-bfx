import { createHash, timingSafeEqual } from "crypto";

/**
 * Compara um segredo recebido com o esperado em tempo constante. Esperado vazio ou recebido
 * ausente é sempre falso: rota protegida por segredo fica fechada quando ele não está configurado.
 * Hash antes de comparar para `timingSafeEqual` receber buffers do mesmo tamanho sem vazar o
 * comprimento do segredo.
 */
export function segredoIgual(recebido: string | null | undefined, esperado: string | null | undefined): boolean {
  if (!recebido || !esperado) return false;
  const a = createHash("sha256").update(recebido).digest();
  const b = createHash("sha256").update(esperado).digest();
  return timingSafeEqual(a, b);
}

/**
 * Autorização das rotas `/api/cron/*` (`Authorization: Bearer <CRON_SECRET>`). Fechada: sem
 * `CRON_SECRET` definido nega tudo — antes as rotas passavam quando o segredo estava vazio.
 */
export function autorizarCron(req: Request): boolean {
  const header = req.headers.get("authorization") ?? "";
  const recebido = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  return segredoIgual(recebido, process.env.CRON_SECRET);
}
