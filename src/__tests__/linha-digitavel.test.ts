// Linha digitavel FEBRABAN (Fase 4 — boletos Prudent).
//
// Nenhuma linha "real" de memoria: toda linha valida aqui nasce de um codigo de barras montado no
// proprio teste (DV geral calculado pelo modulo 11), convertido para linha pela funcao inversa.
// Os valores fixos de modulo 10/11 foram conferidos a mao (somas no comentario de cada caso).
import { describe, it, expect } from "vitest";
import {
  somenteDigitos,
  modulo10,
  modulo11Bancario,
  modulo11Arrecadacao,
  codigoBarrasDeLinhaBancaria,
  linhaBancariaDeCodigoBarras,
  linhaArrecadacaoDeCodigoBarras,
  decodificarLinhaDigitavel,
} from "@/lib/linha-digitavel";

const DIA = 86_400_000;
const dataPura = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** Codigo de barras bancario de 44 posicoes: banco+moeda, DV geral, fator, valor, campo livre. */
function codigoBancario(fator: string, valor: string, campoLivre = "1234567890123456789012345", bancoMoeda = "0019") {
  const semDv = bancoMoeda + fator + valor + campoLivre;
  expect(semDv).toHaveLength(43);
  const dv = modulo11Bancario(semDv);
  return bancoMoeda + String(dv) + fator + valor + campoLivre;
}

/** Troca o digito da posicao (0-based) por outro valor qualquer. */
function trocarDigito(s: string, pos: number) {
  const novo = String((Number(s[pos]) + 1) % 10);
  return s.slice(0, pos) + novo + s.slice(pos + 1);
}

describe("somenteDigitos", () => {
  it("tira pontos, espacos e quebras", () => {
    expect(somenteDigitos(" 00190.00009 01234.567890\n")).toBe("001900000901234567890");
  });
});

describe("modulo10", () => {
  it.each([
    ["0", 0],
    ["1", 8], // 1x2=2 -> 10-2
    ["5", 9], // 5x2=10 -> 1+0=1 -> 10-1
    ["19", 0], // 9x2=18 -> 1+8=9; 1x1=1; soma 10 -> resto 0 -> DV 0
    ["123", 0], // 3x2=6, 2x1=2, 1x2=2 -> 10
    ["0019", 0], // da direita: 9x2=18 -> 9, 1x1=1, 0x2, 0x1 -> 10 -> DV 0
  ])("modulo10(%s) = %i", (numero, dv) => {
    expect(modulo10(numero)).toBe(dv);
  });

  it("soma os digitos do produto quando passa de 9", () => {
    // 7x2=14 -> 1+4=5; 6x1=6; soma 11 -> resto 1 -> DV 9
    expect(modulo10("67")).toBe(9);
  });
});

describe("modulo11Bancario", () => {
  it.each([
    ["1", 9], // 1x2=2 -> resto 2 -> 11-2
    ["9", 4], // 9x2=18 -> resto 7 -> 11-7
    ["123456789", 7], // 18+24+28+30+30+28+24+18+2=202 -> resto 4 -> 7
    ["0", 1], // resto 0 -> 11 -> 1
    ["5", 1], // 10 -> resto 10 -> 1 -> 1 (resto 10 da DV 1)
    ["6", 1], // 12 -> resto 1 -> 10 -> 1
  ])("modulo11Bancario(%s) = %i", (numero, dv) => {
    expect(modulo11Bancario(numero)).toBe(dv);
  });

  it("os pesos voltam a 2 depois do 9", () => {
    // oito digitos 1: pesos 2..9 somam 44 -> resto 0 -> DV 1
    expect(modulo11Bancario("11111111")).toBe(1);
    // nove digitos 1: 44 + 1x2 (peso volta a 2) = 46 -> resto 2 -> DV 9
    expect(modulo11Bancario("111111111")).toBe(9);
  });
});

describe("modulo11Arrecadacao", () => {
  it("resto 0 ou 1 da DV 0; resto 10 da DV 1", () => {
    expect(modulo11Arrecadacao("0")).toBe(0); // resto 0
    expect(modulo11Arrecadacao("6")).toBe(0); // 12 -> resto 1
    expect(modulo11Arrecadacao("5")).toBe(1); // 10 -> resto 10 -> 1
    expect(modulo11Arrecadacao("9")).toBe(4); // 18 -> resto 7 -> 4
  });
});

describe("codigo de barras <-> linha bancaria", () => {
  it("ida e volta preservam o codigo de barras", () => {
    const codigo = codigoBancario("9999", "0000123456");
    const linha = linhaBancariaDeCodigoBarras(codigo);
    expect(linha).toHaveLength(47);
    expect(codigoBarrasDeLinhaBancaria(linha)).toBe(codigo);
  });

  it("monta os campos no lugar FEBRABAN", () => {
    const campoLivre = "ABCDEFGHIJKLMNOPQRSTUVWXY".split("").map((_, i) => String(i % 10)).join("");
    const codigo = codigoBancario("1000", "0000005000", campoLivre);
    const linha = linhaBancariaDeCodigoBarras(codigo);
    // campo 1: banco+moeda + 5 primeiros do campo livre + DV
    expect(linha.slice(0, 9)).toBe("0019" + campoLivre.slice(0, 5));
    expect(Number(linha[9])).toBe(modulo10(linha.slice(0, 9)));
    // campo 2: campo livre 6-15 + DV
    expect(linha.slice(10, 20)).toBe(campoLivre.slice(5, 15));
    expect(Number(linha[20])).toBe(modulo10(linha.slice(10, 20)));
    // campo 3: campo livre 16-25 + DV
    expect(linha.slice(21, 31)).toBe(campoLivre.slice(15, 25));
    expect(Number(linha[31])).toBe(modulo10(linha.slice(21, 31)));
    // campo 4: DV geral; campo 5: fator + valor
    expect(linha[32]).toBe(codigo[4]);
    expect(linha.slice(33)).toBe("1000" + "0000005000");
  });

  it("recusa tamanhos errados", () => {
    expect(() => codigoBarrasDeLinhaBancaria("123")).toThrow("Linha digitável com 47 dígitos esperada.");
    expect(() => linhaBancariaDeCodigoBarras("123")).toThrow("Código de barras com 44 dígitos esperado.");
  });
});

describe("decodificarLinhaDigitavel — bancario", () => {
  const ref = dataPura("2026-09-30");

  it("decodifica valor e vencimento de uma linha montada a partir do codigo de barras", () => {
    // fator 1000 + 585 dias na base de 22/02/2025 -> 30/09/2026
    const fator = String(1000 + Math.round((dataPura("2026-09-30").getTime() - dataPura("2025-02-22").getTime()) / DIA));
    const codigo = codigoBancario(fator, "0000123456");
    const linha = linhaBancariaDeCodigoBarras(codigo);
    const r = decodificarLinhaDigitavel(linha, ref);
    expect(r).toEqual({
      ok: true,
      tipo: "bancario",
      linha,
      codigoBarras: codigo,
      valor: 1234.56,
      vencimento: dataPura("2026-09-30"),
    });
  });

  it("aceita a linha formatada com pontos e espacos", () => {
    const codigo = codigoBancario("1500", "0000010000");
    const l = linhaBancariaDeCodigoBarras(codigo);
    const formatada = `${l.slice(0, 5)}.${l.slice(5, 10)} ${l.slice(10, 15)}.${l.slice(15, 21)} ${l.slice(21, 26)}.${l.slice(26, 32)} ${l[32]} ${l.slice(33)}`;
    const r = decodificarLinhaDigitavel(formatada, ref);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.linha).toBe(l);
      expect(r.valor).toBe(100);
    }
  });

  it.each([
    [1, 3], // digito no campo 1
    [2, 14], // digito no campo 2
    [3, 25], // digito no campo 3
  ])("um digito trocado no campo %i e recusado pelo DV do campo", (campo, pos) => {
    const linha = linhaBancariaDeCodigoBarras(codigoBancario("1500", "0000010000"));
    const r = decodificarLinhaDigitavel(trocarDigito(linha, pos), ref);
    expect(r).toEqual({ ok: false, erro: `Dígito verificador do campo ${campo} não confere.` });
  });

  it("um digito trocado no campo 5 (valor) e recusado pelo DV geral", () => {
    const linha = linhaBancariaDeCodigoBarras(codigoBancario("1500", "0000010000"));
    const r = decodificarLinhaDigitavel(trocarDigito(linha, 46), ref);
    expect(r).toEqual({ ok: false, erro: "Dígito verificador geral não confere." });
  });

  it("DV geral trocado e recusado", () => {
    const linha = linhaBancariaDeCodigoBarras(codigoBancario("1500", "0000010000"));
    const r = decodificarLinhaDigitavel(trocarDigito(linha, 32), ref);
    expect(r).toEqual({ ok: false, erro: "Dígito verificador geral não confere." });
  });

  it("valor zerado vira null (boleto sem valor)", () => {
    const r = decodificarLinhaDigitavel(linhaBancariaDeCodigoBarras(codigoBancario("1500", "0000000000")), ref);
    expect(r.ok && r.valor).toBe(null);
  });

  it("fator 0000 vira vencimento null", () => {
    const r = decodificarLinhaDigitavel(linhaBancariaDeCodigoBarras(codigoBancario("0000", "0000010000")), ref);
    expect(r.ok && r.vencimento).toBe(null);
  });

  it("fator 1000 com referencia em 2026 e 22/02/2025 (reinicio do fator)", () => {
    const linha = linhaBancariaDeCodigoBarras(codigoBancario("1000", "0000010000"));
    const r = decodificarLinhaDigitavel(linha, dataPura("2026-09-30"));
    expect(r.ok && iso(r.vencimento)).toBe("2025-02-22");
  });

  it("fator 1000 com referencia em 2000 e 03/07/2000 (base antiga)", () => {
    const linha = linhaBancariaDeCodigoBarras(codigoBancario("1000", "0000010000"));
    const r = decodificarLinhaDigitavel(linha, dataPura("2000-06-01"));
    expect(r.ok && iso(r.vencimento)).toBe("2000-07-03");
  });

  it("fator 9999 com referencia 01/01/2025 e 21/02/2025 (ultimo dia da base antiga)", () => {
    const linha = linhaBancariaDeCodigoBarras(codigoBancario("9999", "0000010000"));
    const r = decodificarLinhaDigitavel(linha, dataPura("2025-01-01"));
    expect(r.ok && iso(r.vencimento)).toBe("2025-02-21");
  });

  it("fator 1001 depois do reinicio e 23/02/2025", () => {
    const linha = linhaBancariaDeCodigoBarras(codigoBancario("1001", "0000010000"));
    const r = decodificarLinhaDigitavel(linha, dataPura("2025-03-01"));
    expect(r.ok && iso(r.vencimento)).toBe("2025-02-23");
  });

  it("sem referencia usa hoje", () => {
    const fatorHoje = 1000 + Math.floor((Date.now() - dataPura("2025-02-22").getTime()) / DIA);
    const linha = linhaBancariaDeCodigoBarras(codigoBancario(String(fatorHoje), "0000010000"));
    const r = decodificarLinhaDigitavel(linha);
    expect(r.ok && iso(r.vencimento)).toBe(new Date().toISOString().slice(0, 10));
  });
});

describe("decodificarLinhaDigitavel — arrecadacao (48 digitos)", () => {
  /** Codigo de arrecadacao: 8, segmento, identificador de valor, DV geral, valor (11), resto (29). */
  function codigoArrecadacao(idValor: "6" | "7" | "8" | "9", valor11 = "00000012345", resto = "12345678901234567890123456789") {
    const semDv = "8" + "1" + idValor + valor11 + resto;
    expect(semDv).toHaveLength(43);
    const dv = idValor === "6" || idValor === "7" ? modulo10(semDv) : modulo11Arrecadacao(semDv);
    return semDv.slice(0, 3) + String(dv) + semDv.slice(3);
  }

  it("mod 10 (identificador 6): valor efetivo, vencimento null", () => {
    const codigo = codigoArrecadacao("6");
    const linha = linhaArrecadacaoDeCodigoBarras(codigo);
    expect(linha).toHaveLength(48);
    // cada bloco = 11 digitos do codigo + DV modulo 10
    for (let b = 0; b < 4; b++) {
      expect(linha.slice(b * 12, b * 12 + 11)).toBe(codigo.slice(b * 11, b * 11 + 11));
      expect(Number(linha[b * 12 + 11])).toBe(modulo10(codigo.slice(b * 11, b * 11 + 11)));
    }
    expect(decodificarLinhaDigitavel(linha)).toEqual({
      ok: true,
      tipo: "arrecadacao",
      linha,
      codigoBarras: codigo,
      valor: 123.45,
      vencimento: null,
    });
  });

  it("mod 11 (identificador 8): valor efetivo", () => {
    const codigo = codigoArrecadacao("8", "00000099990");
    const linha = linhaArrecadacaoDeCodigoBarras(codigo);
    expect(Number(linha[11])).toBe(modulo11Arrecadacao(codigo.slice(0, 11)));
    const r = decodificarLinhaDigitavel(linha);
    expect(r.ok && r.valor).toBe(999.9);
  });

  it("identificadores 7 e 9 (valor de referencia) devolvem valor null", () => {
    for (const id of ["7", "9"] as const) {
      const r = decodificarLinhaDigitavel(linhaArrecadacaoDeCodigoBarras(codigoArrecadacao(id)));
      expect(r.ok).toBe(true);
      expect(r.ok && r.valor).toBe(null);
    }
  });

  it("digito trocado num bloco e recusado pelo DV do bloco", () => {
    const linha = linhaArrecadacaoDeCodigoBarras(codigoArrecadacao("6"));
    expect(decodificarLinhaDigitavel(trocarDigito(linha, 30))).toEqual({
      ok: false,
      erro: "Dígito verificador do bloco 3 não confere.",
    });
  });

  it("DV geral errado e recusado mesmo com os blocos coerentes", () => {
    const codigo = codigoArrecadacao("6");
    const errado = codigo.slice(0, 3) + String((Number(codigo[3]) + 1) % 10) + codigo.slice(4);
    expect(decodificarLinhaDigitavel(linhaArrecadacaoDeCodigoBarras(errado))).toEqual({
      ok: false,
      erro: "Dígito verificador geral não confere.",
    });
  });

  it("48 digitos que nao comecam com 8 sao recusados", () => {
    const linha = "1" + linhaArrecadacaoDeCodigoBarras(codigoArrecadacao("6")).slice(1);
    expect(decodificarLinhaDigitavel(linha)).toEqual({
      ok: false,
      erro: "Linha de 48 dígitos é de convênio e deve começar com 8.",
    });
  });

  it("identificador de valor fora de 6-9 e recusado", () => {
    // o identificador decide o modulo dos DVs, entao e conferido antes dos blocos
    const valida = linhaArrecadacaoDeCodigoBarras(codigoArrecadacao("6"));
    const linha = valida.slice(0, 2) + "5" + valida.slice(3);
    expect(decodificarLinhaDigitavel(linha)).toEqual({
      ok: false,
      erro: "Identificador de valor do convênio inválido (3º dígito deve ser 6, 7, 8 ou 9).",
    });
  });
});

describe("decodificarLinhaDigitavel — tamanho", () => {
  it.each(["", "123", "0".repeat(44), "0".repeat(46), "0".repeat(49)])("recusa %s", (entrada) => {
    expect(decodificarLinhaDigitavel(entrada)).toEqual({
      ok: false,
      erro: "Linha digitável deve ter 47 (boleto) ou 48 (convênio) dígitos.",
    });
  });
});
