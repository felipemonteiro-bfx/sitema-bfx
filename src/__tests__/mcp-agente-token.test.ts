import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { decodeJwt, decodeProtectedHeader } from "jose";

vi.mock("@/lib/db", () => ({ prisma: {} }));

const SEGREDO = "segredo-mcp-de-teste-com-mais-de-32-caracteres";
const { assinarTokenMcp } = await import("@/lib/mcp-agente-token");
const { verificarToken } = await import("@/lib/mcp-agente");

beforeEach(() => {
  process.env.MCP_AGENTE_SECRET = SEGREDO;
  process.env.SESSION_SECRET = "sessao-totalmente-diferente-do-segredo-mcp-32+";
});

describe("assinarTokenMcp", () => {
  it("assina HS256 com sub=telefone, aud=mcp-bfx, nome e exp de 5 minutos", async () => {
    const token = (await assinarTokenMcp("5592999990000", "Maria")) ?? "";
    expect(decodeProtectedHeader(token).alg).toBe("HS256");
    const p = decodeJwt(token);
    expect(p.sub).toBe("5592999990000");
    expect(p.aud).toBe("mcp-bfx");
    expect(p.nome).toBe("Maria");
    expect(p.exp! - p.iat!).toBe(300);
  });

  it("omite o claim nome quando não há nome", async () => {
    expect(decodeJwt((await assinarTokenMcp("5592999990000")) ?? "").nome).toBeUndefined();
  });

  it("o servidor MCP aceita o token e devolve telefone e nome", async () => {
    const token = await assinarTokenMcp("5592999990000", "Maria");
    expect(await verificarToken(`Bearer ${token}`)).toEqual({ telefone: "5592999990000", nomeNoWhatsapp: "Maria" });
  });

  it("sem MCP_AGENTE_SECRET (ou curto) não assina: devolve null, nunca cai em SESSION_SECRET", async () => {
    delete process.env.MCP_AGENTE_SECRET;
    expect(await assinarTokenMcp("5592999990000")).toBeNull();
    process.env.MCP_AGENTE_SECRET = "curto";
    expect(await assinarTokenMcp("5592999990000")).toBeNull();
  });

  it("não usa createSessionToken nem SESSION_SECRET no código", () => {
    const fonte = readFileSync("src/lib/mcp-agente-token.ts", "utf8");
    expect(fonte).not.toContain("createSessionToken");
    expect(fonte).not.toContain("SESSION_SECRET");
  });
});
