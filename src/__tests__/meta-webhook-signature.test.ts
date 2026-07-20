import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verificarAssinaturaMeta } from "@/lib/meta-webhook-signature";

const SECRET = "app-secret-123";
const body = JSON.stringify({ entry: [{ id: "1" }] });
const assinaturaValida = "sha256=" + createHmac("sha256", SECRET).update(body).digest("hex");

describe("verificarAssinaturaMeta", () => {
  it("aceita assinatura válida", () => {
    expect(verificarAssinaturaMeta(body, assinaturaValida, SECRET)).toBe(true);
  });

  it("rejeita corpo adulterado", () => {
    const adulterado = JSON.stringify({ entry: [{ id: "2" }] });
    expect(verificarAssinaturaMeta(adulterado, assinaturaValida, SECRET)).toBe(false);
  });

  it("rejeita segredo errado", () => {
    expect(verificarAssinaturaMeta(body, assinaturaValida, "outro")).toBe(false);
  });

  it("rejeita header ausente", () => {
    expect(verificarAssinaturaMeta(body, null, SECRET)).toBe(false);
    expect(verificarAssinaturaMeta(body, undefined, SECRET)).toBe(false);
    expect(verificarAssinaturaMeta(body, "", SECRET)).toBe(false);
  });

  it("rejeita header sem o prefixo sha256=", () => {
    const semPrefixo = createHmac("sha256", SECRET).update(body).digest("hex");
    expect(verificarAssinaturaMeta(body, semPrefixo, SECRET)).toBe(false);
  });

  it("rejeita hex de tamanho diferente sem lançar", () => {
    expect(verificarAssinaturaMeta(body, "sha256=abcd", SECRET)).toBe(false);
  });

  it("rejeita quando o appSecret está vazio", () => {
    expect(verificarAssinaturaMeta(body, assinaturaValida, "")).toBe(false);
  });
});
