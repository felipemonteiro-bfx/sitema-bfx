/**
 * Carrega os bytes da logo a partir de `Config.logoPath`, suportando os dois
 * formatos que convivem no banco (Fase 5 — D-01/D-03):
 *  - URL absoluta (http/https) gravada pelo novo writer via MinIO -> fetch.
 *  - Caminho legado `/uploads/...` gravado pelo writer antigo -> readFile local.
 *
 * A logo e sempre opcional: qualquer falha (fetch nao-ok, ENOENT, excecao)
 * devolve null em vez de propagar erro para os leitores (recibo, catalogo, etc).
 */

import { readFile } from "fs/promises";
import path from "path";
import { resolverOrigemLogo, extensaoLogo } from "@/lib/storage-policy";

export type LogoCarregado = { bytes: Buffer; ext: string };

export async function carregarLogo(
  logoPath: string | null | undefined
): Promise<LogoCarregado | null> {
  if (!logoPath) return null;

  const ext = extensaoLogo(logoPath);
  const origem = resolverOrigemLogo(logoPath);

  try {
    if (origem.tipo === "url") {
      const res = await fetch(origem.url);
      if (!res.ok) return null;
      const bytes = Buffer.from(await res.arrayBuffer());
      return { bytes, ext };
    }

    const bytes = await readFile(path.join(process.cwd(), "public", origem.caminhoRelativo));
    return { bytes, ext };
  } catch {
    return null;
  }
}
