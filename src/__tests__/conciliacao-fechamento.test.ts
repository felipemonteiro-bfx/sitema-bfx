import { describe, expect, it } from "vitest";
import { conciliarBoletosComDemonstrativo, estadoFinal, type Divergencia } from "@/lib/conciliacao-fechamento";

type Linha = Parameters<typeof conciliarBoletosComDemonstrativo>[0][number];
type Boleto = Parameters<typeof conciliarBoletosComDemonstrativo>[1][number];

const linha = (parcelaId: number | null, valor: number, extra: Partial<Linha> = {}): Linha => ({
  identificador: `V${parcelaId ?? 0}-1/1`,
  parcelaId,
  antecipada: true,
  boletoPrudentId: null,
  valor,
  ...extra,
});

const boleto = (id: number, parcelaIds: number[], valorEsperado: number, extra: Partial<Boleto> = {}): Boleto => ({
  id,
  status: "a_pagar",
  valorEsperado,
  valorDocumento: null,
  parcelaIds,
  ...extra,
});

describe("conciliarBoletosComDemonstrativo", () => {
  it("tudo bate: soma das antecipadas = soma dos boletos, sem divergências", () => {
    const r = conciliarBoletosComDemonstrativo(
      [linha(1, 100), linha(2, 150.5), linha(3, 80, { antecipada: false })],
      [boleto(10, [1, 2], 250.5, { valorDocumento: 250.5 })],
    );
    expect(r).toEqual({ somaLinhasAntecipadas: 250.5, somaBoletos: 250.5, diferenca: 0, divergencias: [] });
  });

  it("sem antecipadas e sem boletos", () => {
    expect(conciliarBoletosComDemonstrativo([linha(1, 100, { antecipada: false })], [])).toEqual({
      somaLinhasAntecipadas: 0,
      somaBoletos: 0,
      diferenca: 0,
      divergencias: [],
    });
  });

  it("antecipada sem boleto", () => {
    const r = conciliarBoletosComDemonstrativo([linha(1, 100), linha(2, 50, { identificador: "V9-2/3" })], [boleto(10, [1], 100)]);
    expect(r.divergencias).toEqual<Divergencia[]>([{ tipo: "antecipada_sem_boleto", identificador: "V9-2/3", valor: 50 }]);
    expect(r).toMatchObject({ somaLinhasAntecipadas: 150, somaBoletos: 100, diferenca: -50 });
  });

  it("boletos substituídos e cancelados não contam: a parcela segue no boleto vivo", () => {
    const r = conciliarBoletosComDemonstrativo(
      [linha(1, 100), linha(2, 100)],
      [
        boleto(10, [], 200, { status: "substituido" }),
        boleto(11, [1, 2], 200, { status: "pago", valorDocumento: 200 }),
        boleto(12, [1], 100, { status: "cancelado" }),
      ],
    );
    expect(r).toEqual({ somaLinhasAntecipadas: 200, somaBoletos: 200, diferenca: 0, divergencias: [] });
  });

  it("parcela só coberta por boleto cancelado = antecipada sem boleto", () => {
    const r = conciliarBoletosComDemonstrativo([linha(1, 100)], [boleto(12, [1], 100, { status: "cancelado" })]);
    expect(r.divergencias).toEqual([{ tipo: "antecipada_sem_boleto", identificador: "V1-1/1", valor: 100 }]);
    expect(r.somaBoletos).toBe(0);
  });

  it("boleto com valor do documento diferente da soma das parcelas do demonstrativo", () => {
    const r = conciliarBoletosComDemonstrativo([linha(1, 100), linha(2, 100)], [boleto(10, [1, 2], 200, { valorDocumento: 210 })]);
    expect(r.divergencias).toEqual([{ tipo: "boleto_valor_diferente", boletoId: 10, esperado: 200, documento: 210 }]);
    expect(r).toMatchObject({ somaLinhasAntecipadas: 200, somaBoletos: 210, diferenca: 10 });
  });

  it("diferença de 1 centavo é tolerada", () => {
    const r = conciliarBoletosComDemonstrativo([linha(1, 100)], [boleto(10, [1], 100, { valorDocumento: 100.01 })]);
    expect(r.divergencias).toEqual([]);
    expect(r.diferenca).toBe(0.01);
  });

  it("sem documento compara pelo valor esperado do boleto", () => {
    const r = conciliarBoletosComDemonstrativo([linha(1, 100)], [boleto(10, [1], 120)]);
    expect(r.divergencias).toEqual([{ tipo: "boleto_valor_diferente", boletoId: 10, esperado: 100, documento: 120 }]);
  });

  it("boleto cobre parcela fora do demonstrativo (bloqueada)", () => {
    const r = conciliarBoletosComDemonstrativo([linha(1, 100)], [boleto(10, [1, 7], 180)]);
    expect(r.divergencias).toEqual([{ tipo: "boleto_com_parcela_fora", boletoId: 10, identificador: "parcela #7", valor: 80 }]);
    expect(r).toMatchObject({ somaLinhasAntecipadas: 100, somaBoletos: 180, diferenca: 80 });
  });

  it("boleto inteiro fora do demonstrativo", () => {
    const r = conciliarBoletosComDemonstrativo([], [boleto(10, [7, 8], 180)]);
    expect(r.divergencias).toEqual([
      { tipo: "boleto_com_parcela_fora", boletoId: 10, identificador: "parcela #7, parcela #8", valor: 180 },
    ]);
  });

  it("boleto cobre parcela que está no demonstrativo como não antecipada", () => {
    const r = conciliarBoletosComDemonstrativo(
      [linha(1, 100), linha(2, 80, { antecipada: false, identificador: "V5-2/2" })],
      [boleto(10, [1, 2], 180)],
    );
    expect(r.divergencias).toEqual([{ tipo: "boleto_com_parcela_fora", boletoId: 10, identificador: "V5-2/2", valor: 80 }]);
  });

  it("linha sem parcela (venda editada) casa pelo boletoPrudentId da foto", () => {
    // A edição da venda recria as parcelas: a linha perde parcelaId e o boleto aponta para a parcela nova (#99).
    const r = conciliarBoletosComDemonstrativo(
      [linha(null, 100, { boletoPrudentId: 10, identificador: "V3-1/2" }), linha(2, 100)],
      [boleto(10, [99, 2], 200)],
    );
    expect(r).toEqual({ somaLinhasAntecipadas: 200, somaBoletos: 200, diferenca: 0, divergencias: [] });
  });

  it("linha sem parcela e sem boleto vivo = antecipada sem boleto", () => {
    const r = conciliarBoletosComDemonstrativo(
      [linha(null, 100, { boletoPrudentId: 10, identificador: "V3-1/2" })],
      [boleto(10, [99], 100, { status: "substituido" })],
    );
    expect(r.divergencias).toEqual([{ tipo: "antecipada_sem_boleto", identificador: "V3-1/2", valor: 100 }]);
  });

  it("soma em centavos", () => {
    const r = conciliarBoletosComDemonstrativo([linha(1, 0.1), linha(2, 0.2)], [boleto(10, [1, 2], 0.3)]);
    expect(r).toEqual({ somaLinhasAntecipadas: 0.3, somaBoletos: 0.3, diferenca: 0, divergencias: [] });
  });
});

describe("estadoFinal", () => {
  const pago = { status: "pago" };
  const aPagar = { status: "a_pagar" };
  const div: Divergencia = { tipo: "boleto_valor_diferente", boletoId: 1, esperado: 1, documento: 2 };

  it.each([
    ["enviado, boletos pagos", "enviado", [pago], [], { conciliado: false, concluido: false }],
    ["pago parcial", "pago_parcial", [pago], [], { conciliado: false, concluido: false }],
    ["pago, boleto a pagar", "pago", [pago, aPagar], [], { conciliado: false, concluido: false }],
    ["pago, boleto pago parcial", "pago", [{ status: "pago_parcial" }], [], { conciliado: false, concluido: false }],
    ["pago, boletos pagos, sem divergência", "pago", [pago, pago], [], { conciliado: true, concluido: true }],
    ["pago, sem antecipadas", "pago", [], [], { conciliado: true, concluido: true }],
    ["pago, boletos pagos, com divergência", "pago", [pago], [div], { conciliado: true, concluido: false }],
    ["substituído e cancelado não travam", "pago", [pago, { status: "substituido" }, { status: "cancelado" }], [], { conciliado: true, concluido: true }],
    [
      "antecipada sem boleto impede conciliar",
      "pago",
      [pago],
      [{ tipo: "antecipada_sem_boleto", identificador: "V1-1/1", valor: 10 }],
      { conciliado: false, concluido: false },
    ],
  ] as const)("%s", (_rotulo, status, boletos, divergencias, esperado) => {
    expect(estadoFinal({ status }, [...boletos], [...divergencias] as Divergencia[])).toEqual(esperado);
  });
});
