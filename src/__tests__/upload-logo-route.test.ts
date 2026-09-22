import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";

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

// O logo sai em recibo, boleto e PDF: so admin troca (revisao de seguranca, 2026-09-11).
const guardsMock = vi.hoisted(() => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/guards", () => guardsMock);

describe("POST /api/upload-logo — STO-04 (recusa explicita em producao sem storage)", () => {
  const originalEnv = { ...process.env };

  // O primeiro import da rota transforma a arvore do Next (~7s com a suite
  // inteira em paralelo) e estourava o timeout de 5s do primeiro teste — cuja
  // continuacao, ja fora do tempo, gravava arquivo durante o teste seguinte.
  beforeAll(async () => {
    await import("@/app/api/upload-logo/route");
  }, 60_000);

  beforeEach(() => {
    vi.resetModules();
    // resetModules nao zera o historico dos mocks: sem isto, a escrita de um
    // teste aparece no `not.toHaveBeenCalled` do seguinte.
    vi.clearAllMocks();
    guardsMock.requireAdmin.mockResolvedValue(true);
  });

  it("vendedor não troca o logo dos recibos: 403 e nada gravado", async () => {
    (process.env as MutableEnv).NODE_ENV = "development";
    delete (process.env as MutableEnv).MINIO_ENDPOINT;
    guardsMock.requireAdmin.mockResolvedValue(false);
    const { writeFile } = await import("fs/promises");
    const { prisma } = await import("@/lib/db");
    const { POST } = await import("@/app/api/upload-logo/route");

    const res = await POST(fakeRequest());

    expect(res.status).toBe(403);
    expect(writeFile).not.toHaveBeenCalled();
    expect(prisma.config.create).not.toHaveBeenCalled();
  });

  it("logo WebP: 415 — o PDF do recibo não embute WebP", async () => {
    (process.env as MutableEnv).NODE_ENV = "development";
    delete (process.env as MutableEnv).MINIO_ENDPOINT;
    const { writeFile } = await import("fs/promises");
    const { POST } = await import("@/app/api/upload-logo/route");

    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20]);
    const res = await POST(fakeRequest(webp));

    expect(res.status).toBe(415);
    expect(writeFile).not.toHaveBeenCalled();
  });

  afterEach(() => {
    (process as { env: NodeJS.ProcessEnv }).env = { ...originalEnv } as NodeJS.ProcessEnv;
  });

  // O servidor decide o tipo pelos bytes: a fixture precisa ser um PNG de verdade.
  const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]);

  function fakeRequest(bytes: Uint8Array<ArrayBuffer> = PNG, nome = "logo.png") {
    const fd = new FormData();
    fd.set("file", new File([bytes], nome, { type: "image/png" }));
    return new Request("http://local/api/upload-logo", { method: "POST", body: fd });
  }

  function semMinio() {
    (process.env as MutableEnv).NODE_ENV = "development";
    delete (process.env as MutableEnv).MINIO_ENDPOINT;
    delete (process.env as MutableEnv).MINIO_ACCESS_KEY;
    delete (process.env as MutableEnv).MINIO_SECRET_KEY;
  }

  it("SVG com script disfarçado de PNG: 415 e o logo não muda", async () => {
    semMinio();
    const { writeFile } = await import("fs/promises");
    const { prisma } = await import("@/lib/db");
    const { POST } = await import("@/app/api/upload-logo/route");

    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const res = await POST(fakeRequest(svg));

    expect(res.status).toBe(415);
    expect(writeFile).not.toHaveBeenCalled();
    expect(prisma.config.create).not.toHaveBeenCalled();
    expect(prisma.config.update).not.toHaveBeenCalled();
  });

  it("nome com ../ não sai da pasta de uploads", async () => {
    semMinio();
    const { writeFile } = await import("fs/promises");
    const { POST } = await import("@/app/api/upload-logo/route");
    const path = await import("path");

    const res = await POST(fakeRequest(PNG, "../../../app/server.js"));

    expect(res.status).toBe(200);
    const destino = String(vi.mocked(writeFile).mock.calls[0][0]);
    expect(path.dirname(destino)).toBe(path.join(process.cwd(), "public", "uploads"));
    expect(path.basename(destino).endsWith(".png")).toBe(true);
    expect(path.basename(destino)).not.toContain("..");
  });

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
