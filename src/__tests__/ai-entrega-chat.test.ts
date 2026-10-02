// O chat nao pode chutar Entrega/Retirada (revisao final de 2026-10-02).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REGRA_PADRAO } from "@/lib/regra-empresa";
import { MSG_ENTREGA_OBRIGATORIA } from "@/lib/validations/venda";

const tx = {
  venda: { create: vi.fn(async () => ({ id: 1 })) },
  itemVenda: { create: vi.fn() },
  produto: { updateMany: vi.fn() },
};
const dbMock = {
  usuario: { findFirst: vi.fn() },
  auditLog: { create: vi.fn() },
  venda: { findUnique: vi.fn(), update: vi.fn(async () => ({ id: 7 })) },
  $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
};
const regraDbMock = { regraDoClienteNaData: vi.fn() };
const creditMock = { checkCredito: vi.fn() };
vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/regra-empresa-db", () => regraDbMock);
vi.mock("@/lib/credit", () => creditMock);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { executeAiAction } = await import("@/lib/ai-actions");
const ctx = { role: "admin" as const, username: "admin", displayName: "Admin", userId: 1 };
const base = { dataVenda: "2026-03-22", clienteId: 5, produtoNome: "Produto X", valorVenda: 300, parcelas: 1 };
const lerFonte = (f: string) => readFileSync(join(process.cwd(), f), "utf8");
const DESC = "true = entrega, false = retirada. Pergunte ao usuário se ele não disse; nunca presuma.";

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.usuario.findFirst.mockResolvedValue({ id: 1 });
  regraDbMock.regraDoClienteNaData.mockResolvedValue({ ...REGRA_PADRAO, diaCorte: 25 });
  creditMock.checkCredito.mockResolvedValue({ ok: true });
});

describe("chat: entrega nunca presumida", () => {
  it("descricao das ferramentas e o prompt mandam perguntar", () => {
    const src = lerFonte("src/lib/ai-actions.ts");
    expect(src.split(DESC).length - 1).toBe(2); // criar_venda e atualizar_venda
    const prompt = lerFonte("src/lib/ai.ts");
    expect(prompt).toContain("criar_venda: se o usuario nao disse se a venda e entrega ou retirada, PERGUNTE antes de executar; nunca presuma.");
  });

  it("criar_venda sem entrega: erro e nada gravado", async () => {
    const r = (await executeAiAction("criar_venda", base, ctx)) as { erro?: string };
    expect(r.erro ?? JSON.stringify(r)).toContain(MSG_ENTREGA_OBRIGATORIA);
    expect(tx.venda.create).not.toHaveBeenCalled();
  });

  it('criar_venda com entrega "false" (string): retirada gravada como false', async () => {
    await executeAiAction("criar_venda", { ...base, entrega: "false" }, ctx);
    expect((tx.venda.create.mock.calls as unknown as unknown[][])[0][0]).toMatchObject({ data: { entrega: false } });
  });

  it("atualizar_venda com entrega false grava entrega false", async () => {
    dbMock.venda.findUnique.mockResolvedValue({ entrega: null, valorFrete: 0, custoEnvio: 0 });
    await executeAiAction("atualizar_venda", { id: 7, entrega: false }, ctx);
    expect((dbMock.venda.update.mock.calls as unknown as unknown[][])[0][0]).toMatchObject({ data: { entrega: false } });
  });
});
