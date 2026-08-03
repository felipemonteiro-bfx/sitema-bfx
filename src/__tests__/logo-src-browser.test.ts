import { describe, it, expect } from "vitest";
import { logoSrcParaBrowser } from "@/lib/storage-policy";

describe("logoSrcParaBrowser", () => {
  it("URL absoluta https -> devolvida intacta, sem nenhuma barra acrescentada no inicio", () => {
    expect(logoSrcParaBrowser("https://bfx.softlive.dev/produtos/logo/1-x.png")).toBe(
      "https://bfx.softlive.dev/produtos/logo/1-x.png"
    );
  });

  it("URL absoluta http -> devolvida intacta", () => {
    expect(logoSrcParaBrowser("http://localhost:9000/produtos/logo/1-x.png")).toBe(
      "http://localhost:9000/produtos/logo/1-x.png"
    );
  });

  it("caminho legado com barra inicial -> devolvido intacto", () => {
    expect(logoSrcParaBrowser("/uploads/1-logo.png")).toBe("/uploads/1-logo.png");
  });

  it("caminho legado sem barra inicial -> ganha a barra", () => {
    expect(logoSrcParaBrowser("uploads/1-logo.png")).toBe("/uploads/1-logo.png");
  });

  it("entrada vazia -> devolve vazio", () => {
    expect(logoSrcParaBrowser("")).toBe("");
  });
});
