import { describe, it, expect } from "vitest";
import { montarEnviosVenda } from "@/lib/envios-venda";

const base = {
  nome: "Ana",
  vendaId: 42,
  baseUrl: "https://app.bfx",
  autoRecibo: true,
  autoBoleto: true,
  descontoEmFolha: false,
  assinaturaToken: null as string | null,
  boletoUrl: null as string | null,
  reciboSig: "SIG",
};

describe("montarEnviosVenda", () => {
  it("recibo simples: 1 envio de recibo com URL de recibo", () => {
    const out = montarEnviosVenda(base);
    expect(out).toHaveLength(1);
    expect(out[0].template).toBe("bfx_recibo");
    expect(out[0].params).toEqual(["Ana", "42", "https://app.bfx/api/recibo?id=42&sig=SIG"]);
  });

  it("desconto em folha + token: envio de assinatura com URL de assinatura", () => {
    const out = montarEnviosVenda({ ...base, descontoEmFolha: true, assinaturaToken: "TK" });
    expect(out).toHaveLength(1);
    expect(out[0].template).toBe("bfx_assinatura");
    expect(out[0].params).toEqual(["Ana", "42", "https://app.bfx/assinatura/TK"]);
  });

  it("desconto em folha SEM token: recibo com sufixo tipo=autorizacao", () => {
    const out = montarEnviosVenda({ ...base, descontoEmFolha: true, assinaturaToken: null });
    expect(out[0].template).toBe("bfx_recibo");
    expect(out[0].params[2]).toBe("https://app.bfx/api/recibo?id=42&sig=SIG&tipo=autorizacao");
  });

  it("recibo + boleto: 2 envios, recibo e depois boleto", () => {
    const out = montarEnviosVenda({ ...base, boletoUrl: "https://bank/boleto" });
    expect(out.map((e) => e.template)).toEqual(["bfx_recibo", "bfx_boleto"]);
    expect(out[1].params).toEqual(["Ana", "42", "https://bank/boleto"]);
  });

  it("autoRecibo off + boleto: só o envio de boleto", () => {
    const out = montarEnviosVenda({ ...base, autoRecibo: false, boletoUrl: "https://bank/boleto" });
    expect(out).toHaveLength(1);
    expect(out[0].template).toBe("bfx_boleto");
  });

  it("nada aplicável: lista vazia", () => {
    expect(montarEnviosVenda({ ...base, autoRecibo: false, autoBoleto: false })).toEqual([]);
    expect(montarEnviosVenda({ ...base, autoRecibo: false, boletoUrl: null })).toEqual([]);
  });
});
