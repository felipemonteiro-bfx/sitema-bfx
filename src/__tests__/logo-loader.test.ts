import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "path";

vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
}));

import { readFile } from "fs/promises";
import { carregarLogo } from "@/lib/logo-loader";

const mockReadFile = vi.mocked(readFile);

describe("carregarLogo (D-01/D-03) — URL absoluta e caminho legado", () => {
  beforeEach(() => {
    mockReadFile.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("URL absoluta: busca por fetch, devolve bytes + ext, e NAO chama readFile", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => bytes.buffer,
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await carregarLogo("https://bfx.softlive.dev/produtos/logo/1-x.png");

    expect(result).not.toBeNull();
    expect(result?.ext).toBe(".png");
    expect(Buffer.from(result!.bytes).equals(Buffer.from(bytes))).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith("https://bfx.softlive.dev/produtos/logo/1-x.png");
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it("caminho legado /uploads/...: chama readFile sob public/uploads e NAO chama fetch", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
    mockReadFile.mockResolvedValue(Buffer.from([9, 9, 9]));

    const result = await carregarLogo("/uploads/1-logo.png");

    expect(result).not.toBeNull();
    expect(result?.ext).toBe(".png");
    expect(mockReadFile).toHaveBeenCalledTimes(1);
    const caminhoChamado = mockReadFile.mock.calls[0][0] as string;
    expect(caminhoChamado.endsWith(path.join("public", "uploads", "1-logo.png"))).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("URL absoluta com extensao .jpg", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) })
    );
    const result = await carregarLogo("https://h/logo/x.jpg");
    expect(result?.ext).toBe(".jpg");
  });

  it("null e string vazia devolvem null", async () => {
    expect(await carregarLogo(null)).toBeNull();
    expect(await carregarLogo("")).toBeNull();
  });

  it("fetch respondendo ok:false devolve null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const result = await carregarLogo("https://h/logo/x.png");
    expect(result).toBeNull();
  });

  it("readFile lancando ENOENT devolve null (logo e opcional)", async () => {
    mockReadFile.mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));
    const result = await carregarLogo("/uploads/nao-existe.png");
    expect(result).toBeNull();
  });
});
