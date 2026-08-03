import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Cast helper: process.env tem NODE_ENV/MINIO_* somente leitura nas typings novas
// do @types/node, mas em runtime o objeto e mutavel (mesmo padrao de env-validation.test.ts).
type MutableEnv = Record<string, string | undefined>;

const MOCK_URL = "http://minio.local:9000/produtos/1700000000000-foto.png";

vi.mock("fs/promises", () => ({
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    config: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/minio", () => ({
  uploadToMinIO: vi.fn(),
  isMinIOConfigured: vi.fn(),
}));

describe("POST /api/produtos/upload — STO-04 (recusa explicita em producao sem storage)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    (process as { env: NodeJS.ProcessEnv }).env = { ...originalEnv } as NodeJS.ProcessEnv;
  });

  function fakeRequest() {
    const fd = new FormData();
    fd.set("file", new File([new Uint8Array([1, 2, 3])], "foto.png", { type: "image/png" }));
    return new Request("http://local/api/produtos/upload", { method: "POST", body: fd });
  }

  it("producao sem nenhuma var MINIO: responde >=400 (503) com error e NAO chama writeFile", async () => {
    (process.env as MutableEnv).NODE_ENV = "production";
    delete (process.env as MutableEnv).MINIO_ENDPOINT;
    delete (process.env as MutableEnv).MINIO_ACCESS_KEY;
    delete (process.env as MutableEnv).MINIO_SECRET_KEY;

    const { writeFile } = await import("fs/promises");
    const { isMinIOConfigured } = await import("@/lib/minio");
    vi.mocked(isMinIOConfigured).mockReturnValue(false);

    const { POST } = await import("@/app/api/produtos/upload/route");

    const res = await POST(fakeRequest());
    const body = await res.json();

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(body.error).toBeTruthy();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("producao com as tres vars MINIO e uploadToMinIO resolvendo uma URL: 200 com filePath da URL e nenhuma escrita em disco", async () => {
    (process.env as MutableEnv).NODE_ENV = "production";
    (process.env as MutableEnv).MINIO_ENDPOINT = "http://minio.local:9000";
    (process.env as MutableEnv).MINIO_ACCESS_KEY = "a";
    (process.env as MutableEnv).MINIO_SECRET_KEY = "b";

    const { writeFile } = await import("fs/promises");
    const { uploadToMinIO, isMinIOConfigured } = await import("@/lib/minio");
    vi.mocked(isMinIOConfigured).mockReturnValue(true);
    vi.mocked(uploadToMinIO).mockResolvedValue(MOCK_URL);

    const { POST } = await import("@/app/api/produtos/upload/route");

    const res = await POST(fakeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.filePath).toBe(MOCK_URL);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("producao com as vars MINIO mas uploadToMinIO resolvendo null: >=400 (503) e nenhuma escrita em disco", async () => {
    (process.env as MutableEnv).NODE_ENV = "production";
    (process.env as MutableEnv).MINIO_ENDPOINT = "http://minio.local:9000";
    (process.env as MutableEnv).MINIO_ACCESS_KEY = "a";
    (process.env as MutableEnv).MINIO_SECRET_KEY = "b";

    const { writeFile } = await import("fs/promises");
    const { uploadToMinIO, isMinIOConfigured } = await import("@/lib/minio");
    vi.mocked(isMinIOConfigured).mockReturnValue(true);
    vi.mocked(uploadToMinIO).mockResolvedValue(null);

    const { POST } = await import("@/app/api/produtos/upload/route");

    const res = await POST(fakeRequest());
    const body = await res.json();

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(body.error).toBeTruthy();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("development sem MINIO: 200 com filePath comecando em /uploads/produtos/ e escrita em disco chamada", async () => {
    (process.env as MutableEnv).NODE_ENV = "development";
    delete (process.env as MutableEnv).MINIO_ENDPOINT;
    delete (process.env as MutableEnv).MINIO_ACCESS_KEY;
    delete (process.env as MutableEnv).MINIO_SECRET_KEY;

    const { writeFile } = await import("fs/promises");
    const { isMinIOConfigured } = await import("@/lib/minio");
    vi.mocked(isMinIOConfigured).mockReturnValue(false);

    const { POST } = await import("@/app/api/produtos/upload/route");

    const res = await POST(fakeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.filePath.startsWith("/uploads/produtos/")).toBe(true);
    expect(writeFile).toHaveBeenCalledTimes(1);
  });

  it("POST sem campo file responde 400", async () => {
    const fd = new FormData();
    const req = new Request("http://local/api/produtos/upload", { method: "POST", body: fd });

    const { POST } = await import("@/app/api/produtos/upload/route");
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBeTruthy();
  });
});
