// Zip mínimo para gerar .xlsx sem dependência nova (2026-09-11): `npm install`
// não roda neste projeto; o `zlib` do Node faz a compressão.
import { describe, it, expect } from "vitest";
import { crc32, criarZip } from "@/lib/xlsx/zip";
import { lerZip, lerZipBinario } from "./helpers/ler-zip";

describe("criarZip", () => {
  it("CRC-32 do vetor padrão '123456789'", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("começa com a assinatura de zip", () => {
    expect([...criarZip([{ nome: "a.txt", dados: "a" }]).slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
  });

  it("ida e volta: o que entra sai igual, com acento e em pasta", () => {
    const zip = criarZip([
      { nome: "a.xml", dados: "<x>ação</x>" },
      { nome: "pasta/b.txt", dados: "b".repeat(5000) },
      { nome: "c.bin", dados: new Uint8Array([0, 255, 7]) },
    ]);
    const arquivos = lerZip(zip);
    expect(arquivos.get("a.xml")).toBe("<x>ação</x>");
    expect(arquivos.get("pasta/b.txt")).toBe("b".repeat(5000));
    expect([...lerZipBinario(zip).get("c.bin")!]).toEqual([0, 255, 7]);
    expect([...arquivos.keys()]).toEqual(["a.xml", "pasta/b.txt", "c.bin"]);
  });
});
