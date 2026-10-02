import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fonteCustoEnvioNaCriacao, decidirGravacaoCustoEnvio } from "@/lib/uber-custo-entrega";

describe("fonteCustoEnvioNaCriacao", () => {
  it("frete cotado na Uber com custo digitado nasce provisorio", () => {
    expect(fonteCustoEnvioNaCriacao({ envio: 18, freteViaUber: true })).toBe("uber_provisorio");
  });
  it("sem a marca da Uber a fonte fica nula (como antes)", () => {
    expect(fonteCustoEnvioNaCriacao({ envio: 18, freteViaUber: false })).toBeNull();
  });
  it("marca da Uber sem custo de envio nao grava fonte", () => {
    expect(fonteCustoEnvioNaCriacao({ envio: 0, freteViaUber: true })).toBeNull();
  });
});

describe("captura do custo real da Uber sobre venda criada com custo provisorio", () => {
  it("custo provisorio digitado pode ser sobrescrito pela captura", () => {
    const d = decidirGravacaoCustoEnvio({
      custoEnvioAtual: 18,
      fonteAtual: fonteCustoEnvioNaCriacao({ envio: 18, freteViaUber: true }),
      novoCusto: 21.4,
      novoDefinitivo: true,
    });
    expect(d.gravar).toBe(true);
  });
  it("custo manual sem marca continua protegido (409)", () => {
    const d = decidirGravacaoCustoEnvio({
      custoEnvioAtual: 18,
      fonteAtual: fonteCustoEnvioNaCriacao({ envio: 18, freteViaUber: false }),
      novoCusto: 21.4,
      novoDefinitivo: true,
    });
    expect(d.gravar).toBe(false);
  });
});

describe("adocao", () => {
  it("criarVendaV2 grava a fonte e o form manda a marca so quando o frete veio da Uber", () => {
    const actions = readFileSync("src/app/(app)/venda-rapida/actions.ts", "utf8");
    expect(actions.includes("fonteCustoEnvioNaCriacao(")).toBe(true);
    const form = readFileSync("src/components/venda-rapida-form-v2.tsx", "utf8");
    expect(form.includes('"freteViaUber"')).toBe(true);
  });
});
