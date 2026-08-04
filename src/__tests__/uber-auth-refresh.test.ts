// Achados #1 e #2 da revisao Grok sobre src/lib/uber-auth.ts:
// #1 nada limpava o cache quando a Uber revogava/expirava um token cedo (401 na
//    cotacao) — a integracao ficava quebrada em silencio ate o cache vencer sozinho
//    (ate ~30 dias), o oposto do objetivo desta feature.
// #2 chamadas concorrentes com cache frio disparavam N POSTs paralelos no endpoint de
//    token da Uber, que documenta limite de 100 req/hora — risco de 429 em rajada.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { obterTokenUber, limparCacheTokenUber, limparEntradaCacheTokenUber } from "@/lib/uber-auth";

const okResponse = (json: unknown) => ({ ok: true, status: 200, json: async () => json }) as Response;

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  limparCacheTokenUber();
});

describe("limparEntradaCacheTokenUber", () => {
  it("remove so a entrada da chave indicada, forcando nova busca so para ela", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse({ access_token: "tok1", expires_in: 2592000 }))
      .mockResolvedValueOnce(okResponse({ access_token: "tok2", expires_in: 2592000 }));
    vi.stubGlobal("fetch", fetchMock);

    const primeiro = await obterTokenUber("cid", "cs", "eats.deliveries");
    expect(primeiro).toBe("tok1");

    limparEntradaCacheTokenUber("cid", "eats.deliveries");
    const segundo = await obterTokenUber("cid", "cs", "eats.deliveries");
    expect(segundo).toBe("tok2");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("obterTokenUber — coalescimento de chamadas concorrentes (achado #2)", () => {
  it("N chamadas concorrentes com cache frio disparam UMA unica requisicao HTTP", async () => {
    let resolveFetch: (v: Response) => void;
    const pendente = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = vi.fn().mockReturnValue(pendente);
    vi.stubGlobal("fetch", fetchMock);

    const chamadas = [
      obterTokenUber("cid", "cs", "eats.deliveries"),
      obterTokenUber("cid", "cs", "eats.deliveries"),
      obterTokenUber("cid", "cs", "eats.deliveries"),
    ];

    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveFetch!(okResponse({ access_token: "tok-unico", expires_in: 2592000 }));
    const resultados = await Promise.all(chamadas);

    expect(resultados).toEqual(["tok-unico", "tok-unico", "tok-unico"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("depois que a chamada em voo termina, uma nova chamada busca de novo se o cache venceu", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse({ access_token: "tok1", expires_in: 100 }))
      .mockResolvedValueOnce(okResponse({ access_token: "tok2", expires_in: 100 }));
    vi.stubGlobal("fetch", fetchMock);

    const dataNowSpy = vi.spyOn(Date, "now").mockReturnValue(0);
    await obterTokenUber("cid", "cs", "eats.deliveries");
    dataNowSpy.mockReturnValue(200 * 1000);
    await obterTokenUber("cid", "cs", "eats.deliveries");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    dataNowSpy.mockRestore();
  });

  it("se a chamada em voo falha, a proxima chamada tenta de novo (nao fica presa num erro cacheado)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response)
      .mockResolvedValueOnce(okResponse({ access_token: "tok-ok", expires_in: 2592000 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(obterTokenUber("cid", "cs", "eats.deliveries")).rejects.toThrow();
    const token = await obterTokenUber("cid", "cs", "eats.deliveries");
    expect(token).toBe("tok-ok");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
