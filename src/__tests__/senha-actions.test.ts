import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * D-02/D-03: as duas Server Actions de senha carregam guarda propria (nao
 * dependem do render da pagina). Mock de @/lib/session (nao @/lib/guards) —
 * guards.ts real roda por cima da sessao mockada, igual ao padrao de
 * src/__tests__/guards.test.ts.
 */
const dbMock = {
  usuario: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};
const sessionMock = { getSession: vi.fn() };
const auditMock = { createAuditLog: vi.fn() };

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/session", () => sessionMock);
vi.mock("@/lib/audit", () => auditMock);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { trocarMinhaSenha, redefinirSenhaDeUsuario } = await import("@/lib/senha-actions");
const { hashSenha, ehHashScrypt, verificarSenha } = await import("@/lib/senha");

function fd(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("trocarMinhaSenha (D-03)", () => {
  it("Teste 1: sessao valida + senha atual correta grava hash no id da sessao e devolve ok", async () => {
    sessionMock.getSession.mockResolvedValue({ id: 9, username: "jakeline", role: "vendedor" });
    const hashAtual = await hashSenha("senhaAtual123");
    dbMock.usuario.findUnique.mockResolvedValue({ id: 9, password: hashAtual });
    dbMock.usuario.update.mockResolvedValue({});

    const resultado = await trocarMinhaSenha(
      fd({ atual: "senhaAtual123", nova: "senhaNova456", confirmacao: "senhaNova456" })
    );

    expect(resultado.ok).toBe(true);
    expect(dbMock.usuario.update).toHaveBeenCalledTimes(1);
    const args = dbMock.usuario.update.mock.calls[0][0];
    expect(args.where).toEqual({ id: 9 });
    expect(ehHashScrypt(args.data.password)).toBe(true);
    expect(await verificarSenha("senhaNova456", args.data.password)).toBe(true);
  });

  it("Teste 2: o id usado no update e' o da sessao, mesmo com um `id` diferente no FormData", async () => {
    sessionMock.getSession.mockResolvedValue({ id: 9, username: "jakeline", role: "vendedor" });
    const hashAtual = await hashSenha("senhaAtual123");
    dbMock.usuario.findUnique.mockResolvedValue({ id: 9, password: hashAtual });
    dbMock.usuario.update.mockResolvedValue({});

    await trocarMinhaSenha(
      fd({
        id: "1",
        atual: "senhaAtual123",
        nova: "senhaNova456",
        confirmacao: "senhaNova456",
      })
    );

    const args = dbMock.usuario.update.mock.calls[0][0];
    expect(args.where).toEqual({ id: 9 });
  });

  it("Teste 3: senha atual errada devolve nao-ok com mensagem, nada e' gravado", async () => {
    sessionMock.getSession.mockResolvedValue({ id: 9, username: "jakeline", role: "vendedor" });
    const hashAtual = await hashSenha("senhaAtual123");
    dbMock.usuario.findUnique.mockResolvedValue({ id: 9, password: hashAtual });

    const resultado = await trocarMinhaSenha(
      fd({ atual: "errada", nova: "senhaNova456", confirmacao: "senhaNova456" })
    );

    expect(resultado.ok).toBe(false);
    expect(resultado.erro).toBeTruthy();
    expect(dbMock.usuario.update).not.toHaveBeenCalled();
  });

  it("Teste 4: confirmacao divergente devolve nao-ok e nao grava", async () => {
    sessionMock.getSession.mockResolvedValue({ id: 9, username: "jakeline", role: "vendedor" });
    const hashAtual = await hashSenha("senhaAtual123");
    dbMock.usuario.findUnique.mockResolvedValue({ id: 9, password: hashAtual });

    const resultado = await trocarMinhaSenha(
      fd({ atual: "senhaAtual123", nova: "senhaNova456", confirmacao: "outraCoisa789" })
    );

    expect(resultado.ok).toBe(false);
    expect(dbMock.usuario.update).not.toHaveBeenCalled();
  });

  it("Teste 5: nova senha com 7 caracteres devolve nao-ok e nao grava", async () => {
    sessionMock.getSession.mockResolvedValue({ id: 9, username: "jakeline", role: "vendedor" });
    const hashAtual = await hashSenha("senhaAtual123");
    dbMock.usuario.findUnique.mockResolvedValue({ id: 9, password: hashAtual });

    const resultado = await trocarMinhaSenha(
      fd({ atual: "senhaAtual123", nova: "curta12", confirmacao: "curta12" })
    );

    expect(resultado.ok).toBe(false);
    expect(dbMock.usuario.update).not.toHaveBeenCalled();
  });

  it("Teste 6: nova senha igual a atual devolve nao-ok e nao grava", async () => {
    sessionMock.getSession.mockResolvedValue({ id: 9, username: "jakeline", role: "vendedor" });
    const hashAtual = await hashSenha("senhaAtual123");
    dbMock.usuario.findUnique.mockResolvedValue({ id: 9, password: hashAtual });

    const resultado = await trocarMinhaSenha(
      fd({ atual: "senhaAtual123", nova: "senhaAtual123", confirmacao: "senhaAtual123" })
    );

    expect(resultado.ok).toBe(false);
    expect(dbMock.usuario.update).not.toHaveBeenCalled();
  });

  it("Teste 7: sem sessao a action lanca e nao grava", async () => {
    sessionMock.getSession.mockResolvedValue(null);

    await expect(
      trocarMinhaSenha(fd({ atual: "x", nova: "senhaNova456", confirmacao: "senhaNova456" }))
    ).rejects.toThrow();
    expect(dbMock.usuario.update).not.toHaveBeenCalled();
  });
});

describe("redefinirSenhaDeUsuario (D-02)", () => {
  it("Teste 8: sessao de vendedor lanca e nao grava nada (guarda na propria action, T-CYM-01)", async () => {
    sessionMock.getSession.mockResolvedValue({ id: 2, username: "jakeline", role: "vendedor" });

    await expect(
      redefinirSenhaDeUsuario(fd({ usuarioId: "1", nova: "senhaForte123" }))
    ).rejects.toThrow();
    expect(dbMock.usuario.update).not.toHaveBeenCalled();
  });

  it("Teste 9: sessao admin com usuarioId valido grava hash no id ALVO, nao no id do admin", async () => {
    sessionMock.getSession.mockResolvedValue({ id: 1, username: "admin", role: "admin" });
    dbMock.usuario.findUnique.mockResolvedValue({ id: 5, username: "vendedor5" });
    dbMock.usuario.update.mockResolvedValue({});

    const resultado = await redefinirSenhaDeUsuario(fd({ usuarioId: "5", nova: "senhaForte123" }));

    expect(resultado.ok).toBe(true);
    expect(dbMock.usuario.update).toHaveBeenCalledTimes(1);
    const args = dbMock.usuario.update.mock.calls[0][0];
    expect(args.where).toEqual({ id: 5 });
    expect(ehHashScrypt(args.data.password)).toBe(true);
  });

  it("Teste 10: usuarioId nao numerico, zero, negativo ou inexistente devolve nao-ok e nao grava (T-CYM-02)", async () => {
    sessionMock.getSession.mockResolvedValue({ id: 1, username: "admin", role: "admin" });

    const naoNumerico = await redefinirSenhaDeUsuario(fd({ usuarioId: "abc", nova: "senhaForte123" }));
    expect(naoNumerico.ok).toBe(false);

    const zero = await redefinirSenhaDeUsuario(fd({ usuarioId: "0", nova: "senhaForte123" }));
    expect(zero.ok).toBe(false);

    const negativo = await redefinirSenhaDeUsuario(fd({ usuarioId: "-1", nova: "senhaForte123" }));
    expect(negativo.ok).toBe(false);

    dbMock.usuario.findUnique.mockResolvedValue(null);
    const inexistente = await redefinirSenhaDeUsuario(fd({ usuarioId: "999", nova: "senhaForte123" }));
    expect(inexistente.ok).toBe(false);

    expect(dbMock.usuario.update).not.toHaveBeenCalled();
  });

  it("Teste 11: sucesso grava createAuditLog sem a senha em lugar nenhum dos detalhes (T-CYM-05, T-CYM-06)", async () => {
    sessionMock.getSession.mockResolvedValue({ id: 1, username: "admin", role: "admin" });
    dbMock.usuario.findUnique.mockResolvedValue({ id: 5, username: "vendedor5" });
    dbMock.usuario.update.mockResolvedValue({});

    const senhaUsadaNoTeste = "senhaForteQueNaoPodeVazar987";
    await redefinirSenhaDeUsuario(fd({ usuarioId: "5", nova: senhaUsadaNoTeste }));

    expect(auditMock.createAuditLog).toHaveBeenCalledTimes(1);
    const [, detalhes] = auditMock.createAuditLog.mock.calls[0];
    expect(JSON.stringify(detalhes)).not.toContain(senhaUsadaNoTeste);
  });

  it("Teste 12: o retorno da action nunca traz a senha", async () => {
    sessionMock.getSession.mockResolvedValue({ id: 1, username: "admin", role: "admin" });
    dbMock.usuario.findUnique.mockResolvedValue({ id: 5, username: "vendedor5" });
    dbMock.usuario.update.mockResolvedValue({});

    const senhaUsadaNoTeste = "outraSenhaForteQueNaoPodeVazar";
    const resultado = await redefinirSenhaDeUsuario(fd({ usuarioId: "5", nova: senhaUsadaNoTeste }));

    expect(JSON.stringify(resultado)).not.toContain(senhaUsadaNoTeste);
    const chavesPermitidas = new Set(["ok", "erro"]);
    for (const chave of Object.keys(resultado)) {
      expect(chavesPermitidas.has(chave)).toBe(true);
    }
  });
});
