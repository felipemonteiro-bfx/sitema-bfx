// Autorizacao das rotas de cron fechada e sincronizacao de baixa no cron diario (2026-09-16).
//
// As 11 rotas /api/cron/* faziam `if (cronSecret && header !== ...)`: com CRON_SECRET vazio,
// qualquer um disparava campanha, relatorio e WhatsApp. Agora sem segredo nega tudo.
import { describe, it, expect, afterEach } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { autorizarCron, segredoIgual } from "@/lib/segredo";

const ORIGINAL = process.env.CRON_SECRET;
afterEach(() => {
  process.env.CRON_SECRET = ORIGINAL;
});

const req = (auth?: string) =>
  new Request("http://localhost/api/cron/x", { headers: auth ? { authorization: auth } : {} });

describe("segredoIgual", () => {
  it("so e verdadeiro com os dois presentes e iguais", () => {
    expect(segredoIgual("abc", "abc")).toBe(true);
    expect(segredoIgual("abc", "abd")).toBe(false);
    expect(segredoIgual("abc", "abcd")).toBe(false);
    expect(segredoIgual("", "")).toBe(false);
    expect(segredoIgual(null, "abc")).toBe(false);
    expect(segredoIgual("abc", undefined)).toBe(false);
  });
});

describe("autorizarCron", () => {
  it("sem CRON_SECRET nega, mesmo sem header", () => {
    delete process.env.CRON_SECRET;
    expect(autorizarCron(req())).toBe(false);
    expect(autorizarCron(req("Bearer "))).toBe(false);
  });

  it("com CRON_SECRET exige Bearer igual", () => {
    process.env.CRON_SECRET = "segredo-de-teste-123";
    expect(autorizarCron(req("Bearer segredo-de-teste-123"))).toBe(true);
    expect(autorizarCron(req("Bearer errado"))).toBe(false);
    expect(autorizarCron(req("segredo-de-teste-123"))).toBe(false);
    expect(autorizarCron(req())).toBe(false);
  });
});

describe("rotas de cron", () => {
  const base = join(process.cwd(), "src/app/api/cron");
  const rotas = readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(base, d.name, "route.ts"));

  it("todas usam autorizarCron e nenhuma mantem o padrao aberto", () => {
    expect(rotas.length).toBeGreaterThanOrEqual(11);
    for (const rota of rotas) {
      const fonte = readFileSync(rota, "utf8");
      expect({ rota, usa: fonte.includes("autorizarCron(") }).toEqual({ rota, usa: true });
      expect({ rota, aberto: fonte.includes("cronSecret &&") }).toEqual({ rota, aberto: false });
    }
  });

  it("parcela-vencida sincroniza as baixas do Asaas antes da checagem do WhatsApp", () => {
    const fonte = readFileSync(join(base, "parcela-vencida/route.ts"), "utf8");
    const sincroniza = fonte.indexOf("sincronizarBaixasAsaas(");
    const flag = fonte.indexOf("autoInadimplencia");
    expect(sincroniza).toBeGreaterThan(0);
    expect(sincroniza).toBeLessThan(flag);
  });
});
