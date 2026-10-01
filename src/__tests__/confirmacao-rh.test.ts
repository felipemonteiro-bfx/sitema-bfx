// Confirmação do RH por parcela (2026-09-30, Fase 3).
//
// A BFX registra à mão se o RH da empresa confirmou ou recusou cada título do consolidado
// semanal. Só parcela confirmada entra na fila da Prudent. Parcela anterior à Fase 3 entra como
// confirmada de origem "legado" (migração 20260930130000).
import { describe, it, expect } from "vitest";
import {
  CONFIRMACAO,
  estadoConfirmacao,
  rotuloConfirmacao,
  podeConfirmar,
  podeRecusar,
  validarMotivo,
} from "@/lib/confirmacao-rh";

describe("estadoConfirmacao", () => {
  it.each([
    [{ confirmacaoRh: null, confirmacaoOrigem: null }, "aguardando"],
    [{ confirmacaoRh: "confirmada", confirmacaoOrigem: "rh" }, "confirmada"],
    [{ confirmacaoRh: "confirmada", confirmacaoOrigem: null }, "confirmada"],
    [{ confirmacaoRh: "confirmada", confirmacaoOrigem: "legado" }, "legado"],
    [{ confirmacaoRh: "recusada", confirmacaoOrigem: "rh" }, "recusada"],
  ] as const)("%o → %s", (p, esperado) => {
    expect(estadoConfirmacao(p)).toBe(esperado);
  });

  it("valor desconhecido no banco não vira confirmada", () => {
    expect(estadoConfirmacao({ confirmacaoRh: "talvez", confirmacaoOrigem: "rh" })).toBe("aguardando");
  });

  it("as constantes batem com o que o banco guarda", () => {
    expect(CONFIRMACAO).toEqual({ confirmada: "confirmada", recusada: "recusada" });
  });
});

describe("rotuloConfirmacao", () => {
  it.each([
    [{ confirmacaoRh: null, confirmacaoOrigem: null }, "Aguardando RH"],
    [{ confirmacaoRh: "confirmada", confirmacaoOrigem: "rh" }, "Confirmada pelo RH"],
    [{ confirmacaoRh: "confirmada", confirmacaoOrigem: "legado" }, "Legado — sem confirmação do RH"],
    [{ confirmacaoRh: "recusada", confirmacaoOrigem: "rh", confirmacaoMotivo: "Colaborador desligado" }, "Recusada: Colaborador desligado"],
    [{ confirmacaoRh: "recusada", confirmacaoOrigem: "rh", confirmacaoMotivo: null }, "Recusada"],
  ] as const)("%o → %s", (p, esperado) => {
    expect(rotuloConfirmacao(p)).toBe(esperado);
  });
});

describe("podeConfirmar", () => {
  it.each([
    [null, true],
    ["recusada", true],
    ["confirmada", false],
  ] as const)("confirmacaoRh %s → %s", (confirmacaoRh, esperado) => {
    expect(podeConfirmar({ confirmacaoRh })).toBe(esperado);
  });
});

describe("podeRecusar", () => {
  const erro = { ok: false, erro: "A parcela já está na Prudent; cancele o lote antes." };
  it.each([
    [{ confirmacaoRh: null, antecipada: false, antecipacaoLoteId: null }, { ok: true }],
    [{ confirmacaoRh: "confirmada", antecipada: false, antecipacaoLoteId: null }, { ok: true }],
    [{ confirmacaoRh: "confirmada", antecipada: false, antecipacaoLoteId: 7 }, erro],
    [{ confirmacaoRh: "confirmada", antecipada: true, antecipacaoLoteId: null }, erro],
    [{ confirmacaoRh: "confirmada", antecipada: true, antecipacaoLoteId: 7 }, erro],
  ] as const)("%o", (p, esperado) => {
    expect(podeRecusar(p)).toEqual(esperado);
  });
});

describe("validarMotivo", () => {
  const erro = { ok: false, erro: "Informe o motivo da recusa (mínimo 5 caracteres)." };
  it.each([
    ["  ok ", erro],
    ["", erro],
    [null, erro],
    [undefined, erro],
    [42, erro],
    ["abcd", erro],
    ["     abcd     ", erro],
    ["abcde", { ok: true, valor: "abcde" }],
    ["  Colaborador desligado  ", { ok: true, valor: "Colaborador desligado" }],
  ] as const)("%o", (motivo, esperado) => {
    expect(validarMotivo(motivo)).toEqual(esperado);
  });

  it("corta motivo enorme em 500 caracteres", () => {
    const r = validarMotivo("x".repeat(800));
    expect(r).toEqual({ ok: true, valor: "x".repeat(500) });
  });
});
