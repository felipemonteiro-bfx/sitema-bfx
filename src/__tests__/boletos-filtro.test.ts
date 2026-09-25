import { describe, expect, it } from "vitest";
import { filtrarBoletos, intervaloDoPeriodo, lerFiltroBoletos } from "@/lib/boletos-filtro";

const hoje = "2026-09-25"; // sexta-feira

describe("intervaloDoPeriodo", () => {
  it("presets em datas do calendário (inclusive)", () => {
    expect(intervaloDoPeriodo({ periodo: "hoje" }, hoje)).toEqual({ de: "2026-09-25", ate: "2026-09-25" });
    expect(intervaloDoPeriodo({ periodo: "semana" }, hoje)).toEqual({ de: "2026-09-21", ate: "2026-09-27" });
    expect(intervaloDoPeriodo({ periodo: "mes" }, hoje)).toEqual({ de: "2026-09-01", ate: "2026-09-30" });
    expect(intervaloDoPeriodo({ periodo: "ano" }, hoje)).toEqual({ de: "2026-01-01", ate: "2026-12-31" });
    expect(intervaloDoPeriodo({ periodo: "tudo" }, hoje)).toBeNull();
  });

  it("personalizado usa de/até e aceita um lado só", () => {
    expect(intervaloDoPeriodo({ periodo: "pers", de: "2026-08-10", ate: "2026-09-05" }, hoje)).toEqual({ de: "2026-08-10", ate: "2026-09-05" });
    expect(intervaloDoPeriodo({ periodo: "pers", de: "2026-08-10" }, hoje)).toEqual({ de: "2026-08-10", ate: null });
  });
});

describe("lerFiltroBoletos", () => {
  it("padrão é este mês; valor inválido volta ao padrão; data inválida é ignorada", () => {
    expect(lerFiltroBoletos({})).toEqual({ periodo: "mes", de: undefined, ate: undefined, empresa: undefined, q: "" });
    expect(lerFiltroBoletos({ periodo: "xyz", de: "31/12", empresa: " AMAZON FIVE ", q: " Ana " })).toEqual({
      periodo: "mes", de: undefined, ate: undefined, empresa: "AMAZON FIVE", q: "ana",
    });
  });
});

describe("filtrarBoletos", () => {
  const boletos = [
    { id: "a", value: 100, dueDate: "2026-09-10", paymentDate: "2026-08-30", description: "Parcela 1", externalReference: "11" },
    { id: "b", value: 50, dueDate: "2026-08-10", paymentDate: "2026-09-02", description: "Parcela 2", externalReference: "12" },
    { id: "c", value: 70, dueDate: "2026-09-15", description: "Avulso sem venda" },
  ];
  const vendas = new Map([
    ["11", { cliente: "ANA SILVA", empresa: "AMAZON FIVE" }],
    ["12", { cliente: "BRUNO", empresa: "MIRAX SEGURANÇA" }],
  ]);
  const setembro = { de: "2026-09-01", ate: "2026-09-30" };

  it("filtra pelo vencimento ou pelo pagamento, conforme o campo", () => {
    expect(filtrarBoletos(boletos, { intervalo: setembro, campo: "dueDate", q: "" }, vendas).map((b) => b.id)).toEqual(["a", "c"]);
    expect(filtrarBoletos(boletos, { intervalo: setembro, campo: "paymentDate", q: "" }, vendas).map((b) => b.id)).toEqual(["b"]);
  });

  it("filtra por empresa e busca por cliente ou descrição, sem acento e sem caixa", () => {
    expect(filtrarBoletos(boletos, { intervalo: null, campo: "dueDate", empresa: "AMAZON FIVE", q: "" }, vendas).map((b) => b.id)).toEqual(["a"]);
    expect(filtrarBoletos(boletos, { intervalo: null, campo: "dueDate", q: "bruno" }, vendas).map((b) => b.id)).toEqual(["b"]);
    expect(filtrarBoletos(boletos, { intervalo: null, campo: "dueDate", q: "avulso" }, vendas).map((b) => b.id)).toEqual(["c"]);
    expect(filtrarBoletos(boletos, { intervalo: null, campo: "dueDate", empresa: "MIRAX SEGURANCA", q: "" }, vendas).map((b) => b.id)).toEqual(["b"]);
  });
});
