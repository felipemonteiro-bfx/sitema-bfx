import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  vendaV2Schema,
  erroCustoEnvio,
  erroCustoEnvioNaEdicao,
  MSG_CUSTO_ENVIO_OBRIGATORIO,
  MSG_CUSTO_ENVIO_ENTREGA,
} from "@/lib/validations/venda";

const base = {
  data: "2026-10-02",
  vendedor: "Maria",
  clienteId: 1,
  entrega: false,
  frete: 0,
  envio: 0,
  parcelas: 1,
  temNota: false,
  taxaNota: 0,
  produtos: [{ produtoNome: "Notebook", custoProduto: 100, valorVenda: 200, quantidade: 1, subtotal: 200 }],
};

describe("erroCustoEnvio", () => {
  it("frete cobrado sem custo de envio e erro", () => {
    expect(erroCustoEnvio(30, 0)).toBe(MSG_CUSTO_ENVIO_OBRIGATORIO);
  });
  it("frete cobrado com custo de envio e valido", () => {
    expect(erroCustoEnvio(30, 18.5)).toBeNull();
  });
  it("retirada (frete 0 e envio 0) continua valida", () => {
    expect(erroCustoEnvio(0, 0)).toBeNull();
  });
  it("frete 0 com custo de envio informado e valido", () => {
    expect(erroCustoEnvio(0, 12)).toBeNull();
  });
});

describe("vendaV2Schema", () => {
  it("rejeita frete > 0 com envio 0, apontando o campo envio", () => {
    const r = vendaV2Schema.safeParse({ ...base, entrega: true, frete: 30, envio: 0 });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.path[0] === "envio");
      expect(issue?.message).toBe(MSG_CUSTO_ENVIO_ENTREGA);
    }
  });
  it("aceita frete > 0 com envio > 0", () => {
    expect(vendaV2Schema.safeParse({ ...base, entrega: true, frete: 30, envio: 18 }).success).toBe(true);
  });
  it("aceita retirada", () => {
    expect(vendaV2Schema.safeParse(base).success).toBe(true);
  });
});

describe("erroCustoEnvioNaEdicao", () => {
  const atual = { frete: 30, envio: 0 };
  it("venda antiga sem mexer em frete e envio continua salvando", () => {
    expect(erroCustoEnvioNaEdicao({ frete: 30, envio: 0 }, atual)).toBeNull();
  });
  it("mexer no frete sem informar o custo e erro", () => {
    expect(erroCustoEnvioNaEdicao({ frete: 45, envio: 0 }, atual)).toBe(MSG_CUSTO_ENVIO_OBRIGATORIO);
  });
  it("zerar o custo que existia, com frete cobrado, e erro", () => {
    expect(erroCustoEnvioNaEdicao({ frete: 30, envio: 0 }, { frete: 30, envio: 18 })).toBe(MSG_CUSTO_ENVIO_OBRIGATORIO);
  });
  it("informar o custo na venda antiga e valido", () => {
    expect(erroCustoEnvioNaEdicao({ frete: 30, envio: 20 }, atual)).toBeNull();
  });
  it("sem registro atual (null) aplica a regra cheia", () => {
    expect(erroCustoEnvioNaEdicao({ frete: 30, envio: 0 }, null)).toBe(MSG_CUSTO_ENVIO_OBRIGATORIO);
  });
});

describe("adocao nos pontos que gravam venda", () => {
  const ler = (p: string) => readFileSync(p, "utf8");

  it("a action legada de venda rapida recusa e registra a rejeicao", () => {
    const src = ler("src/app/(app)/venda-rapida/actions.ts");
    expect(src.includes("erroCustoEnvio(frete, envio)")).toBe(true);
  });
  it("a edicao usa a regra com comparacao contra o valor gravado", () => {
    const src = ler("src/app/(app)/historico/actions.ts");
    expect(src.includes("erroCustoEnvioNaEdicao(")).toBe(true);
    expect(src.includes("custoEnvio: true")).toBe(true);
  });
  it("o formulario bloqueia o submit com a mesma regra", () => {
    const src = ler("src/components/venda-rapida-form-v2.tsx");
    expect(src.includes("erroCustoEnvio(frete, envio)")).toBe(true);
  });
  it("as tools do chat (criar_venda e atualizar_venda) seguem a mesma regra", () => {
    const src = ler("src/lib/ai-actions.ts");
    expect(src.includes("erroCustoEnvio(valorFrete, custoEnvio)")).toBe(true);
    expect(src.includes("erroCustoEnvioNaEdicao(")).toBe(true);
  });
});
