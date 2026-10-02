import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { lerErroDoCorpo } from "@/lib/importacao-erro";
import {
  ENTREGA_INVALIDA,
  importacaoPayloadSchema,
  lerEntregaDaPlanilha,
  linhasInvalidasDeFrete,
  mensagemLinhasInvalidasDeFrete,
} from "@/lib/validations/importacao";

// Mocks no mesmo padrao de uber-custo-entrega-rota.test.ts: objeto local, nunca o prisma real.
const tx = {
  cliente: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  usuario: { findFirst: vi.fn() },
  venda: { create: vi.fn() },
};
const dbMock = {
  empresaParceira: { findUnique: vi.fn() },
  $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<void>) => fn(tx)),
};
const rejeicao = vi.fn();

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/revalidacao", () => ({ revalidarVenda: vi.fn(), revalidarCliente: vi.fn() }));
vi.mock("@/lib/venda-observabilidade", () => ({ registrarRejeicaoVenda: rejeicao }));

const { POST } = await import("@/app/api/importacao/batch/route");

const linha = (over: Record<string, unknown> = {}) => ({
  cliente: "João da Silva",
  produto: "Notebook",
  valor: "3200",
  dataVenda: "2026-02-01",
  parcelas: "1",
  frete: "0",
  envio: "0",
  ...over,
});

function req(body: unknown) {
  return new Request("http://local/api/importacao/batch", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  }) as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  tx.cliente.findFirst.mockResolvedValue({ id: 1, empresaParceiraId: null });
  tx.usuario.findFirst.mockResolvedValue(null);
  tx.venda.create.mockResolvedValue({});
});

describe("lerEntregaDaPlanilha", () => {
  it.each(["S", "s", " sim ", "SIM", "1", 1, true])("%j vira entrega (true)", (v) => {
    expect(lerEntregaDaPlanilha(v)).toBe(true);
  });
  it.each(["N", "n", "nao", "NÃO", "Não", "0", 0, false])("%j vira retirada (false)", (v) => {
    expect(lerEntregaDaPlanilha(v)).toBe(false);
  });
  it.each([undefined, null, "", "   "])("%j fica em branco (null)", (v) => {
    expect(lerEntregaDaPlanilha(v)).toBeNull();
  });
  it.each(["talvez", "x", "2", "sim!", "entrega", 2, {}])("%j e invalido", (v) => {
    expect(lerEntregaDaPlanilha(v)).toBe(ENTREGA_INVALIDA);
  });
  it("acento decomposto (NFD) de 'não' vale como retirada, como o Excel do Mac grava", () => {
    expect(lerEntregaDaPlanilha("na\u0303o")).toBe(false);
  });
  it.each(["S\u0308", "s\u0301", "N\u0307", "n\u0303", "\uFF33", "sim\u200b"])(
    "marca combinante ou caractere parecido nao passa por S/N (%j)",
    (v) => {
      expect(lerEntregaDaPlanilha(v)).toBe(ENTREGA_INVALIDA);
    },
  );
});

describe("importacaoPayloadSchema — coluna entrega", () => {
  const parse = (extra: Record<string, unknown>) => {
    const r = importacaoPayloadSchema.safeParse([linha(extra)]);
    expect(r.success).toBe(true);
    return r.success ? r.data.rows[0].entrega : undefined;
  };
  it("le S, N, em branco e ausente", () => {
    expect(parse({ entrega: "S" })).toBe(true);
    expect(parse({ entrega: "não" })).toBe(false);
    expect(parse({ entrega: "" })).toBeNull();
    expect(parse({})).toBeNull();
  });
  it("valor invalido nao derruba o schema: vira marca para a rota apontar a linha", () => {
    expect(parse({ entrega: "talvez" })).toBe(ENTREGA_INVALIDA);
  });
});

describe("linhasInvalidasDeFrete", () => {
  it("sem entrega informada vale so o piso: frete cobrado sem custo de envio", () => {
    const r = linhasInvalidasDeFrete([
      { cliente: "Ana", frete: 30, envio: 0, entrega: null },
      { cliente: "Bia", frete: 0, envio: 0, entrega: null },
      { cliente: "Caio", frete: 30, envio: 12, entrega: null },
      { cliente: "Davi", frete: 45, envio: 0 },
    ]);
    expect(r).toEqual([
      { linha: 1, cliente: "Ana", motivo: "frete cobrado sem custo de envio" },
      { linha: 4, cliente: "Davi", motivo: "frete cobrado sem custo de envio" },
    ]);
  });

  it("entrega exige custo de envio mesmo com frete 0", () => {
    expect(linhasInvalidasDeFrete([{ cliente: "Ana", frete: 0, envio: 0, entrega: true }])).toEqual([
      { linha: 1, cliente: "Ana", motivo: "entrega sem custo de envio" },
    ]);
    expect(linhasInvalidasDeFrete([{ cliente: "Ana", frete: 0, envio: 15, entrega: true }])).toEqual([]);
  });

  it("retirada com frete cobrado e recusada; retirada sem frete passa", () => {
    expect(linhasInvalidasDeFrete([{ cliente: "Ana", frete: 30, envio: 0, entrega: false }])).toEqual([
      { linha: 1, cliente: "Ana", motivo: "retirada com frete cobrado" },
    ]);
    expect(linhasInvalidasDeFrete([{ cliente: "Ana", frete: 0, envio: 0, entrega: false }])).toEqual([]);
  });

  it("valor de entrega invalido aponta a linha", () => {
    expect(linhasInvalidasDeFrete([{ cliente: "Ana", frete: 0, envio: 0, entrega: ENTREGA_INVALIDA }])).toEqual([
      { linha: 1, cliente: "Ana", motivo: "entrega deve ser S ou N" },
    ]);
  });

  it("envio NaN ou negativo conta como sem custo", () => {
    const r = linhasInvalidasDeFrete([
      { cliente: "Ana", frete: 30, envio: Number.NaN, entrega: null },
      { cliente: "Bia", frete: 0, envio: -5, entrega: true },
    ]);
    expect(r.map((l) => l.linha)).toEqual([1, 2]);
  });

  it("linha de cliente em branco e ignorada mas mantem a numeracao", () => {
    const r = linhasInvalidasDeFrete([
      { cliente: "   ", frete: 30, envio: 0, entrega: null },
      { cliente: "Bia", frete: 30, envio: 0, entrega: null },
    ]);
    expect(r).toEqual([{ linha: 2, cliente: "Bia", motivo: "frete cobrado sem custo de envio" }]);
  });
});

describe("mensagemLinhasInvalidasDeFrete", () => {
  it("singular e plural, com linha, cliente e motivo", () => {
    expect(mensagemLinhasInvalidasDeFrete([{ linha: 4, cliente: "JOSÉ", motivo: "frete cobrado sem custo de envio" }])).toBe(
      "1 linha com problema de frete ou entrega: linha 4 (JOSÉ): frete cobrado sem custo de envio. Nada foi importado. Corrija a planilha e envie de novo.",
    );
    const m = mensagemLinhasInvalidasDeFrete([
      { linha: 4, cliente: "JOSÉ", motivo: "frete cobrado sem custo de envio" },
      { linha: 9, cliente: "MARIA", motivo: "entrega sem custo de envio" },
    ]);
    expect(
      m.startsWith(
        "2 linhas com problema de frete ou entrega: linha 4 (JOSÉ): frete cobrado sem custo de envio; linha 9 (MARIA): entrega sem custo de envio.",
      ),
    ).toBe(true);
  });

  it("limita a 10 linhas no texto e diz quantas ficaram de fora", () => {
    const muitas = Array.from({ length: 13 }, (_, i) => ({ linha: i + 1, cliente: `C${i + 1}`, motivo: "entrega sem custo de envio" }));
    const m = mensagemLinhasInvalidasDeFrete(muitas);
    expect(m.includes("linha 10 (C10)")).toBe(true);
    expect(m.includes("linha 11")).toBe(false);
    expect(m.includes("e mais 3")).toBe(true);
  });
});

describe("POST /api/importacao/batch — frete e entrega", () => {
  it("array puro com frete cobrado sem custo de envio: 400 com as linhas e nada gravado", async () => {
    const res = await POST(req([linha({ frete: "30", envio: "0" })]));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("linha 1 (João da Silva): frete cobrado sem custo de envio");
    expect(body.linhas).toEqual([{ linha: 1, cliente: "João da Silva", motivo: "frete cobrado sem custo de envio" }]);
    expect(dbMock.$transaction).not.toHaveBeenCalled();
    expect(tx.venda.create).not.toHaveBeenCalled();
    expect(rejeicao).toHaveBeenCalledWith(expect.objectContaining({ origem: "importacao", itens: 1 }));
  });

  it("formato { empresaParceiraId, rows } passa pela mesma checagem", async () => {
    dbMock.empresaParceira.findUnique.mockResolvedValue({ id: 3, nome: "Prefeitura" });
    const res = await POST(req({
      empresaParceiraId: 3,
      rows: [linha(), linha({ cliente: "Maria", frete: "20", envio: "0" })],
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).linhas).toEqual([{ linha: 2, cliente: "Maria", motivo: "frete cobrado sem custo de envio" }]);
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });

  it("uma linha ruim recusa o lote inteiro, inclusive as linhas boas", async () => {
    const res = await POST(req([linha({ cliente: "Boa" }), linha({ cliente: "Ruim", frete: "30" })]));
    expect(res.status).toBe(400);
    expect(tx.venda.create).not.toHaveBeenCalled();
  });

  it("Entrega S sem custo de envio e recusada mesmo com frete 0", async () => {
    const res = await POST(req([linha({ entrega: "S" })]));
    expect(res.status).toBe(400);
    expect((await res.json()).linhas).toEqual([{ linha: 1, cliente: "João da Silva", motivo: "entrega sem custo de envio" }]);
    expect(tx.venda.create).not.toHaveBeenCalled();
  });

  it("Entrega N com frete cobrado e recusada", async () => {
    const res = await POST(req([linha({ entrega: "N", frete: "30", envio: "0" })]));
    expect(res.status).toBe(400);
    expect((await res.json()).linhas[0].motivo).toBe("retirada com frete cobrado");
  });

  it("Entrega com valor invalido recusa o lote apontando a linha", async () => {
    const res = await POST(req([linha(), linha({ cliente: "Maria", entrega: "talvez" })]));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.linhas).toEqual([{ linha: 2, cliente: "Maria", motivo: "entrega deve ser S ou N" }]);
    expect(tx.venda.create).not.toHaveBeenCalled();
  });

  it("grava entrega true, false e null conforme a coluna", async () => {
    const res = await POST(req([
      linha({ cliente: "A", entrega: "S", frete: "30", envio: "18" }),
      linha({ cliente: "B", entrega: "N" }),
      linha({ cliente: "C" }),
    ]));
    expect(res.status).toBe(200);
    const gravados = tx.venda.create.mock.calls.map((c) => c[0].data.entrega);
    expect(gravados).toEqual([true, false, null]);
  });

  it("lote sem a coluna (planilha antiga) continua importando, com entrega null", async () => {
    const res = await POST(req([linha(), linha({ cliente: "Maria", frete: "30", envio: "18" })]));
    expect(res.status).toBe(200);
    expect(tx.venda.create).toHaveBeenCalledTimes(2);
    expect(tx.venda.create.mock.calls.every((c) => c[0].data.entrega === null)).toBe(true);
  });
});

describe("lerErroDoCorpo", () => {
  it("devolve o texto de error quando o servidor manda", () => {
    expect(lerErroDoCorpo({ error: "1 linha com frete cobrado", linhas: [] })).toBe("1 linha com frete cobrado");
  });
  it.each([null, undefined, "texto", 42, {}, { error: 7 }, { error: "" }, { error: "   " }])(
    "cai para null quando nao ha texto legivel (%j)",
    (corpo) => {
      expect(lerErroDoCorpo(corpo)).toBeNull();
    },
  );
});

describe("importacao-client", () => {
  it("o toast usa a mensagem do servidor e so cai no texto generico sem ela", () => {
    const src = readFileSync("src/components/importacao-client.tsx", "utf8");
    expect(src.includes("lerErroDoCorpo(await res.json().catch(() => null))")).toBe(true);
    expect(src.includes('toast.error(erroServidor ?? "Erro ao salvar dados no servidor.")')).toBe(true);
  });
  it("le a coluna Entrega da planilha e a envia com a linha", () => {
    const src = readFileSync("src/components/importacao-client.tsx", "utf8");
    expect(src.includes('row["Entrega (S/N)"]')).toBe(true);
    expect(src.includes("entrega: string;")).toBe(true);
  });
  it("o modelo CSV ganha a coluna Entrega (S/N)", () => {
    const src = readFileSync("src/app/(app)/importacao/page.tsx", "utf8");
    expect(src.includes("Antecipada (S/N);Entrega (S/N)")).toBe(true);
  });
});

describe("importacao/sugerir", () => {
  it("devolve o entrega original em vez de deixar o modelo mexer ou o campo sumir", () => {
    const src = readFileSync("src/app/api/importacao/sugerir/route.ts", "utf8");
    expect(src.includes("entrega: orig.entrega")).toBe(true);
  });
});
