// A venda criada pela IA checa o limite com o corte da regra da empresa vigente na DATA DA VENDA,
// não na de hoje: a regra tem vigência e a venda pode ser retroativa (2026-09-30).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { REGRA_PADRAO } from "@/lib/regra-empresa";

const tx = {
  venda: { create: vi.fn(async () => ({ id: 1 })) },
  itemVenda: { create: vi.fn() },
  produto: { updateMany: vi.fn() },
};
const dbMock = {
  usuario: { findFirst: vi.fn() },
  auditLog: { create: vi.fn() },
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
const params = (dataVenda: string) => ({ dataVenda, clienteId: 5, produtoNome: "Produto X", valorVenda: 300, parcelas: 3 });

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.usuario.findFirst.mockResolvedValue({ id: 1 });
  regraDbMock.regraDoClienteNaData.mockResolvedValue({ ...REGRA_PADRAO, diaCorte: 25 });
  creditMock.checkCredito.mockResolvedValue({ ok: true });
});

describe("criar_venda (IA) e a regra da empresa", () => {
  it("lê a regra na data da venda e usa o corte dela no limite", async () => {
    await executeAiAction("criar_venda", params("2026-03-22"), ctx);
    expect(regraDbMock.regraDoClienteNaData).toHaveBeenCalledWith(5, new Date("2026-03-22"));
    expect(creditMock.checkCredito).toHaveBeenCalledWith(5, 100, 25);
  });

  it("data inválida cai em hoje", async () => {
    const antes = Date.now();
    await executeAiAction("criar_venda", params("ontem"), ctx);
    const data = regraDbMock.regraDoClienteNaData.mock.calls[0]?.[1] as Date;
    expect(data.getTime()).toBeGreaterThanOrEqual(antes - 1000);
  });
});
