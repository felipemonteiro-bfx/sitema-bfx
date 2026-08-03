import { describe, it, expect } from "vitest";
import {
  LOGO_PREFIX,
  storageConfigurado,
  exigeStorageDuravel,
  deveRecusarUpload,
  sanitizarNomeArquivo,
  montarChaveLogo,
  ehUrlAbsoluta,
  resolverOrigemLogo,
  extensaoLogo,
} from "@/lib/storage-policy";

describe("storage-policy (STO-03/STO-04) — tabela de decisao pura", () => {
  it("LOGO_PREFIX e 'logo/'", () => {
    expect(LOGO_PREFIX).toBe("logo/");
  });

  it("storageConfigurado exige as tres vars MINIO", () => {
    expect(
      storageConfigurado({
        MINIO_ENDPOINT: "http://m:9000",
        MINIO_ACCESS_KEY: "a",
        MINIO_SECRET_KEY: "b",
      })
    ).toBe(true);
    expect(storageConfigurado({ MINIO_ENDPOINT: "http://m:9000" })).toBe(false);
    expect(storageConfigurado({})).toBe(false);
  });

  it("exigeStorageDuravel e true somente em NODE_ENV=production", () => {
    expect(exigeStorageDuravel({ NODE_ENV: "production" })).toBe(true);
    expect(exigeStorageDuravel({ NODE_ENV: "development" })).toBe(false);
    expect(exigeStorageDuravel({ NODE_ENV: "test" })).toBe(false);
    expect(exigeStorageDuravel({})).toBe(false);
  });

  it("deveRecusarUpload: producao + sem nenhuma var MINIO -> true", () => {
    expect(deveRecusarUpload({ NODE_ENV: "production" })).toBe(true);
  });

  it("deveRecusarUpload: producao + as tres vars MINIO -> false", () => {
    expect(
      deveRecusarUpload({
        NODE_ENV: "production",
        MINIO_ENDPOINT: "http://m:9000",
        MINIO_ACCESS_KEY: "a",
        MINIO_SECRET_KEY: "b",
      })
    ).toBe(false);
  });

  it("deveRecusarUpload: producao + so MINIO_ENDPOINT (configuracao parcial) -> true", () => {
    expect(
      deveRecusarUpload({ NODE_ENV: "production", MINIO_ENDPOINT: "http://m:9000" })
    ).toBe(true);
  });

  it("deveRecusarUpload: NODE_ENV=development sem MINIO -> false (fallback de disco liberado)", () => {
    expect(deveRecusarUpload({ NODE_ENV: "development" })).toBe(false);
  });

  it("deveRecusarUpload: NODE_ENV=test sem MINIO -> false", () => {
    expect(deveRecusarUpload({ NODE_ENV: "test" })).toBe(false);
  });

  it("sanitizarNomeArquivo troca sequencias fora de A-Za-z0-9._- por -", () => {
    expect(sanitizarNomeArquivo("Minha Logo.PNG")).toBe("Minha-Logo.PNG");
    expect(sanitizarNomeArquivo("logo (2)@final!.png")).toBe("logo-2-final-.png");
  });

  it("montarChaveLogo monta LOGO_PREFIX + timestamp + '-' + nome sanitizado", () => {
    expect(montarChaveLogo("Minha Logo.png", 1700000000000)).toBe(
      "logo/1700000000000-Minha-Logo.png"
    );
  });

  it("ehUrlAbsoluta reconhece http:// e https://, rejeita o resto", () => {
    expect(ehUrlAbsoluta("http://a/b.png")).toBe(true);
    expect(ehUrlAbsoluta("https://a/b.png")).toBe(true);
    expect(ehUrlAbsoluta("/uploads/x.png")).toBe(false);
    expect(ehUrlAbsoluta("ftp://a/b.png")).toBe(false);
  });

  it("resolverOrigemLogo distingue url absoluta de caminho legado", () => {
    expect(resolverOrigemLogo("https://h/logo/x.png")).toEqual({
      tipo: "url",
      url: "https://h/logo/x.png",
    });
    expect(resolverOrigemLogo("/uploads/1-logo.png")).toEqual({
      tipo: "arquivo",
      caminhoRelativo: "uploads/1-logo.png",
    });
  });

  it("extensaoLogo extrai extensao em minusculas, ignorando query/fragment", () => {
    expect(extensaoLogo("https://h/logo/x.PNG?v=2")).toBe(".png");
    expect(extensaoLogo("/uploads/x.jpeg#frag")).toBe(".jpeg");
    expect(extensaoLogo("/uploads/semext")).toBe("");
  });
});
