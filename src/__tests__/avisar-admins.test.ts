import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  usuarioFindMany: vi.fn(),
  notificacaoFindFirst: vi.fn(),
  notificacaoCreateMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    usuario: { findMany: mocks.usuarioFindMany },
    notificacao: {
      findFirst: mocks.notificacaoFindFirst,
      createMany: mocks.notificacaoCreateMany,
    },
  },
}));

import { avisarAdmins } from "@/lib/avisar-admins";

describe("avisarAdmins", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.usuarioFindMany.mockResolvedValue([{ id: 42 }]);
    mocks.notificacaoFindFirst.mockResolvedValue(null);
    mocks.notificacaoCreateMany.mockResolvedValue({ count: 1 });
  });

  it("usa os IDs dos administradores existentes, sem assumir o ID 1", async () => {
    await avisarAdmins([{ mensagem: "Relatório enviado", link: "/relatorios" }]);

    expect(mocks.usuarioFindMany).toHaveBeenCalledWith({
      where: { role: "admin" },
      select: { id: true },
    });
    expect(mocks.notificacaoCreateMany).toHaveBeenCalledWith({
      data: [{ mensagem: "Relatório enviado", link: "/relatorios", usuarioId: 42 }],
    });
  });

  it("inclui o vendedor existente sem duplicar quem já é administrador", async () => {
    mocks.usuarioFindMany.mockResolvedValue([{ id: 42 }, { id: 77 }]);

    await avisarAdmins([{ mensagem: "Venda enviada", link: "/historico" }], [77]);

    expect(mocks.usuarioFindMany).toHaveBeenCalledWith({
      where: { OR: [{ role: "admin" }, { id: { in: [77] } }] },
      select: { id: true },
    });
    expect(mocks.notificacaoCreateMany).toHaveBeenCalledWith({
      data: [
        { mensagem: "Venda enviada", link: "/historico", usuarioId: 42 },
        { mensagem: "Venda enviada", link: "/historico", usuarioId: 77 },
      ],
    });
  });

  it("não propaga falha da notificação para a operação que está avisando", async () => {
    mocks.notificacaoCreateMany.mockRejectedValue(new Error("Foreign key constraint violated"));

    await expect(avisarAdmins([{ mensagem: "Relatório enviado", link: "/relatorios" }])).resolves.toBe(0);
  });
});
