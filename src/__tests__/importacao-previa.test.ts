import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  camposDestacados,
  importacaoPayloadSchema,
  linhasInvalidasDaPrevia,
  linhasInvalidasDeFrete,
  mensagemAvisoDaPrevia,
  normalizarCelulasDaPrevia,
  MOTIVO_ENTREGA_INVALIDA,
  MOTIVO_ENTREGA_SEM_CUSTO,
  MOTIVO_FRETE_SEM_CUSTO,
  MOTIVO_RETIRADA_COM_FRETE,
} from "@/lib/validations/importacao";

const base = { produto: "Notebook", valor: "3200", dataVenda: "2026-02-01", parcelas: "1" };
const l = (cliente: string, frete: string, envio: string, entrega: string) => ({ cliente, frete, envio, entrega });

describe("linhasInvalidasDaPrevia", () => {
  it("le as celulas como o servidor: virgula decimal, vazio, entrega S/N", () => {
    const r = linhasInvalidasDaPrevia([
      l("Ana", "30,5", "0", ""),
      l("Bia", "0", "0", "N"),
      l("Caio", "0", "0", "S"),
      l("Davi", "25", "18", "talvez"),
      l("Edu", "10", "12,5", "sim"),
    ]);
    expect(r).toEqual([
      { linha: 1, cliente: "Ana", motivo: MOTIVO_FRETE_SEM_CUSTO },
      { linha: 3, cliente: "Caio", motivo: MOTIVO_ENTREGA_SEM_CUSTO },
      { linha: 4, cliente: "Davi", motivo: MOTIVO_ENTREGA_INVALIDA },
    ]);
  });

  it("frete e envio nao numericos contam como 0, igual ao servidor", () => {
    expect(linhasInvalidasDaPrevia([l("Ana", "abc", "x", "")])).toEqual([]);
    expect(linhasInvalidasDaPrevia([l("Ana", "30", "abc", "")])).toEqual([
      { linha: 1, cliente: "Ana", motivo: MOTIVO_FRETE_SEM_CUSTO },
    ]);
  });

  it("e identica a checagem que o servidor faz sobre as linhas ja interpretadas pelo schema", () => {
    const celulas = [
      l("Ana", "30,5", "0", ""),
      l("Bia", "0", "0", "N"),
      l("Caio", "0", "0", "S"),
      l("Davi", "25", "18", "talvez"),
      l("Edu", "10", "12,5", "sim"),
      l("Fabi", "40", "0", "N"),
      l("  ", "40", "0", ""),
      l("Gil", "-5", "-2", "1"),
    ];
    const noServidor = importacaoPayloadSchema.safeParse(celulas.map((c) => ({ ...base, ...c })));
    expect(noServidor.success).toBe(true);
    if (!noServidor.success) return;
    expect(linhasInvalidasDaPrevia(celulas)).toEqual(linhasInvalidasDeFrete(noServidor.data.rows));
  });
});

describe("mensagemAvisoDaPrevia", () => {
  const li = (linha: number) => ({ linha, cliente: `C${linha}`, motivo: MOTIVO_FRETE_SEM_CUSTO });
  it("singular, dupla e tres ou mais", () => {
    expect(mensagemAvisoDaPrevia([li(4)])).toBe("1 linha precisa de correção antes de subir: linha 4.");
    expect(mensagemAvisoDaPrevia([li(1), li(3)])).toBe("2 linhas precisam de correção antes de subir: linha 1 e linha 3.");
    expect(mensagemAvisoDaPrevia([li(1), li(3), li(4)])).toBe(
      "3 linhas precisam de correção antes de subir: linha 1, linha 3 e linha 4.",
    );
  });
  it("com mais de 10 lista as 10 primeiras e diz quantas ficaram de fora", () => {
    const m = mensagemAvisoDaPrevia(Array.from({ length: 13 }, (_, i) => li(i + 1)));
    expect(m.startsWith("13 linhas precisam de correção antes de subir: linha 1, linha 2")).toBe(true);
    expect(m.includes("linha 10")).toBe(true);
    expect(m.includes("linha 11")).toBe(false);
    expect(m.endsWith("e mais 3.")).toBe(true);
  });
});

describe("normalizarCelulasDaPrevia", () => {
  const celulas = (frete: string, envio: string, entrega: string) => ({ cliente: "Ana", frete, envio, entrega });

  it("Entrega valida vira S, N ou vazio, para o select mostrar o que o servidor vai gravar", () => {
    for (const v of ["S", "s", "Sim", " sim ", "1"]) expect(normalizarCelulasDaPrevia(celulas("0", "0", v)).entrega).toBe("S");
    for (const v of ["N", "não", "NAO", "0"]) expect(normalizarCelulasDaPrevia(celulas("0", "0", v)).entrega).toBe("N");
    for (const v of ["", "   "]) expect(normalizarCelulasDaPrevia(celulas("0", "0", v)).entrega).toBe("");
  });

  it("Entrega invalida continua como veio, para a linha mostrar o problema ate o operador escolher", () => {
    expect(normalizarCelulasDaPrevia(celulas("0", "0", "talvez")).entrega).toBe("talvez");
  });

  it("frete e envio com virgula decimal viram ponto, para o campo numerico mostrar o valor", () => {
    const r = normalizarCelulasDaPrevia(celulas("30,5", "12,75", ""));
    expect(r.frete).toBe("30.5");
    expect(r.envio).toBe("12.75");
  });

  it("nao muda o resultado da checagem: a linha normalizada e invalida exatamente quando a original era", () => {
    const originais = [
      celulas("30,5", "0", ""), celulas("0", "0", "Sim"), celulas("0", "18,5", "sim"),
      celulas("25", "0", "não"), celulas("0", "0", "talvez"), celulas("", "", ""),
    ];
    expect(linhasInvalidasDaPrevia(originais.map(normalizarCelulasDaPrevia))).toEqual(linhasInvalidasDaPrevia(originais));
  });

  it("preserva os demais campos da linha", () => {
    const r = normalizarCelulasDaPrevia({ id: "x", cliente: "Ana", frete: "1,5", envio: "2", entrega: "S", produto: "Mouse" });
    expect(r).toMatchObject({ id: "x", cliente: "Ana", produto: "Mouse" });
  });
});

describe("camposDestacados", () => {
  it("aponta a(s) celula(s) que o operador deve corrigir em cada motivo", () => {
    expect(camposDestacados(MOTIVO_FRETE_SEM_CUSTO)).toEqual(["envio"]);
    expect(camposDestacados(MOTIVO_ENTREGA_SEM_CUSTO)).toEqual(["envio"]);
    expect(camposDestacados(MOTIVO_RETIRADA_COM_FRETE)).toEqual(["frete", "entrega"]);
    expect(camposDestacados(MOTIVO_ENTREGA_INVALIDA)).toEqual(["entrega"]);
    expect(camposDestacados("motivo desconhecido")).toEqual([]);
  });
});

describe("importacao-client — tela da previa", () => {
  const src = readFileSync("src/components/importacao-client.tsx", "utf8");

  it("a tabela ganha Frete, Envio e Entrega e o cabecalho da coluna do checkbox diz Antec.", () => {
    expect(src.includes(">Frete</TableHead>")).toBe(true);
    expect(src.includes(">Envio</TableHead>")).toBe(true);
    expect(src.includes(">Entrega</TableHead>")).toBe(true);
    expect(src.includes(">Antec.</TableHead>")).toBe(true);
    expect(src.includes(">Nota?</TableHead>")).toBe(false);
  });

  it("Entrega e uma lista com em branco, Sim e Nao", () => {
    expect(src.includes('aria-label="Entrega"')).toBe(true);
    expect(src.includes('<option value="">—</option>')).toBe(true);
    expect(src.includes('<option value="S">Sim</option>')).toBe(true);
    expect(src.includes('<option value="N">Não</option>')).toBe(true);
  });

  it("usa a mesma checagem do servidor, mostra o aviso e bloqueia o botao com linha invalida", () => {
    expect(src.includes("linhasInvalidasDaPrevia(data)")).toBe(true);
    expect(src.includes("mensagemAvisoDaPrevia(invalidas)")).toBe(true);
    expect(src.includes("disabled={saving || invalidas.length > 0}")).toBe(true);
    expect(src.includes("camposDestacados(")).toBe(true);
  });

  it("normaliza as celulas ao ler o CSV e ao receber a resposta da IA", () => {
    expect(src.includes("normalizarCelulasDaPrevia({")).toBe(true);
    expect(src.includes(".map(normalizarCelulasDaPrevia)")).toBe(true);
  });

  it("o aviso verde nao depende so da contagem: reage a cada mudanca da tabela", () => {
    expect(src.includes("useMemo(() => linhasInvalidasDaPrevia(data), [data])")).toBe(true);
    expect(src.includes("}, [invalidas]);")).toBe(true);
  });

  it("finalizeImport tambem recusa com linha invalida, sem depender do botao", () => {
    expect(src.includes("if (invalidas.length > 0)")).toBe(true);
  });
});
