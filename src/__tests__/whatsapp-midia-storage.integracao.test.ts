// Integração contra o MinIO DOCKER LOCAL (scripts/dev/whatsapp-local.sh --minio).
// Pulado por padrão; rode com WHATSAPP_MINIO_INTEGRACAO=1. Recusa endpoint não local.
import { describe, it, expect } from "vitest";
import { chaveNova, gravar, ler, remover, verificarBucketPrivado } from "@/lib/whatsapp-midia-storage";

const ligado = process.env.WHATSAPP_MINIO_INTEGRACAO === "1";
const endpoint = process.env.MINIO_ENDPOINT ?? "";
const local = endpoint.includes("127.0.0.1") || endpoint.includes("localhost");

async function texto(s: ReadableStream<Uint8Array>): Promise<string> {
  return new TextDecoder().decode(new Uint8Array(await new Response(s).arrayBuffer()));
}

describe.skipIf(!ligado || !local)("storage de mídias no MinIO local", () => {
  it("grava, lê com Range (fechado, aberto, sufixo) e remove", async () => {
    await verificarBucketPrivado();
    const k = chaveNova();
    await gravar(k, Buffer.from("0123456789"), "text/plain");
    const todo = await ler(k);
    expect(await texto(todo!.corpo)).toBe("0123456789");
    const a = await ler(k, "bytes=2-4");
    expect([a!.status, a!.contentRange, await texto(a!.corpo)]).toEqual([206, "bytes 2-4/10", "234"]);
    const b = await ler(k, "bytes=7-");
    expect(await texto(b!.corpo)).toBe("789");
    const c = await ler(k, "bytes=-3");
    expect([c!.tamanhoTotal, await texto(c!.corpo)]).toEqual([10, "789"]);
    await remover(k);
    expect(await ler(k)).toBeNull();
  });
});
