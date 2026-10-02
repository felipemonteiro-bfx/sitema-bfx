import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  erroEntrega, erroEntregaNaEdicao, lerEntregaDoForm,
  MSG_ENTREGA_OBRIGATORIA, MSG_RETIRADA_COM_FRETE, MSG_CUSTO_ENVIO_ENTREGA,
  MSG_CUSTO_ENVIO_OBRIGATORIO,
  vendaV2Schema,
} from "@/lib/validations/venda";

describe("migration da coluna entrega", () => {
  it("adiciona so a coluna nullable, sem default nem NOT NULL", () => {
    const sql = readFileSync("prisma/migrations/20261002120000_add_venda_entrega/migration.sql", "utf8");
    expect(sql.includes('ADD COLUMN "entrega" BOOLEAN')).toBe(true);
    expect(sql.toUpperCase().includes("DEFAULT")).toBe(false);
    expect(sql.toUpperCase().includes("NOT NULL")).toBe(false);
  });
  it("o schema Prisma declara Venda.entrega como Boolean?", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    expect(schema.split("\n").some((l) => l.trim().startsWith("entrega") && l.includes("Boolean?"))).toBe(true);
  });
});

describe("erroEntrega (venda nova)", () => {
  it("sem escolha e erro, mesmo com frete e envio", () => {
    expect(erroEntrega({ entrega: undefined, frete: 0, envio: 0 })).toBe(MSG_ENTREGA_OBRIGATORIA);
    expect(erroEntrega({ entrega: null, frete: 30, envio: 18 })).toBe(MSG_ENTREGA_OBRIGATORIA);
  });
  it("entrega exige envio > 0 mesmo com frete 0", () => {
    expect(erroEntrega({ entrega: true, frete: 0, envio: 0 })).toBe(MSG_CUSTO_ENVIO_ENTREGA);
    expect(erroEntrega({ entrega: true, frete: 0, envio: Number.NaN })).toBe(MSG_CUSTO_ENVIO_ENTREGA);
    expect(erroEntrega({ entrega: true, frete: 0, envio: -5 })).toBe(MSG_CUSTO_ENVIO_ENTREGA);
  });
  it("entrega com envio > 0 e ok, com ou sem frete", () => {
    expect(erroEntrega({ entrega: true, frete: 0, envio: 12 })).toBeNull();
    expect(erroEntrega({ entrega: true, frete: 30, envio: 12 })).toBeNull();
  });
  it("retirada com frete cobrado e erro; retirada sem frete e ok", () => {
    expect(erroEntrega({ entrega: false, frete: 30, envio: 0 })).toBe(MSG_RETIRADA_COM_FRETE);
    expect(erroEntrega({ entrega: false, frete: 0, envio: 0 })).toBeNull();
  });
});

describe("erroEntregaNaEdicao", () => {
  const antigaNull = { entrega: null, frete: 30, envio: 0 };
  it("venda null sem mexer em nada salva", () => {
    expect(erroEntregaNaEdicao({ ...antigaNull }, antigaNull)).toBeNull();
  });
  it("venda null que segue null aplica so a regra do frete (piso da #37)", () => {
    expect(erroEntregaNaEdicao({ entrega: null, frete: 45, envio: 0 }, antigaNull)).toBe(MSG_CUSTO_ENVIO_OBRIGATORIO);
    expect(erroEntregaNaEdicao({ entrega: null, frete: 0, envio: 0 }, antigaNull)).toBeNull();
  });
  it("trocar null para entrega sem envio recusa; com envio ok", () => {
    expect(erroEntregaNaEdicao({ entrega: true, frete: 30, envio: 0 }, antigaNull)).toBe(MSG_CUSTO_ENVIO_ENTREGA);
    expect(erroEntregaNaEdicao({ entrega: true, frete: 30, envio: 20 }, antigaNull)).toBeNull();
  });
  it("trocar para retirada mantendo frete cobrado recusa", () => {
    expect(erroEntregaNaEdicao({ entrega: false, frete: 30, envio: 0 }, antigaNull)).toBe(MSG_RETIRADA_COM_FRETE);
  });
  it("venda ja marcada entrega: mudar so o frete exige o envio", () => {
    const atual = { entrega: true, frete: 0, envio: 15 };
    expect(erroEntregaNaEdicao({ entrega: true, frete: 10, envio: 0 }, atual)).toBe(MSG_CUSTO_ENVIO_ENTREGA);
  });
  it("sem registro atual aplica a regra de venda nova", () => {
    expect(erroEntregaNaEdicao({ entrega: null, frete: 0, envio: 0 }, null)).toBe(MSG_ENTREGA_OBRIGATORIA);
  });
});

describe("lerEntregaDoForm", () => {
  it("so aceita 1 e 0", () => {
    expect(lerEntregaDoForm("1")).toBe(true);
    expect(lerEntregaDoForm("0")).toBe(false);
    for (const v of ["on", "true", "", "2", " 1", null]) expect(lerEntregaDoForm(v)).toBeUndefined();
  });
});

const baseV2 = {
  data: "2026-10-02", vendedor: "Maria", clienteId: 1, frete: 0, envio: 0, parcelas: 1,
  temNota: false, taxaNota: 0,
  produtos: [{ produtoNome: "Notebook", custoProduto: 100, valorVenda: 200, quantidade: 1, subtotal: 200 }],
};

describe("vendaV2Schema com entrega", () => {
  it("sem entrega rejeita apontando o campo entrega", () => {
    const r = vendaV2Schema.safeParse(baseV2);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.find((i) => i.path[0] === "entrega")?.message).toBe(MSG_ENTREGA_OBRIGATORIA);
  });
  it("entrega com frete 0 e envio > 0 passa", () => {
    expect(vendaV2Schema.safeParse({ ...baseV2, entrega: true, envio: 14 }).success).toBe(true);
  });
  it("entrega com envio 0 rejeita no campo envio", () => {
    const r = vendaV2Schema.safeParse({ ...baseV2, entrega: true });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.find((i) => i.path[0] === "envio")?.message).toBe(MSG_CUSTO_ENVIO_ENTREGA);
  });
  it("retirada sem frete passa; retirada com frete rejeita", () => {
    expect(vendaV2Schema.safeParse({ ...baseV2, entrega: false }).success).toBe(true);
    expect(vendaV2Schema.safeParse({ ...baseV2, entrega: false, frete: 30 }).success).toBe(false);
  });
});

describe("adocao na criacao", () => {
  it("criarVendaV2 le e grava entrega", () => {
    const src = readFileSync("src/app/(app)/venda-rapida/actions.ts", "utf8");
    expect(src.includes('lerEntregaDoForm(formData.get("entrega"))')).toBe(true);
    expect(src.includes("entrega,")).toBe(true);
  });
  it("o form tem o seletor, manda o campo e marca Entrega na cotacao Uber", () => {
    const src = readFileSync("src/components/venda-rapida-form-v2.tsx", "utf8");
    expect(src.includes('formData.append("entrega"')).toBe(true);
    expect(src.includes('id="entrega"')).toBe(true);
    expect(src.includes('setEntrega("1")')).toBe(true);
    expect(src.includes('setEntrega("")')).toBe(true);
  });
});

describe("adocao na edicao", () => {
  it("updateVenda le o valor gravado, valida e so grava quando o form manda", () => {
    const src = readFileSync("src/app/(app)/historico/actions.ts", "utf8");
    expect(src.includes("erroEntregaNaEdicao(")).toBe(true);
    expect(src.includes("entrega: true")).toBe(true);
    expect(src.includes('lerEntregaDoForm(formData.get("entrega"))')).toBe(true);
    expect(src.includes("entregaForm !== undefined")).toBe(true);
  });
  it("os dois forms de edicao mostram o seletor com Nao informado", () => {
    for (const f of ["src/components/edit-venda-historico-form.tsx", "src/components/edit-venda-form-client.tsx"]) {
      const src = readFileSync(f, "utf8");
      expect(src.includes('name="entrega"') || src.includes('formData.set("entrega"')).toBe(true);
      expect(src.includes("Não informado")).toBe(true);
    }
  });
});
