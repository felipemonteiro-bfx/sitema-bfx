import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "path";

// Cast helper: process.env tem NODE_ENV/CRON_SECRET somente leitura nas typings novas
// do @types/node, mas em runtime o objeto e mutavel (mesmo padrao de env-validation.test.ts).
type MutableEnv = Record<string, string | undefined>;

const OLD_MTIME = Date.now() - 200 * 24 * 60 * 60 * 1000; // 200 dias atras (> MAX_AGE_DAYS=90)

// A rota faz `import fs from "fs/promises"` (default import), entao o mock precisa expor
// `default` alem dos named exports — senao `fs` chega undefined e a rota estoura em 500.
// Os named exports e o default compartilham as mesmas instancias de vi.fn(), de modo que
// `await import("fs/promises")` nos testes observa exatamente as chamadas que a rota fez.
vi.mock("fs/promises", () => {
  const readdir = vi.fn();
  const stat = vi.fn();
  const unlink = vi.fn();
  return { readdir, stat, unlink, default: { readdir, stat, unlink } };
});

vi.mock("@/lib/db", () => ({
  prisma: {
    produto: { findMany: vi.fn() },
    config: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/minio", () => ({
  cleanupMinIOPrefix: vi.fn(),
  isMinIOConfigured: vi.fn(),
}));

function dirent(name: string) {
  return { name, isFile: () => true };
}

function fakeRequest(secretHeader?: string) {
  const headers = new Headers();
  if (secretHeader !== undefined) headers.set("authorization", secretHeader);
  return new Request("http://local/api/cron/cleanup-uploads", { method: "GET", headers });
}

describe("GET /api/cron/cleanup-uploads — trava de regressao STO-06/D-05", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    (process as { env: NodeJS.ProcessEnv }).env = { ...originalEnv } as NodeJS.ProcessEnv;
  });

  it("sem CRON_SECRET correto no header, responde 401 antes de qualquer varredura", async () => {
    (process.env as MutableEnv).CRON_SECRET = "segredo-correto";

    const { prisma } = await import("@/lib/db");
    const { readdir } = await import("fs/promises");
    const { GET } = await import("@/app/api/cron/cleanup-uploads/route");

    const res = await GET(fakeRequest("Bearer segredo-errado"));

    expect(res.status).toBe(401);
    expect(vi.mocked(prisma.produto.findMany)).not.toHaveBeenCalled();
    expect(vi.mocked(readdir)).not.toHaveBeenCalled();
  });

  it(
    "Config.logoPath legado /uploads/1-logo.png ainda referenciado no banco: unlink NAO e chamado para ele; " +
      "arquivo antigo nao referenciado: unlink E chamado; cleanupMinIOPrefix chamado no maximo 1x com o prefixo de relatorios",
    async () => {
      (process.env as MutableEnv).CRON_SECRET = "segredo-correto";

      const { prisma } = await import("@/lib/db");
      const { readdir, stat, unlink } = await import("fs/promises");
      const { cleanupMinIOPrefix, isMinIOConfigured } = await import("@/lib/minio");

      vi.mocked(prisma.produto.findMany).mockResolvedValue([]);
      vi.mocked(prisma.config.findFirst).mockResolvedValue({
        logoPath: "/uploads/1-logo.png",
      } as never);

      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      vi.mocked(readdir).mockImplementation(async (dir: unknown) => {
        if (dir === uploadsDir) {
          return [dirent("1-logo.png"), dirent("orfao-antigo.png")] as never;
        }
        return [] as never;
      });
      vi.mocked(stat).mockResolvedValue({ mtimeMs: OLD_MTIME } as never);
      vi.mocked(isMinIOConfigured).mockReturnValue(true);
      vi.mocked(cleanupMinIOPrefix).mockResolvedValue(0);

      const { GET } = await import("@/app/api/cron/cleanup-uploads/route");
      const res = await GET(fakeRequest("Bearer segredo-correto"));

      expect(res.status).toBe(200);

      // Arquivo legado ainda referenciado no banco: NUNCA removido (nucleo de STO-06).
      const unlinkCalls = vi.mocked(unlink).mock.calls.map((c) => c[0]);
      expect(unlinkCalls).not.toContain(path.join(uploadsDir, "1-logo.png"));

      // Arquivo orfao (nao referenciado) e antigo: removido normalmente (cron nao parou de funcionar).
      expect(unlinkCalls).toContain(path.join(uploadsDir, "orfao-antigo.png"));

      // cleanupMinIOPrefix nunca chamado mais de uma vez, e sempre com o prefixo de relatorios —
      // nunca string vazia, nunca prefixo de asset.
      expect(cleanupMinIOPrefix).toHaveBeenCalledTimes(1);
      expect(cleanupMinIOPrefix).toHaveBeenCalledWith("relatorios/mensal/", 180);
    }
  );

  it(
    "Config.logoPath em URL absoluta do MinIO: responde 200 e nenhuma chamada de remocao de objeto MinIO " +
      "alem da de relatorios (D-05)",
    async () => {
      (process.env as MutableEnv).CRON_SECRET = "segredo-correto";

      const { prisma } = await import("@/lib/db");
      const { readdir, stat } = await import("fs/promises");
      const { cleanupMinIOPrefix, isMinIOConfigured } = await import("@/lib/minio");

      vi.mocked(prisma.produto.findMany).mockResolvedValue([]);
      vi.mocked(prisma.config.findFirst).mockResolvedValue({
        logoPath: "http://minio.local:9000/produtos/logo/1700000000000-logo.png",
      } as never);
      vi.mocked(readdir).mockResolvedValue([] as never);
      vi.mocked(stat).mockResolvedValue({ mtimeMs: OLD_MTIME } as never);
      vi.mocked(isMinIOConfigured).mockReturnValue(true);
      vi.mocked(cleanupMinIOPrefix).mockResolvedValue(0);

      const { GET } = await import("@/app/api/cron/cleanup-uploads/route");
      const res = await GET(fakeRequest("Bearer segredo-correto"));

      expect(res.status).toBe(200);
      expect(cleanupMinIOPrefix).toHaveBeenCalledTimes(1);
      expect(cleanupMinIOPrefix).toHaveBeenCalledWith("relatorios/mensal/", 180);
    }
  );
});
