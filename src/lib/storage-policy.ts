/**
 * Politica de storage do logo (Fase 5 — STO-03/STO-04).
 *
 * Modulo PURO: zero imports (nem builtins, nem "@/lib/..."). Isso permite
 * verificacao local via `node --input-type=module -e "..."` neste ambiente,
 * onde alias "@/" e imports externos falham com ERR_MODULE_NOT_FOUND fora do
 * bundler do Next.js. Ver 05-CONTEXT.md e environment_constraints do plano.
 */

export const LOGO_PREFIX = "logo/";

export type EnvLike = Record<string, string | undefined>;

export function storageConfigurado(env: EnvLike): boolean {
  return !!(env.MINIO_ENDPOINT && env.MINIO_ACCESS_KEY && env.MINIO_SECRET_KEY);
}

export function exigeStorageDuravel(env: EnvLike): boolean {
  return env.NODE_ENV === "production";
}

export function deveRecusarUpload(env: EnvLike): boolean {
  return exigeStorageDuravel(env) && !storageConfigurado(env);
}

export function sanitizarNomeArquivo(nome: string): string {
  return nome.replace(/[^A-Za-z0-9._-]+/g, "-");
}

export function montarChaveLogo(nomeArquivo: string, agoraMs: number): string {
  return `${LOGO_PREFIX}${agoraMs}-${sanitizarNomeArquivo(nomeArquivo)}`;
}

/**
 * O bucket `produtos` NAO e so de imagem. Hoje ele recebe quatro coisas:
 *
 *   <ts>-<nome>                       imagem de produto  (URL guardada e exibida)
 *   logo/<ts>-<nome>                  logo da empresa    (URL guardada e exibida)
 *   recibos/assinado-<venda>-<ts>.pdf recibo assinado    (URL DESCARTADA)
 *   relatorios/mensal/<per>/<id>.pdf  relatorio mensal   (URL DESCARTADA)
 *
 * Os dois ultimos sao copia redundante: o recibo autoritativo esta na tabela
 * `Documento` e o relatorio e regenerado no download. Ninguem busca essas
 * chaves por HTTP — e elas nao podem ser servidas ao publico, porque a chave e
 * adivinhavel (id da venda, periodo + id da empresa).
 *
 * Por isso a regra e ALLOWLIST, nao blocklist: chave nova cai em negado por
 * padrao. Acrescentar prefixo aqui e uma decisao consciente de publicar.
 */
export function chavePublica(chave: string): boolean {
  if (!chave) return false;
  // Path traversal e chave absoluta nunca passam, mesmo que o resto casasse.
  if (chave.includes("..") || chave.startsWith("/")) return false;
  // Segmento vazio ("a//b") vira caminho ambiguo no S3; recusa.
  if (chave.includes("//")) return false;

  const barras = chave.split("/").length - 1;
  // Imagem de produto: chave na raiz do bucket, sem prefixo nenhum.
  if (barras === 0) return true;
  // Logo: exatamente um nivel sob `logo/`.
  if (barras === 1 && chave.startsWith(LOGO_PREFIX)) {
    return chave.length > LOGO_PREFIX.length;
  }
  return false;
}

export function ehUrlAbsoluta(logoPath: string): boolean {
  return logoPath.startsWith("http://") || logoPath.startsWith("https://");
}

export type OrigemLogo =
  | { tipo: "url"; url: string }
  | { tipo: "arquivo"; caminhoRelativo: string };

export function resolverOrigemLogo(logoPath: string): OrigemLogo {
  if (ehUrlAbsoluta(logoPath)) {
    return { tipo: "url", url: logoPath };
  }
  const caminhoRelativo = logoPath.startsWith("/") ? logoPath.slice(1) : logoPath;
  return { tipo: "arquivo", caminhoRelativo };
}

/**
 * Resolve o `src` de navegador (next/image) para o logo, tratando os dois
 * formatos que convivem em `Config.logoPath` (Fase 5 — D-01/D-03).
 *
 * URL absoluta (http/https) e devolvida intacta — este e o bug real de hoje
 * em `logo-upload-form.tsx`, que prefixava uma barra em qualquer valor sem
 * barra inicial, transformando a URL absoluta num caminho relativo invalido
 * (`/http://...`). Caminho legado ganha a barra inicial quando ausente;
 * entrada vazia devolve vazio.
 */
export function logoSrcParaBrowser(logoPath: string): string {
  if (!logoPath) return "";
  if (ehUrlAbsoluta(logoPath)) return logoPath;
  return logoPath.startsWith("/") ? logoPath : `/${logoPath}`;
}

export function extensaoLogo(logoPath: string): string {
  const semQuery = logoPath.split("?")[0].split("#")[0];
  const partesBarra = semQuery.split("/");
  const ultimoSegmento = partesBarra[partesBarra.length - 1] ?? "";
  const partesPonto = ultimoSegmento.split(".");
  if (partesPonto.length < 2) return "";
  const ext = partesPonto[partesPonto.length - 1];
  if (!ext) return "";
  return `.${ext.toLowerCase()}`;
}
