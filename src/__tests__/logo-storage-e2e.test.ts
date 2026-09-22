import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Cast helper: process.env tem NODE_ENV/MINIO_* somente leitura nas typings novas
// do @types/node, mas em runtime o objeto e mutavel (mesmo padrao de env-validation.test.ts).
type MutableEnv = Record<string, string | undefined>;

const MOCK_URL = "http://minio.local:9000/produtos/logo/1700000000000-Minha-Logo.png";

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

import { prisma } from "@/lib/db";
import { uploadToMinIO, isMinIOConfigured } from "@/lib/minio";
// A rota exige admin desde 2026-09-11; este teste cobre o caminho do arquivo.
vi.mock("@/lib/guards", () => ({ requireAdmin: vi.fn().mockResolvedValue(true) }));

import { POST } from "@/app/api/upload-logo/route";
import { carregarLogo } from "@/lib/logo-loader";

const mockFindFirst = vi.mocked(prisma.config.findFirst);
const mockUpdate = vi.mocked(prisma.config.update);
const mockCreate = vi.mocked(prisma.config.create);
const mockUploadToMinIO = vi.mocked(uploadToMinIO);
const mockIsMinIOConfigured = vi.mocked(isMinIOConfigured);

function pngBytes(): Uint8Array<ArrayBuffer> {
  // Assinatura PNG minima (magic bytes) — suficiente, o teste nao decodifica a imagem.
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

describe("logo storage e2e (upload -> MinIO -> leitura)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    mockFindFirst.mockReset();
    mockUpdate.mockReset();
    mockCreate.mockReset();
    mockUploadToMinIO.mockReset();
    mockIsMinIOConfigured.mockReset();
  });

  afterEach(() => {
    (process as { env: NodeJS.ProcessEnv }).env = { ...originalEnv } as NodeJS.ProcessEnv;
    vi.unstubAllGlobals();
  });

  it("caminho feliz: upload grava sob logo/ no MinIO, persiste URL absoluta e carregarLogo() le de volta", async () => {
    (process.env as MutableEnv).MINIO_ENDPOINT = "http://minio.local:9000";
    (process.env as MutableEnv).MINIO_ACCESS_KEY = "a";
    (process.env as MutableEnv).MINIO_SECRET_KEY = "b";

    mockIsMinIOConfigured.mockReturnValue(true);
    mockUploadToMinIO.mockResolvedValue(MOCK_URL);
    mockFindFirst.mockResolvedValue(null as never);
    mockCreate.mockResolvedValue({ id: 1, logoPath: MOCK_URL } as never);

    const fd = new FormData();
    fd.set("file", new File([pngBytes()], "Minha Logo.png", { type: "image/png" }));

    const req = new Request("http://local/api/upload-logo", { method: "POST", body: fd });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, filePath: MOCK_URL });

    // (a) chave prefixada com logo/
    expect(mockUploadToMinIO).toHaveBeenCalledTimes(1);
    const [, chave] = mockUploadToMinIO.mock.calls[0];
    expect(chave.startsWith("logo/")).toBe(true);

    // (b) Config.logoPath grava exatamente a URL devolvida por uploadToMinIO
    expect(mockCreate).toHaveBeenCalledWith({ data: { logoPath: MOCK_URL } });

    // (d) essa mesma URL, via carregarLogo() com fetch mockado, devolve os bytes + ext
    const bytesEsperados = pngBytes();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => bytesEsperados.buffer,
      })
    );

    const carregado = await carregarLogo(body.filePath);
    expect(carregado).not.toBeNull();
    expect(carregado?.ext).toBe(".png");
    expect(Buffer.from(carregado!.bytes).equals(Buffer.from(bytesEsperados))).toBe(true);
  });

  it("POST sem campo file responde 400", async () => {
    const fd = new FormData();
    const req = new Request("http://local/api/upload-logo", { method: "POST", body: fd });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });
});
