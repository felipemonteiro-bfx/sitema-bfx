import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { lerErroDoCorpo } from "@/lib/importacao-erro";
import {
  linhasSemCustoDeEnvio,
  mensagemLinhasSemCustoDeEnvio,
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

describe("linhasSemCustoDeEnvio", () => {
  it("aponta so as linhas com frete cobrado e sem custo de envio, numeradas pela posicao", () => {
    const r = linhasSemCustoDeEnvio([
      { cliente: "Ana", frete: 30, envio: 0 },
      { cliente: "Bia", frete: 0, envio: 0 },
      { cliente: "Caio", frete: 30, envio: 12 },
      { cliente: "Davi", frete: 45, envio: 0 },
    ]);
    expect(r).toEqual([
      { linha: 1, cliente: "Ana" },
      { linha: 4, cliente: "Davi" },
    ]);
  });

  it("frete 0 com custo de envio e a retirada sem custo continuam validos", () => {
    expect(linhasSemCustoDeEnvio([
      { cliente: "Ana", frete: 0, envio: 15 },
      { cliente: "Bia", frete: 0, envio: 0 },
    ])).toEqual([]);
  });

  it("envio NaN ou negativo com frete cobrado conta como sem custo", () => {
    const r = linhasSemCustoDeEnvio([
      { cliente: "Ana", frete: 30, envio: Number.NaN },
      { cliente: "Bia", frete: 30, envio: -5 },
    ]);
    expect(r.map((l) => l.linha)).toEqual([1, 2]);
  });

  it("linha de cliente em branco e ignorada (a rota nao a grava) mas mantem a numeracao", () => {
    const r = linhasSemCustoDeEnvio([
      { cliente: "   ", frete: 30, envio: 0 },
      { cliente: "Bia", frete: 30, envio: 0 },
    ]);
    expect(r).toEqual([{ linha: 2, cliente: "Bia" }]);
  });
});

describe("mensagemLinhasSemCustoDeEnvio", () => {
  it("singular e plural, com a linha e o cliente", () => {
    expect(mensagemLinhasSemCustoDeEnvio([{ linha: 4, cliente: "JOSÉ" }])).toBe(
      "1 linha com frete cobrado e sem custo de envio: linha 4 (JOSÉ). Nada foi importado. Corrija a planilha e envie de novo.",
    );
    const m = mensagemLinhasSemCustoDeEnvio([
      { linha: 4, cliente: "JOSÉ" },
      { linha: 9, cliente: "MARIA" },
    ]);
    expect(m.startsWith("2 linhas com frete cobrado e sem custo de envio: linha 4 (JOSÉ), linha 9 (MARIA).")).toBe(true);
  });

  it("limita a 10 linhas no texto e diz quantas ficaram de fora", () => {
    const muitas = Array.from({ length: 13 }, (_, i) => ({ linha: i + 1, cliente: `C${i + 1}` }));
    const m = mensagemLinhasSemCustoDeEnvio(muitas);
    expect(m.includes("linha 10 (C10)")).toBe(true);
    expect(m.includes("linha 11")).toBe(false);
    expect(m.includes("e mais 3")).toBe(true);
  });
});

describe("POST /api/importacao/batch — frete real obrigatorio", () => {
  it("array puro com linha sem custo de envio: 400 com as linhas e nada gravado", async () => {
    const res = await POST(req([linha({ frete: "30", envio: "0" })]));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("linha 1 (João da Silva)");
    expect(body.linhas).toEqual([{ linha: 1, cliente: "João da Silva" }]);
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
    expect((await res.json()).linhas).toEqual([{ linha: 2, cliente: "Maria" }]);
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });

  it("uma linha ruim recusa o lote inteiro, inclusive as linhas boas", async () => {
    const res = await POST(req([linha({ cliente: "Boa" }), linha({ cliente: "Ruim", frete: "30" })]));
    expect(res.status).toBe(400);
    expect(tx.venda.create).not.toHaveBeenCalled();
  });

  it("lote valido (retirada e entrega com custo) continua importando", async () => {
    const res = await POST(req([linha(), linha({ cliente: "Maria", frete: "30", envio: "18" })]));
    expect(res.status).toBe(200);
    expect(tx.venda.create).toHaveBeenCalledTimes(2);
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
});
