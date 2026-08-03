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
import type { PDFDocument, PDFImage } from "pdf-lib";

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

/**
 * Unico ponto de embed de imagem em PDF (Fase 5, plano 05-03 — STO-05).
 * Carrega via `carregarLogo()` (que ja trata URL absoluta e caminho legado,
 * D-01/D-03) e embute com `embedPng`/`embedJpg` conforme a extensao. So
 * `.png`, `.jpg` e `.jpeg` sao suportados. Qualquer falha (carregamento,
 * extensao desconhecida, ou o proprio embed lancando) devolve null — a logo
 * (e, no catalogo, a imagem do produto) e sempre opcional para os chamadores.
 */
export async function embedLogoNoPdf(
  pdf: PDFDocument,
  logoPath: string | null | undefined
): Promise<PDFImage | null> {
  const carregado = await carregarLogo(logoPath);
  if (!carregado) return null;

  try {
    if (carregado.ext === ".png") return await pdf.embedPng(carregado.bytes);
    if (carregado.ext === ".jpg" || carregado.ext === ".jpeg") return await pdf.embedJpg(carregado.bytes);
    return null;
  } catch {
    return null;
  }
}
