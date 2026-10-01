// Projecao de caixa das obrigacoes (Fase 4, spec §6): saidas = saldo dos boletos vivos no
// vencimento; entradas = Pix esperado e deposito previsto de lote em andamento. O acumulado
// e o que falta (saidas - entradas ate o dia, piso 0); o pico e o maior valor a financiar.
import { describe, it, expect } from "vitest";
import { projetarCaixa } from "@/lib/projecao-caixa";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const HOJE = d("2026-10-01");

type Entrada = Parameters<typeof projetarCaixa>[0];
const entrada = (e: Partial<Entrada>): Entrada => ({
  hoje: HOJE,
  dias: 60,
  boletos: [],
  pixEsperados: [],
  depositosPrevistos: [],
  ...e,
});
const noDia = (r: ReturnType<typeof projetarCaixa>, iso: string) =>
  r.serie.find((p) => p.data === iso)?.acumulado;

describe("projetarCaixa", () => {
  it("sem movimentos: serie zerada de hoje ate hoje + dias, sem pico", () => {
    const r = projetarCaixa(entrada({}));
    expect(r.serie).toHaveLength(61);
    expect(r.serie[0]).toEqual({ data: "2026-10-01", acumulado: 0 });
    expect(r.serie[60]).toEqual({ data: "2026-11-30", acumulado: 0 });
    expect(r.serie.every((p) => p.acumulado === 0)).toBe(true);
    expect(r).toMatchObject({
      antesDoPix: 0,
      depoisDoPix: 0,
      boletosAntesDoPix: 0,
      boletosDepoisDoPix: 0,
      pico: null,
      vencidos: 0,
    });
  });

  it("boleto dia 10 e Pix dia 15 do mesmo valor: pico no dia 10, zera no dia 15", () => {
    const r = projetarCaixa(
      entrada({
        boletos: [{ vencimento: d("2026-10-10"), saldo: 1000, dataPix: d("2026-10-15") }],
        pixEsperados: [{ data: d("2026-10-15"), valor: 1000 }],
      }),
    );
    expect(noDia(r, "2026-10-09")).toBe(0);
    expect(noDia(r, "2026-10-10")).toBe(1000);
    expect(noDia(r, "2026-10-14")).toBe(1000);
    expect(noDia(r, "2026-10-15")).toBe(0);
    expect(noDia(r, "2026-11-30")).toBe(0);
    expect(r.pico).toEqual({ valor: 1000, data: "2026-10-10" });
    expect(r.antesDoPix).toBe(1000);
    expect(r.boletosAntesDoPix).toBe(1);
  });

  it("deposito previsto do lote reduz o acumulado a partir do seu dia", () => {
    const r = projetarCaixa(
      entrada({
        boletos: [{ vencimento: d("2026-10-10"), saldo: 1000, dataPix: d("2026-10-15") }],
        pixEsperados: [{ data: d("2026-10-15"), valor: 1000 }],
        depositosPrevistos: [{ data: d("2026-10-12"), valor: 300 }],
      }),
    );
    expect(noDia(r, "2026-10-11")).toBe(1000);
    expect(noDia(r, "2026-10-12")).toBe(700);
    expect(noDia(r, "2026-10-15")).toBe(0);
    expect(r.pico).toEqual({ valor: 1000, data: "2026-10-10" });
  });

  it("entrada antes da saida cobre a saida (o credito nao se perde no piso)", () => {
    const r = projetarCaixa(
      entrada({
        boletos: [{ vencimento: d("2026-10-10"), saldo: 1000, dataPix: null }],
        depositosPrevistos: [{ data: d("2026-10-05"), valor: 1000 }],
      }),
    );
    expect(noDia(r, "2026-10-05")).toBe(0);
    expect(noDia(r, "2026-10-10")).toBe(0);
    expect(r.pico).toBeNull();
  });

  it("boleto vencido entra no dia de hoje e e contado", () => {
    const r = projetarCaixa(
      entrada({
        boletos: [
          { vencimento: d("2026-09-25"), saldo: 500, dataPix: d("2026-09-15") },
          { vencimento: d("2026-09-30"), saldo: 0, dataPix: null },
        ],
      }),
    );
    expect(r.serie[0]).toEqual({ data: "2026-10-01", acumulado: 500 });
    expect(r.vencidos).toBe(1);
    expect(r.pico).toEqual({ valor: 500, data: "2026-10-01" });
    // venceu depois do dia do Pix daquele mes -> depois do Pix
    expect(r.depoisDoPix).toBe(500);
  });

  it("antes x depois do Pix pelo vencimento contratual", () => {
    const r = projetarCaixa(
      entrada({
        boletos: [
          { vencimento: d("2026-10-10"), saldo: 100, dataPix: d("2026-10-15") }, // antes
          { vencimento: d("2026-10-15"), saldo: 200, dataPix: d("2026-10-15") }, // mesmo dia -> depois
          { vencimento: d("2026-10-20"), saldo: 300, dataPix: d("2026-10-15") }, // depois
          { vencimento: d("2026-10-05"), saldo: 400, dataPix: null }, // sem Pix -> depois
        ],
      }),
    );
    expect(r.antesDoPix).toBe(100);
    expect(r.boletosAntesDoPix).toBe(1);
    expect(r.depoisDoPix).toBe(900);
    expect(r.boletosDepoisDoPix).toBe(3);
  });

  it("boleto com saldo zero nao entra em nada", () => {
    const r = projetarCaixa(
      entrada({ boletos: [{ vencimento: d("2026-10-10"), saldo: 0, dataPix: d("2026-10-15") }] }),
    );
    expect(r.antesDoPix).toBe(0);
    expect(r.boletosAntesDoPix).toBe(0);
    expect(r.pico).toBeNull();
  });

  it("movimento depois do horizonte fica fora da serie e dos cartoes", () => {
    const r = projetarCaixa(
      entrada({
        boletos: [
          { vencimento: d("2026-11-30"), saldo: 100, dataPix: null }, // ultimo dia: entra
          { vencimento: d("2026-12-01"), saldo: 999, dataPix: null }, // fora
        ],
      }),
    );
    expect(noDia(r, "2026-11-30")).toBe(100);
    expect(r.depoisDoPix).toBe(100);
    expect(r.boletosDepoisDoPix).toBe(1);
  });

  it("soma em centavos, sem ruido de ponto flutuante", () => {
    const r = projetarCaixa(
      entrada({
        boletos: [
          { vencimento: d("2026-10-10"), saldo: 0.1, dataPix: d("2026-10-15") },
          { vencimento: d("2026-10-10"), saldo: 0.2, dataPix: d("2026-10-15") },
        ],
      }),
    );
    expect(noDia(r, "2026-10-10")).toBe(0.3);
    expect(r.antesDoPix).toBe(0.3);
  });

  it("pico empatado fica com a primeira data", () => {
    const r = projetarCaixa(
      entrada({
        boletos: [
          { vencimento: d("2026-10-10"), saldo: 500, dataPix: null },
          { vencimento: d("2026-10-20"), saldo: 500, dataPix: null },
        ],
        depositosPrevistos: [{ data: d("2026-10-15"), valor: 500 }],
      }),
    );
    expect(r.pico).toEqual({ valor: 500, data: "2026-10-10" });
  });

  it("hoje com hora usa o dia UTC", () => {
    const r = projetarCaixa(entrada({ hoje: new Date("2026-10-01T18:45:00.000Z"), dias: 2 }));
    expect(r.serie.map((p) => p.data)).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
  });

  it("Pix esperado ou deposito ja vencido entra hoje", () => {
    const r = projetarCaixa(
      entrada({
        boletos: [{ vencimento: d("2026-10-03"), saldo: 800, dataPix: null }],
        depositosPrevistos: [{ data: d("2026-09-28"), valor: 300 }],
        pixEsperados: [{ data: d("2026-09-15"), valor: 200 }],
      }),
    );
    expect(noDia(r, "2026-10-01")).toBe(0);
    expect(noDia(r, "2026-10-03")).toBe(300);
  });
});
