import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  processarRelatorioMensal: vi.fn(),
  requireAdminOrThrow: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/relatorio-mensal-service", () => ({
  processarRelatorioMensal: mocks.processarRelatorioMensal,
}));
vi.mock("@/lib/guards", () => ({ requireAdminOrThrow: mocks.requireAdminOrThrow }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

const { reenviarRelatorioMensal } = await import("@/app/(app)/relatorios/mensais/actions");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdminOrThrow.mockResolvedValue({ id: 1, role: "admin" });
  mocks.processarRelatorioMensal.mockResolvedValue({ periodo: "2026-08", resultados: [] });
});

describe("reenviarRelatorioMensal", () => {
  it("forca o reenvio da empresa e periodo escolhidos e revalida o historico", async () => {
    const formData = new FormData();
    formData.set("empresaId", "42");
    formData.set("periodo", "2026-08");

    await reenviarRelatorioMensal(formData);

    expect(mocks.requireAdminOrThrow).toHaveBeenCalledOnce();
    expect(mocks.processarRelatorioMensal).toHaveBeenCalledWith({
      empresaId: 42,
      periodo: "2026-08",
      force: true,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/relatorios/mensais");
  });

  it("nao processa nem revalida quando a guarda de admin rejeita", async () => {
    mocks.requireAdminOrThrow.mockRejectedValue(new Error("Acesso negado."));
    const formData = new FormData();
    formData.set("empresaId", "42");
    formData.set("periodo", "2026-08");

    await expect(reenviarRelatorioMensal(formData)).rejects.toThrow("Acesso negado.");

    expect(mocks.processarRelatorioMensal).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
