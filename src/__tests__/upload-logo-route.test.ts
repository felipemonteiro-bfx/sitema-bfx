import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Cast helper: process.env tem NODE_ENV/MINIO_* somente leitura nas typings novas
// do @types/node, mas em runtime o objeto e mutavel (mesmo padrao de env-validation.test.ts).
type MutableEnv = Record<string, string | undefined>;

vi.mock("fs/promises", () => ({
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    config: {
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
      create: vi.fn().mockResolvedValue({ id: 1 }),
    },
  },
}));

describe("POST /api/upload-logo — STO-04 (recusa explicita em producao sem storage)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    (process as { env: NodeJS.ProcessEnv }).env = { ...originalEnv } as NodeJS.ProcessEnv;
  });

  function fakeRequest() {
    const fd = new FormData();
    fd.set("file", new File([new Uint8Array([1, 2, 3])], "logo.png", { type: "image/png" }));
    return new Request("http://local/api/upload-logo", { method: "POST", body: fd });
  }

  it("producao sem nenhuma var MINIO: responde >=400 (503) com error e NAO chama writeFile", async () => {
    (process.env as MutableEnv).NODE_ENV = "production";
    delete (process.env as MutableEnv).MINIO_ENDPOINT;
    delete (process.env as MutableEnv).MINIO_ACCESS_KEY;
    delete (process.env as MutableEnv).MINIO_SECRET_KEY;

    const { writeFile } = await import("fs/promises");
    const { POST } = await import("@/app/api/upload-logo/route");

    const res = await POST(fakeRequest());
    const body = await res.json();

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(body.error).toBeTruthy();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("development sem nenhuma var MINIO: responde 200 e CHAMA writeFile (fallback de dev preservado)", async () => {
    (process.env as MutableEnv).NODE_ENV = "development";
    delete (process.env as MutableEnv).MINIO_ENDPOINT;
    delete (process.env as MutableEnv).MINIO_ACCESS_KEY;
    delete (process.env as MutableEnv).MINIO_SECRET_KEY;

    const { writeFile } = await import("fs/promises");
    const { POST } = await import("@/app/api/upload-logo/route");

    const res = await POST(fakeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(writeFile).toHaveBeenCalledTimes(1);
  });
});
