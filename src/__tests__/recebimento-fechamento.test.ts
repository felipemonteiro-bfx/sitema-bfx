import { describe, expect, it } from "vitest";
import {
  lerReferenciaExterna,
  referenciaExterna,
  situacaoRecebimento,
  validarRecebimentoManual,
} from "@/lib/recebimento-fechamento";

describe("referenciaExterna", () => {
  it("monta FEC-{empresa}-{AAAA-MM}-v{N}", () => {
    expect(referenciaExterna(7, "2026-10", 2)).toBe("FEC-7-2026-10-v2");
    expect(referenciaExterna(123, "2027-01", 1)).toBe("FEC-123-2027-01-v1");
  });

  it("ida e volta", () => {
    expect(lerReferenciaExterna(referenciaExterna(42, "2026-12", 10))).toEqual({ empresaId: 42, competencia: "2026-12", versao: 10 });
  });
});

describe("lerReferenciaExterna", () => {
  it("lê a referência do fechamento", () => {
    expect(lerReferenciaExterna("FEC-7-2026-10-v2")).toEqual({ empresaId: 7, competencia: "2026-10", versao: 2 });
  });

  it.each([
    ["nulo", null],
    ["indefinido", undefined],
    ["vazio", ""],
    ["id de venda (fluxo atual de boleto)", "240"],
    ["outro prefixo", "VEN-7-2026-10-v2"],
    ["prefixo minúsculo", "fec-7-2026-10-v2"],
    ["sem versão", "FEC-7-2026-10"],
    ["parte a mais", "FEC-7-2026-10-v2-x"],
    ["empresa não numérica", "FEC-a-2026-10-v2"],
    ["empresa zero", "FEC-0-2026-10-v2"],
    ["empresa negativa (vira parte vazia)", "FEC--7-2026-10-v2"],
    ["empresa com decimal", "FEC-7.5-2026-10-v2"],
    ["ano com 2 dígitos", "FEC-7-26-10-v2"],
    ["mês com 1 dígito", "FEC-7-2026-1-v2"],
    ["mês 13", "FEC-7-2026-13-v2"],
    ["mês 00", "FEC-7-2026-00-v2"],
    ["versão sem v", "FEC-7-2026-10-2"],
    ["versão zero", "FEC-7-2026-10-v0"],
    ["versão vazia", "FEC-7-2026-10-v"],
    ["versão não numérica", "FEC-7-2026-10-vx"],
    ["espaço", " FEC-7-2026-10-v2"],
  ])("%s → null", (_rotulo, ref) => {
    expect(lerReferenciaExterna(ref)).toBeNull();
  });
});

describe("situacaoRecebimento", () => {
  const conf = (valor: number) => ({ valor, status: "confirmado" });

  it.each([
    ["sem recebimento", 1000, [], { recebido: 0, saldo: 1000, excedente: 0, status: "enviado" }],
    ["parcial", 1000, [conf(400)], { recebido: 400, saldo: 600, excedente: 0, status: "pago_parcial" }],
    ["dois parciais somam o total", 1000, [conf(400), conf(600)], { recebido: 1000, saldo: 0, excedente: 0, status: "pago" }],
    ["exato", 1000, [conf(1000)], { recebido: 1000, saldo: 0, excedente: 0, status: "pago" }],
    ["falta 1 centavo → pago (tolerância)", 1000, [conf(999.99)], { recebido: 999.99, saldo: 0, excedente: 0, status: "pago" }],
    ["falta 2 centavos → parcial", 1000, [conf(999.98)], { recebido: 999.98, saldo: 0.02, excedente: 0, status: "pago_parcial" }],
    ["sobra 1 centavo → sem excedente", 1000, [conf(1000.01)], { recebido: 1000.01, saldo: 0, excedente: 0, status: "pago" }],
    ["sobra → excedente", 1000, [conf(1000), conf(250.5)], { recebido: 1250.5, saldo: 0, excedente: 250.5, status: "pago" }],
    [
      "pendente e estornado não contam",
      1000,
      [{ valor: 1000, status: "pendente" }, { valor: 1000, status: "estornado" }, conf(300)],
      { recebido: 300, saldo: 700, excedente: 0, status: "pago_parcial" },
    ],
    ["só pendente → enviado", 1000, [{ valor: 1000, status: "pendente" }], { recebido: 0, saldo: 1000, excedente: 0, status: "enviado" }],
    ["soma em centavos (0,1 + 0,2)", 0.3, [conf(0.1), conf(0.2)], { recebido: 0.3, saldo: 0, excedente: 0, status: "pago" }],
    ["total zero → nada a cobrar", 0, [], { recebido: 0, saldo: 0, excedente: 0, status: "pago" }],
  ] as const)("%s", (_rotulo, total, recebimentos, esperado) => {
    expect(situacaoRecebimento(total, [...recebimentos])).toEqual(esperado);
  });

  it("pagamento da versão antiga depois da nova: o excedente aparece", () => {
    // v1 = 1000 pago; v2 corrigiu para 800 → sobram 200 para resolver
    expect(situacaoRecebimento(800, [conf(1000)])).toEqual({ recebido: 1000, saldo: 0, excedente: 200, status: "pago" });
  });
});

describe("validarRecebimentoManual", () => {
  const agora = new Date("2026-10-20T15:00:00Z"); // 20/10 em Manaus

  it.each([
    ["número", 1500.5, 1500.5],
    ["texto com ponto decimal", "1500.50", 1500.5],
    ["texto pt-BR", "1.500,50", 1500.5],
    ["texto com vírgula", "1500,5", 1500.5],
    ["texto com R$ e espaços", " R$ 1.500,50 ", 1500.5],
    ["arredonda a centavos", 10.006, 10.01],
  ])("valor %s", (_rotulo, valor, esperado) => {
    const r = validarRecebimentoManual({ valor, data: "2026-10-15" }, agora);
    expect(r).toEqual({ ok: true, valor: esperado, data: new Date("2026-10-15T00:00:00.000Z") });
  });

  it.each([
    ["zero", 0],
    ["negativo", -10],
    ["meio centavo arredonda para zero", 0.004],
    ["NaN", Number.NaN],
    ["infinito", Number.POSITIVE_INFINITY],
    ["texto vazio", ""],
    ["texto ilegível", "abc"],
    ["texto negativo", "-5"],
    ["nulo", null],
    ["objeto", {}],
  ])("valor inválido: %s", (_rotulo, valor) => {
    const r = validarRecebimentoManual({ valor, data: "2026-10-15" }, agora);
    expect(r).toEqual({ ok: false, erro: "Informe um valor recebido maior que zero." });
  });

  it("aceita Date e normaliza para data pura", () => {
    const r = validarRecebimentoManual({ valor: 10, data: new Date("2026-10-15T00:00:00.000Z") }, agora);
    expect(r).toEqual({ ok: true, valor: 10, data: new Date("2026-10-15T00:00:00.000Z") });
  });

  it("aceita hoje (dia de Manaus)", () => {
    const r = validarRecebimentoManual({ valor: 10, data: "2026-10-20" }, agora);
    expect(r.ok).toBe(true);
  });

  it("recusa data no futuro", () => {
    expect(validarRecebimentoManual({ valor: 10, data: "2026-10-21" }, agora)).toEqual({
      ok: false,
      erro: "A data do recebimento não pode ser no futuro.",
    });
  });

  it.each([
    ["vazia", ""],
    ["formato BR", "15/10/2026"],
    ["inexistente", "2026-02-30"],
    ["nula", null],
    ["Date inválida", new Date("x")],
    ["número", 20261015],
  ])("data inválida: %s", (_rotulo, data) => {
    expect(validarRecebimentoManual({ valor: 10, data }, agora)).toEqual({ ok: false, erro: "Informe a data do recebimento." });
  });
});
