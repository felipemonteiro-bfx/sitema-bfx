import { createHmac } from "crypto";

const SECRET = process.env.SESSION_SECRET || "dev-secret";

/**
 * Gera assinatura HMAC-SHA256 para link de recibo público.
 * Usado para permitir que clientes acessem o recibo via WhatsApp sem autenticação.
 */
export function signReciboId(id: number | string): string {
  const payload = String(id);
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

/**
 * Verifica se a assinatura do recibo é válida.
 */
export function verifyReciboSig(id: string, sig: string): boolean {
  if (!id || !sig) return false;
  const expected = signReciboId(id);
  return expected === sig;
}
