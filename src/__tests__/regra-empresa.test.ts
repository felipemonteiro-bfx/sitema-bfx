import { describe, it, expect } from "vitest";
import { REGRA_PADRAO, regraVigente, vigenciasSobrepostas, validarRegra, type RegraComVigencia } from "@/lib/regra-empresa";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const base = { diaCorte: 20, diaVencimento: 10, diaPix: 15, repassePct: null, repasseBase: null, cobrancaViaBfx: false } as const;

describe("regraVigente", () => {
  it("sem regra devolve o padrão igual ao comportamento atual", () => {
    expect(regraVigente([], d("2026-10-05"))).toEqual(REGRA_PADRAO);
    expect(REGRA_PADRAO).toEqual({ diaCorte: 20, diaVencimento: 10, diaPix: 15, repassePct: null, repasseBase: null, cobrancaViaBfx: false });
  });
  it("escolhe a regra cuja janela contém a data (vigenteDe inclusivo, vigenteAte exclusivo)", () => {
    const regras: RegraComVigencia[] = [
      { ...base, repassePct: 10, repasseBase: "venda", vigenteDe: d("2026-10-01"), vigenteAte: d("2027-01-01") },
      { ...base, repassePct: 7, repasseBase: "venda", vigenteDe: d("2027-01-01"), vigenteAte: null },
    ];
    expect(regraVigente(regras, d("2026-10-01")).repassePct).toBe(10);
    expect(regraVigente(regras, d("2026-12-31")).repassePct).toBe(10);
    expect(regraVigente(regras, d("2027-01-01")).repassePct).toBe(7);
    expect(regraVigente(regras, d("2026-09-30"))).toEqual(REGRA_PADRAO);
  });
  it("não devolve id nem vigência", () => {
    const r = regraVigente([{ ...base, id: 3, vigenteDe: d("2026-01-01"), vigenteAte: null }], d("2026-05-01"));
    expect(r).not.toHaveProperty("id");
    expect(r).not.toHaveProperty("vigenteDe");
  });
});

describe("vigenciasSobrepostas", () => {
  it("encostadas não se sobrepõem", () => {
    expect(vigenciasSobrepostas([
      { vigenteDe: d("2026-01-01"), vigenteAte: d("2026-04-01") },
      { vigenteDe: d("2026-04-01"), vigenteAte: null },
    ])).toBeNull();
  });
  it("aberta seguida de outra se sobrepõe", () => {
    expect(vigenciasSobrepostas([
      { vigenteDe: d("2026-01-01"), vigenteAte: null },
      { vigenteDe: d("2026-06-01"), vigenteAte: null },
    ])).toEqual([0, 1]);
  });
  it("intervalos cruzados se sobrepõem em qualquer ordem", () => {
    expect(vigenciasSobrepostas([
      { vigenteDe: d("2026-03-01"), vigenteAte: d("2026-09-01") },
      { vigenteDe: d("2026-01-01"), vigenteAte: d("2026-04-01") },
    ])).toEqual([0, 1]);
  });
});

describe("validarRegra", () => {
  const ok = { vigenteDe: "2026-10-01", vigenteAte: "", diaCorte: "20", diaVencimento: "15", diaPix: "15", repassePct: "", cobrancaViaBfx: "" };
  it("aceita e converte", () => {
    const r = validarRegra(ok);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.valor.vigenteDe).toEqual(d("2026-10-01"));
      expect(r.valor.vigenteAte).toBeNull();
      expect(r.valor.diaVencimento).toBe(15);
      expect(r.valor.repassePct).toBeNull();
      expect(r.valor.repasseBase).toBeNull();
      expect(r.valor.cobrancaViaBfx).toBe(false);
    }
  });
  it("dias fora de 1–28 são recusados", () => {
    expect(validarRegra({ ...ok, diaVencimento: "31" })).toEqual({ ok: false, erro: "Dia de vencimento deve ser entre 1 e 28." });
    expect(validarRegra({ ...ok, diaPix: "0" })).toEqual({ ok: false, erro: "Dia do Pix deve ser entre 1 e 28." });
    expect(validarRegra({ ...ok, diaCorte: "29" })).toEqual({ ok: false, erro: "Dia de corte deve ser entre 1 e 28." });
  });
  it("repasse vira base 'venda' e aceita vírgula", () => {
    const r = validarRegra({ ...ok, repassePct: "7,5" });
    expect(r.ok && r.valor.repassePct).toBe(7.5);
    expect(r.ok && r.valor.repasseBase).toBe("venda");
    expect(validarRegra({ ...ok, repassePct: "101" }).ok).toBe(false);
  });
  it("vigenteAte deve ser depois de vigenteDe", () => {
    expect(validarRegra({ ...ok, vigenteAte: "2026-10-01" })).toEqual({ ok: false, erro: "O fim da vigência deve ser depois do início." });
  });
  it("cobrancaViaBfx 'on' liga", () => {
    const r = validarRegra({ ...ok, cobrancaViaBfx: "on" });
    expect(r.ok && r.valor.cobrancaViaBfx).toBe(true);
  });
  it("data inválida é recusada", () => {
    expect(validarRegra({ ...ok, vigenteDe: "31/10/2026" })).toEqual({ ok: false, erro: "Início da vigência inválido." });
  });
});
