import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminOrThrow: vi.fn(),
  revalidatePath: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/relatorio-mensal-service", () => ({ processarRelatorioMensal: vi.fn() }));
vi.mock("@/lib/guards", () => ({ requireAdminOrThrow: mocks.requireAdminOrThrow }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/db", () => ({ prisma: { empresaParceira: { update: mocks.update } } }));

const { salvarEmailCopia } = await import("@/app/(app)/relatorios/mensais/actions");

function form(empresaId: string, emailCopia: string) {
  const fd = new FormData();
  fd.set("empresaId", empresaId);
  fd.set("emailCopia", emailCopia);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdminOrThrow.mockResolvedValue({ id: 1, role: "admin" });
  mocks.update.mockResolvedValue({});
});

describe("salvarEmailCopia", () => {
  it("grava a cópia normalizada da empresa e revalida a tela", async () => {
    const r = await salvarEmailCopia(undefined, form("7", " Fin@Prudent.com.br; ops@prudent.com.br "));

    expect(mocks.requireAdminOrThrow).toHaveBeenCalledOnce();
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { emailCopia: "fin@prudent.com.br, ops@prudent.com.br" },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/relatorios/mensais");
    expect(r).toEqual({ ok: true, valor: "fin@prudent.com.br, ops@prudent.com.br" });
  });

  it("campo vazio remove a cópia", async () => {
    await salvarEmailCopia(undefined, form("7", ""));
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { emailCopia: null } });
  });

  it("endereço inválido não grava e devolve o erro", async () => {
    const r = await salvarEmailCopia(undefined, form("7", "fin@prudent.com.br, errado"));

    expect(mocks.update).not.toHaveBeenCalled();
    expect(r).toEqual({ ok: false, erro: "E-mail inválido: errado" });
  });

  it("não grava quando a guarda de admin rejeita", async () => {
    mocks.requireAdminOrThrow.mockRejectedValue(new Error("Não autorizado"));

    await expect(salvarEmailCopia(undefined, form("7", "fin@prudent.com.br"))).rejects.toThrow("Não autorizado");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("não grava com empresa inválida", async () => {
    const r = await salvarEmailCopia(undefined, form("abc", "fin@prudent.com.br"));
    expect(mocks.update).not.toHaveBeenCalled();
    expect(r).toMatchObject({ ok: false });
  });
});
