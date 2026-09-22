import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";

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

  // O primeiro import da rota transforma a arvore do Next (~7s com a suite
  // inteira em paralelo) e estourava o timeout de 5s do primeiro teste — cuja
  // continuacao, ja fora do tempo, gravava arquivo durante o teste seguinte.
  beforeAll(async () => {
    await import("@/app/api/produtos/upload/route");
  }, 60_000);

  beforeEach(() => {
    vi.resetModules();
    // resetModules nao zera o historico dos mocks: sem isto, a escrita de um
    // teste aparece no `not.toHaveBeenCalled` do seguinte.
    vi.clearAllMocks();
  });

  afterEach(() => {
    (process as { env: NodeJS.ProcessEnv }).env = { ...originalEnv } as NodeJS.ProcessEnv;
  });

  // O servidor decide o tipo pelos bytes: a fixture precisa ser um PNG de verdade.
  const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]);
  const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

  function fakeRequest(bytes: Uint8Array<ArrayBuffer> = PNG, nome = "foto.png", tipo = "image/png") {
    const fd = new FormData();
    fd.set("file", new File([bytes], nome, { type: tipo }));
    return new Request("http://local/api/produtos/upload", { method: "POST", body: fd });
  }

  function semMinio(nodeEnv: string) {
    (process.env as MutableEnv).NODE_ENV = nodeEnv;
    delete (process.env as MutableEnv).MINIO_ENDPOINT;
    delete (process.env as MutableEnv).MINIO_ACCESS_KEY;
    delete (process.env as MutableEnv).MINIO_SECRET_KEY;
  }

  it("arquivo que diz ser PNG mas é HTML: 415, nada enviado nem gravado", async () => {
    semMinio("development");
    const { writeFile } = await import("fs/promises");
    const { uploadToMinIO, isMinIOConfigured } = await import("@/lib/minio");
    vi.mocked(isMinIOConfigured).mockReturnValue(false);
    const { POST } = await import("@/app/api/produtos/upload/route");

    const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
    const res = await POST(fakeRequest(html, "foto.png", "image/png"));

    expect(res.status).toBe(415);
    expect((await res.json()).error).toBeTruthy();
    expect(writeFile).not.toHaveBeenCalled();
    expect(uploadToMinIO).not.toHaveBeenCalled();
  });

  it("arquivo acima de 5 MB: 413, nada gravado", async () => {
    semMinio("development");
    const { writeFile } = await import("fs/promises");
    const { isMinIOConfigured } = await import("@/lib/minio");
    vi.mocked(isMinIOConfigured).mockReturnValue(false);
    const { POST } = await import("@/app/api/produtos/upload/route");

    const grande = new Uint8Array(5 * 1024 * 1024 + 1);
    grande.set(PNG);
    const res = await POST(fakeRequest(grande));

    expect(res.status).toBe(413);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("nome com ../ não sai da pasta de uploads", async () => {
    semMinio("development");
    const { writeFile } = await import("fs/promises");
    const { isMinIOConfigured } = await import("@/lib/minio");
    vi.mocked(isMinIOConfigured).mockReturnValue(false);
    const { POST } = await import("@/app/api/produtos/upload/route");
    const path = await import("path");

    const res = await POST(fakeRequest(PNG, "../../../etc/cron.d/x.png"));

    expect(res.status).toBe(200);
    const destino = String(vi.mocked(writeFile).mock.calls[0][0]);
    expect(path.dirname(destino)).toBe(path.join(process.cwd(), "public/uploads/produtos"));
    expect(path.basename(destino)).not.toContain("..");
  });

  it("no MinIO, o Content-Type e a extensão são os dos bytes, não os do navegador", async () => {
    (process.env as MutableEnv).NODE_ENV = "production";
    (process.env as MutableEnv).MINIO_ENDPOINT = "http://minio.local:9000";
    (process.env as MutableEnv).MINIO_ACCESS_KEY = "a";
    (process.env as MutableEnv).MINIO_SECRET_KEY = "b";
    const { uploadToMinIO, isMinIOConfigured } = await import("@/lib/minio");
    vi.mocked(isMinIOConfigured).mockReturnValue(true);
    vi.mocked(uploadToMinIO).mockResolvedValue(MOCK_URL);
    const { POST } = await import("@/app/api/produtos/upload/route");

    const res = await POST(fakeRequest(JPEG, "foto.png", "image/png"));

    expect(res.status).toBe(200);
    const [, chave, contentType] = vi.mocked(uploadToMinIO).mock.calls[0];
    expect(contentType).toBe("image/jpeg");
    expect(String(chave).endsWith(".jpg")).toBe(true);
  });

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
