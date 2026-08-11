import { scrypt as scryptCallback, randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";

// node:crypto — sem instalar pacote (D-04). Este modulo NUNCA pode ser
// importado por um componente 'use client': quem roda no browser importa
// @/lib/senha-politica, que nao importa nada de node:.

const scryptAsync = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number }
) => Promise<Buffer>;

export const PREFIXO_SCRYPT = "scrypt";

// Custo do scrypt: N=16384 (2^14), r=8, p=1, keylen=64 bytes, salt=16 bytes.
// Memoria usada por derivacao e' aproximadamente 128*N*r bytes = 16MB,
// abaixo do maxmem padrao de 32MB do Node — nao precisa passar `maxmem`.
const CUSTO_N = 16384;
const CUSTO_R = 8;
const CUSTO_P = 1;
const KEYLEN = 64;
const SALT_BYTES = 16;

function decodeBase64ComTamanho(valor: string, tamanhoEsperado: number): Buffer | null {
  if (typeof valor !== "string" || valor.length === 0) return null;
  const buf = Buffer.from(valor, "base64");
  if (buf.length !== tamanhoEsperado) return null;
  return buf;
}

/**
 * Deriva um hash scrypt com salt aleatorio por chamada. Formato
 * auto-descritivo, tudo no mesmo campo `password` do banco:
 * scrypt$N$r$p$salt-base64$hash-base64
 */
export async function hashSenha(plain: string): Promise<string> {
  const senha = String(plain).trim();
  const salt = randomBytes(SALT_BYTES);
  const derivado = await scryptAsync(senha, salt, KEYLEN, { N: CUSTO_N, r: CUSTO_R, p: CUSTO_P });
  return [
    PREFIXO_SCRYPT,
    CUSTO_N,
    CUSTO_R,
    CUSTO_P,
    salt.toString("base64"),
    derivado.toString("base64"),
  ].join("$");
}

/**
 * Valida a FORMA COMPLETA do valor armazenado: prefixo, 6 campos separados
 * por `$`, os tres campos de custo inteiros positivos, e as duas ultimas
 * partes decodificando de base64 com o tamanho esperado (salt=16 bytes,
 * hash=64 bytes). Sem regex — so `.split()` e checagem de tipo.
 */
export function ehHashScrypt(armazenado: string | null | undefined): boolean {
  if (!armazenado) return false;
  if (!armazenado.startsWith(`${PREFIXO_SCRYPT}$`)) return false;

  const partes = armazenado.split("$");
  if (partes.length !== 6) return false;

  const [prefixo, nStr, rStr, pStr, saltB64, hashB64] = partes;
  if (prefixo !== PREFIXO_SCRYPT) return false;

  const n = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  if (!Number.isInteger(n) || n <= 0) return false;
  if (!Number.isInteger(r) || r <= 0) return false;
  if (!Number.isInteger(p) || p <= 0) return false;

  const salt = decodeBase64ComTamanho(saltB64, SALT_BYTES);
  const hash = decodeBase64ComTamanho(hashB64, KEYLEN);
  if (!salt || !hash) return false;

  return true;
}

/**
 * Verifica a senha digitada contra o valor armazenado. Se o valor armazenado
 * estiver no formato scrypt valido, deriva com os parametros gravados e
 * compara em tempo constante. Se comecar com o prefixo do formato mas
 * estiver mal-formado, devolve false SEM cair no comparador legado
 * (T-CYM-04 — nunca faz downgrade para texto puro). Caso contrario, e' um
 * valor legado em texto puro: compara o digest sha256 (32 bytes fixos) dos
 * dois lados em tempo constante. Nunca lanca.
 */
export async function verificarSenha(
  plain: string,
  armazenado: string | null | undefined
): Promise<boolean> {
  if (!armazenado) return false;
  const senha = String(plain ?? "").trim();

  if (armazenado.startsWith(`${PREFIXO_SCRYPT}$`)) {
    if (!ehHashScrypt(armazenado)) return false;

    const [, nStr, rStr, pStr, saltB64, hashB64] = armazenado.split("$");
    const salt = Buffer.from(saltB64, "base64");
    const hashArmazenado = Buffer.from(hashB64, "base64");
    const derivado = await scryptAsync(senha, salt, hashArmazenado.length, {
      N: Number(nStr),
      r: Number(rStr),
      p: Number(pStr),
    });

    if (derivado.length !== hashArmazenado.length) return false;
    return timingSafeEqual(derivado, hashArmazenado);
  }

  // Caminho legado: compara o digest sha256 (tamanho fixo de 32 bytes) para
  // tempo constante independente do tamanho da senha digitada.
  const digestDigitado = createHash("sha256").update(senha).digest();
  const digestArmazenado = createHash("sha256").update(armazenado).digest();
  return timingSafeEqual(digestDigitado, digestArmazenado);
}

/**
 * Gasta o mesmo tempo de uma derivacao scrypt real sem verificar nada.
 * Usado pelo login quando o usuario nao existe, para nao dar pra distinguir
 * "usuario inexistente" de "senha errada" por tempo de resposta (T-CYM-03).
 */
export async function verificarSenhaFalsa(plain: string): Promise<false> {
  await hashSenha(plain);
  return false;
}
