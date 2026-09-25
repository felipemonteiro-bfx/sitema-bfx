import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = {
  empresaParceira: { create: vi.fn(), update: vi.fn() },
};

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/guards", () => ({ requireAdminOrThrow: vi.fn().mockResolvedValue({ id: 1, role: "admin" }), requireSessionOrThrow: vi.fn() }));
vi.mock("@/lib/audit", () => ({ createAuditLog: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/db-search", () => ({ fuzzyFindProdutos: vi.fn(), unaccentFindClienteIds: vi.fn() }));

const { addEmpresa, updateEmpresa } = await import("@/app/(app)/cadastros/page");

function form(campos: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  dbMock.empresaParceira.create.mockReset().mockResolvedValue({});
  dbMock.empresaParceira.update.mockReset().mockResolvedValue({});
});

describe("cadastro da empresa — e-mail em cópia", () => {
  it("nova empresa grava a cópia normalizada", async () => {
    await addEmpresa(form({ nome: "Prime", emailCopia: " Fin@Prudent.com.br; ops@prudent.com.br " }));
    expect(dbMock.empresaParceira.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ nome: "PRIME", emailCopia: "fin@prudent.com.br, ops@prudent.com.br" }),
    });
  });

  it("edição grava a cópia; campo vazio remove", async () => {
    await updateEmpresa(form({ id: "7", nome: "Prime", emailCopia: "fin@prudent.com.br" }));
    expect(dbMock.empresaParceira.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: expect.objectContaining({ emailCopia: "fin@prudent.com.br" }),
    });

    await updateEmpresa(form({ id: "7", nome: "Prime", emailCopia: "" }));
    expect(dbMock.empresaParceira.update).toHaveBeenLastCalledWith({
      where: { id: 7 },
      data: expect.objectContaining({ emailCopia: null }),
    });
  });

  it("endereço inválido não grava", async () => {
    await expect(updateEmpresa(form({ id: "7", nome: "Prime", emailCopia: "fin@prudent.com.br, errado" }))).rejects.toThrow("errado");
    await expect(addEmpresa(form({ nome: "Prime", emailCopia: "errado" }))).rejects.toThrow("errado");
    expect(dbMock.empresaParceira.update).not.toHaveBeenCalled();
    expect(dbMock.empresaParceira.create).not.toHaveBeenCalled();
  });
});
