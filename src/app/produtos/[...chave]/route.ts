import { NextResponse } from "next/server";
import { lerObjeto } from "@/lib/minio";
import { chavePublica } from "@/lib/storage-policy";

/** Raster que o navegador so desenha, sem executar nada. SVG fica de fora de proposito. */
const TIPOS_SERVIDOS_COMO_IMAGEM = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/avif"]);

/**
 * GET /produtos/<chave> — serve um objeto publico do bucket.
 *
 * POR QUE ISTO EXISTE
 *
 * `uploadToMinIO` devolve `${MINIO_PUBLIC_URL}/${MINIO_BUCKET}/${key}`, ou seja
 * `https://bfx.softlive.dev/produtos/<key>`, e essa URL vai para o banco e para
 * o `<img>` do navegador. Ate 2026-08-12 esse caminho era servido por uma regra
 * de Ingress que apontava para o `bfx-minio`. Aquele MinIO saiu na consolidacao
 * dos Garages (replicas=0) e o app passou a gravar em `garage.hiper:3900`, mas
 * a regra ficou apontando para o Service vazio — 503 em toda imagem. Nao doia
 * ainda so porque o bucket estava com zero objeto; o primeiro upload e que
 * quebraria.
 *
 * POR QUE NO APP, E NAO ABRINDO O BUCKET
 *
 * A saida obvia seria repontar o Ingress para o Garage com leitura anonima. Nao
 * da: o bucket `produtos` nao guarda so imagem. Tem tambem
 * `recibos/assinado-<venda>-<ts>.pdf` e `relatorios/mensal/<periodo>/<empresa>`,
 * cujas chaves sao adivinhaveis. Abrir o bucket publicaria recibo assinado e
 * relatorio de vendas junto com as fotos.
 *
 * Servindo daqui, a credencial continua sendo a do app (`app-bfx`, RWO so em
 * `produtos`), nada fica anonimo, e `chavePublica()` decide o que sai — por
 * allowlist, entao prefixo novo nasce negado.
 *
 * 404 tambem para chave negada, de proposito: 403 confirmaria que o objeto
 * existe.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ chave: string[] }> },
) {
  const { chave } = await params;

  // O Next entrega cada segmento percent-encoded; a chave real e a juncao dos
  // segmentos decodificados (nome de arquivo com espaco/acento vira %20/%C3%A3).
  let alvo: string;
  try {
    alvo = chave.map((s) => decodeURIComponent(s)).join("/");
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  if (!chavePublica(alvo)) {
    return new NextResponse(null, { status: 404 });
  }

  const obj = await lerObjeto(alvo);
  if (!obj) {
    return new NextResponse(null, { status: 404 });
  }

  // So imagem raster sai como imagem. Ate 2026-09-11 o upload gravava o
  // Content-Type que o navegador mandasse: objeto antigo pode estar como HTML
  // ou SVG, e servido daqui rodaria script no dominio do app — esse sai como
  // download. A CSP com sandbox cobre o que escapar.
  const tipo = obj.contentType.split(";")[0].trim().toLowerCase();
  const ehImagem = TIPOS_SERVIDOS_COMO_IMAGEM.has(tipo);
  const headers = new Headers({
    "Content-Type": ehImagem ? obj.contentType : "application/octet-stream",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    // Imagem de produto e logo sao imutaveis na pratica: a chave carrega
    // `Date.now()`, entao trocar a imagem gera chave nova.
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });
  if (!ehImagem) headers.set("Content-Disposition", "attachment");
  if (obj.contentLength !== null) headers.set("Content-Length", String(obj.contentLength));
  if (obj.etag) headers.set("ETag", obj.etag);
  if (obj.lastModified) headers.set("Last-Modified", obj.lastModified.toUTCString());

  return new NextResponse(obj.corpo, { status: 200, headers });
}
