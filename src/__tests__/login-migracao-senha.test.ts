import { describe, it, expect, vi, beforeEach } from "vitest";

// Mesmo padrao de src/__tests__/clientes-post-route.test.ts: objeto local de
// mock, nunca importar prisma/session reais no teste.
const dbMock = {
  usuario: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};
const sessionMock = { createSessionToken: vi.fn() };

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/session", () => sessionMock);

const { POST } = await import("@/app/api/auth/login/route");
const { hashSenha, ehHashScrypt } = await import("@/lib/senha");

function fakeRequest(body: unknown) {
  return new Request("http://local/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.createSessionToken.mockResolvedValue("token-fake");
});

describe("POST /api/auth/login — migracao transparente de senha em texto puro para hash (D-04)", () => {
  it("Teste 1 (regressao critica): usuario com senha em texto puro autentica, e sai do login com hash gravado", async () => {
    // Cenario real de producao: admin e jakeline hoje tem senha em texto
    // puro. Este teste e' o que garante que a migracao nao tranca os dois
    // usuarios existentes para fora.
    dbMock.usuario.findUnique.mockResolvedValue({
      id: 1,
      username: "admin",
      role: "admin",
      nomeExibicao: "Admin",
      password: "senhaLegadaDe17Caracteres",
    });
    dbMock.usuario.update.mockResolvedValue({});

    const res = await POST(
      fakeRequest({ username: "admin", password: "senhaLegadaDe17Caracteres" })
    );

    expect(res.status).toBe(200);
    expect(dbMock.usuario.update).toHaveBeenCalledTimes(1);
    const args = dbMock.usuario.update.mock.calls[0][0];
    expect(args.where).toEqual({ id: 1 });
    expect(ehHashScrypt(args.data.password)).toBe(true);
  });

  it("Teste 2: usuario que ja tem hash autentica sem escrita extra", async () => {
    const hash = await hashSenha("segredo123");
    dbMock.usuario.findUnique.mockResolvedValue({
      id: 2,
      username: "jakeline",
      role: "vendedor",
      nomeExibicao: "Jakeline",
      password: hash,
    });

    const res = await POST(fakeRequest({ username: "jakeline", password: "segredo123" }));

    expect(res.status).toBe(200);
    expect(dbMock.usuario.update).not.toHaveBeenCalled();
  });

  it("Teste 3: senha errada devolve 401 com a mensagem generica de hoje, update nao e' chamado", async () => {
    dbMock.usuario.findUnique.mockResolvedValue({
      id: 1,
      username: "admin",
      role: "admin",
      password: "senhaLegada",
    });

    const res = await POST(fakeRequest({ username: "admin", password: "errada" }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Usuário ou senha inválidos.");
    expect(dbMock.usuario.update).not.toHaveBeenCalled();
  });

  it("Teste 4: usuario inexistente devolve exatamente o mesmo status e corpo do Teste 3 (sem enumeracao, T-CYM-03)", async () => {
    dbMock.usuario.findUnique.mockResolvedValue(null);

    const res = await POST(fakeRequest({ username: "fantasma", password: "qualquer" }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Usuário ou senha inválidos.");
    expect(dbMock.usuario.update).not.toHaveBeenCalled();
  });

  it("Teste 5: se a gravacao do re-hash falhar, o login legado ainda responde 200", async () => {
    dbMock.usuario.findUnique.mockResolvedValue({
      id: 1,
      username: "admin",
      role: "admin",
      password: "senhaLegada",
    });
    dbMock.usuario.update.mockRejectedValue(new Error("db fora do ar"));

    const res = await POST(fakeRequest({ username: "admin", password: "senhaLegada" }));

    expect(res.status).toBe(200);
  });
});
