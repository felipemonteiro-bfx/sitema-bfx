import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * D-04/D-06: nenhum ponto de escrita de senha sem UI (Gestao RH, tools de
 * usuario da IA) pode gravar senha crua. Mesmo padrao de mock local de
 * src/__tests__/fornecedor-rbac-auditoria.test.ts.
 */
const dbMock = {
  usuario: {
    create: vi.fn(),
    update: vi.fn(),
  },
  auditLog: { create: vi.fn() },
};
const guardsMock = { requireAdmin: vi.fn(), requireAdminOrThrow: vi.fn() };

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/guards", () => guardsMock);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { addUser } = await import("@/app/(app)/gestao-rh/page");
const { executeAiAction } = await import("@/lib/ai-actions");
const { ehHashScrypt, verificarSenha } = await import("@/lib/senha");

type Ctx = { role: "admin" | "vendedor"; username: string; displayName: string; userId: number };
const adminCtx: Ctx = { role: "admin", username: "admin", displayName: "Admin", userId: 1 };
const vendedorCtx: Ctx = { role: "vendedor", username: "jakeline", displayName: "Jakeline", userId: 2 };

function formDataAddUser(overrides: Partial<Record<"nome" | "login" | "senha" | "role", string>> = {}) {
  const fd = new FormData();
  fd.set("nome", overrides.nome ?? "Novo Usuario");
  fd.set("login", overrides.login ?? "novo");
  fd.set("senha", overrides.senha ?? "senhaCrua123");
  fd.set("role", overrides.role ?? "vendedor");
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  guardsMock.requireAdminOrThrow.mockResolvedValue({ id: 1, username: "admin", role: "admin" });
  dbMock.auditLog.create.mockResolvedValue({});
});

describe("addUser (/gestao-rh) grava hash, nunca senha crua", () => {
  it("Teste 1: sessao admin cria usuario com password hasheado que verificarSenha aceita", async () => {
    dbMock.usuario.create.mockResolvedValue({ id: 5 });

    await addUser(formDataAddUser({ senha: "senhaCrua123" }));

    expect(dbMock.usuario.create).toHaveBeenCalledTimes(1);
    const args = dbMock.usuario.create.mock.calls[0][0];
    expect(ehHashScrypt(args.data.password)).toBe(true);
    expect(await verificarSenha("senhaCrua123", args.data.password)).toBe(true);
  });

  it("Teste 2: sessao de vendedor lanca e nao chama create (guarda existente preservada)", async () => {
    guardsMock.requireAdminOrThrow.mockRejectedValue(
      new Error("Acesso negado. Requer perfil admin.")
    );

    await expect(addUser(formDataAddUser())).rejects.toThrow();
    expect(dbMock.usuario.create).not.toHaveBeenCalled();
  });
});

describe("executeAiAction — criar_usuario/atualizar_usuario gravam hash (D-04, D-06)", () => {
  it("Teste 3: criar_usuario grava password hasheado que verificarSenha aceita", async () => {
    dbMock.usuario.create.mockResolvedValue({ id: 7 });

    await executeAiAction(
      "criar_usuario",
      { username: "novo", password: "senhaCrua456", role: "vendedor" },
      adminCtx
    );

    expect(dbMock.usuario.create).toHaveBeenCalledTimes(1);
    const args = dbMock.usuario.create.mock.calls[0][0];
    expect(ehHashScrypt(args.data.password)).toBe(true);
    expect(await verificarSenha("senhaCrua456", args.data.password)).toBe(true);
  });

  it("Teste 4a: atualizar_usuario com password grava hasheado", async () => {
    dbMock.usuario.update.mockResolvedValue({ id: 7 });

    await executeAiAction("atualizar_usuario", { id: 7, password: "novaSenha789" }, adminCtx);

    expect(dbMock.usuario.update).toHaveBeenCalledTimes(1);
    const args = dbMock.usuario.update.mock.calls[0][0];
    expect(ehHashScrypt(args.data.password)).toBe(true);
    expect(await verificarSenha("novaSenha789", args.data.password)).toBe(true);
  });

  it("Teste 4b: atualizar_usuario sem password nao inclui a chave password no data (nao zera senha de ninguem)", async () => {
    dbMock.usuario.update.mockResolvedValue({ id: 7 });

    await executeAiAction("atualizar_usuario", { id: 7, nomeExibicao: "Novo Nome" }, adminCtx);

    expect(dbMock.usuario.update).toHaveBeenCalledTimes(1);
    const args = dbMock.usuario.update.mock.calls[0][0];
    expect(Object.prototype.hasOwnProperty.call(args.data, "password")).toBe(false);
  });

  it("Teste 5: criar_usuario com sessao de vendedor lanca e nao escreve (guarda requireAdmin(ctx) preservada)", async () => {
    await expect(
      executeAiAction(
        "criar_usuario",
        { username: "x", password: "senhaCrua123", role: "vendedor" },
        vendedorCtx
      )
    ).rejects.toThrow();

    expect(dbMock.usuario.create).not.toHaveBeenCalled();
  });
});
