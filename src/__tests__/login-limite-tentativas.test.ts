import { describe, it, expect, vi, beforeEach } from "vitest";

// Limite de tentativas do login (2026-09-11, achado MEDIUM do hook de
// segurança + revisão). Mesmo padrão de mock de login-migracao-senha.test.ts;
// cada teste reimporta a rota para começar com os limitadores zerados.
const dbMock = {
  usuario: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};
const sessionMock = { createSessionToken: vi.fn() };

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/session", () => sessionMock);

const { hashSenha } = await import("@/lib/senha");
const HASH = await hashSenha("certa123");
const ADMIN = { id: 1, username: "admin", role: "admin", nomeExibicao: "Admin", password: HASH };

function pedido(senha: string, ip: string | null = "200.1.1.1", usuario = "admin", extras: Record<string, string> = {}) {
  const headers: Record<string, string> = { ...extras };
  if (ip) headers["cf-connecting-ip"] = ip;
  return new Request("http://local/api/auth/login", {
    method: "POST",
    headers,
    body: JSON.stringify({ username: usuario, password: senha }),
  });
}

async function rota() {
  return (await import("@/app/api/auth/login/route")).POST;
}

/** Só o admin existe; qualquer outro nome é inexistente. */
function soAdminExiste() {
  dbMock.usuario.findUnique.mockImplementation(async ({ where }: { where: { username: string } }) =>
    where.username === "admin" ? ADMIN : null
  );
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  sessionMock.createSessionToken.mockResolvedValue("token-fake");
  dbMock.usuario.findUnique.mockResolvedValue(ADMIN);
});

describe("POST /api/auth/login — limite de tentativas", () => {
  it("5 senhas erradas do mesmo IP no mesmo usuário: a 6ª recebe 429 com Retry-After, mesmo com a senha certa", async () => {
    const POST = await rota();
    for (let i = 0; i < 5; i++) {
      expect((await POST(pedido("errada"))).status).toBe(401);
    }
    const res = await POST(pedido("certa123"));
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect((await res.json()).error).toMatch(/Muitas tentativas/);
    expect(sessionMock.createSessionToken).not.toHaveBeenCalled();
  });

  it("requisições simultâneas não furam o limite: de 8 ao mesmo tempo, só 5 chegam à senha", async () => {
    const POST = await rota();
    const respostas = await Promise.all(Array.from({ length: 8 }, () => POST(pedido("errada"))));
    const status = respostas.map((r) => r.status);
    expect(status.filter((s) => s === 401)).toHaveLength(5);
    expect(status.filter((s) => s === 429)).toHaveLength(3);
  });

  it("outro IP ainda entra: o bloqueio de 5 é do par IP+usuário", async () => {
    const POST = await rota();
    for (let i = 0; i < 5; i++) await POST(pedido("errada", "200.1.1.1"));
    expect((await POST(pedido("certa123", "200.2.2.2"))).status).toBe(200);
  });

  it("login certo zera as falhas do par IP+usuário", async () => {
    const POST = await rota();
    for (let i = 0; i < 4; i++) await POST(pedido("errada"));
    expect((await POST(pedido("certa123"))).status).toBe(200);
    for (let i = 0; i < 4; i++) await POST(pedido("errada"));
    expect((await POST(pedido("certa123"))).status).toBe(200);
  });

  it("login certo NÃO zera o limite do IP — uma conta válida não serve para limpar a varredura", async () => {
    soAdminExiste();
    const POST = await rota();
    for (let i = 0; i < 15; i++) await POST(pedido("errada", "200.9.9.9", `usuario${i}`));
    expect((await POST(pedido("certa123", "200.9.9.9"))).status).toBe(200);
    for (let i = 15; i < 20; i++) await POST(pedido("errada", "200.9.9.9", `usuario${i}`));
    expect((await POST(pedido("certa123", "200.9.9.9"))).status).toBe(429);
  });

  it("usuário inexistente bloqueia no mesmo ponto do par — o 429 não revela quem existe", async () => {
    dbMock.usuario.findUnique.mockResolvedValue(null);
    const POST = await rota();
    for (let i = 0; i < 5; i++) {
      expect((await POST(pedido("qualquer", "200.1.1.1", "fantasma"))).status).toBe(401);
    }
    expect((await POST(pedido("qualquer", "200.1.1.1", "fantasma"))).status).toBe(429);
  });

  it("10 falhas no mesmo usuário vindas de IPs diferentes bloqueiam o usuário", async () => {
    const POST = await rota();
    for (let i = 0; i < 10; i++) await POST(pedido("errada", `10.0.0.${i}`));
    expect((await POST(pedido("certa123", "10.0.1.1"))).status).toBe(429);
  });

  it("nome inexistente também conta por usuário de qualquer IP — mesmo 429 de uma conta real", async () => {
    dbMock.usuario.findUnique.mockResolvedValue(null);
    const POST = await rota();
    for (let i = 0; i < 10; i++) await POST(pedido("qualquer", `10.0.0.${i}`, "fantasma"));
    expect((await POST(pedido("qualquer", "10.0.1.1", "fantasma"))).status).toBe(429);
  });

  it("um IP que varre 20 usuários é bloqueado, inclusive para o admin", async () => {
    dbMock.usuario.findUnique.mockResolvedValue(null);
    const POST = await rota();
    for (let i = 0; i < 20; i++) await POST(pedido("errada", "200.9.9.9", `usuario${i}`));
    dbMock.usuario.findUnique.mockResolvedValue(ADMIN);
    expect((await POST(pedido("certa123", "200.9.9.9"))).status).toBe(429);
  });

  it("x-forwarded-for forjado não vira IP novo: sem Cloudflare, o par conta como a mesma origem", async () => {
    const POST = await rota();
    for (let i = 0; i < 5; i++) {
      await POST(pedido("errada", null, "admin", { "x-forwarded-for": `9.9.9.${i}` }));
    }
    expect((await POST(pedido("certa123", null, "admin", { "x-forwarded-for": "8.8.8.8" }))).status).toBe(429);
  });

  it("sem Cloudflare (tailnet) o limite por IP não se aplica — erros de um não trancam todo mundo", async () => {
    soAdminExiste();
    const POST = await rota();
    for (let i = 0; i < 20; i++) await POST(pedido("errada", null, `usuario${i}`));
    expect((await POST(pedido("certa123", null))).status).toBe(200);
  });

  it("nome de usuário gigante: 400 e nada é consultado", async () => {
    const POST = await rota();
    const res = await POST(pedido("x", "200.1.1.1", "a".repeat(200)));
    expect(res.status).toBe(400);
    expect(dbMock.usuario.findUnique).not.toHaveBeenCalled();
  });
});
