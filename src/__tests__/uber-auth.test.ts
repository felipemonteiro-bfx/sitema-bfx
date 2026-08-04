// Aba Uber em /configuracoes: a Uber nao tem refresh token — o token expira em
// ~30 dias e a integracao antiga guardava um token estatico (UBER_DIRECT_TOKEN), que
// para de funcionar em silencio quando vence. Este arquivo trava o modulo OAuth
// client_credentials que substitui isso: troca client_id/client_secret por um
// access_token, cacheado em memoria ate perto do vencimento.
//
// `src/lib/uber-auth.ts` tem zero imports (so globais: fetch, URLSearchParams, Map) —
// mesmo padrao de `src/lib/uber-quote-result.ts` — para a logica pura (montar o corpo
// do POST, decidir se o cache venceu) ser verificavel com `node --input-type=module`
// nesta maquina, onde `vitest` nao roda (ver CLAUDE.md / environment_constraints).
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  montarCorpoTokenUber,
  cacheTokenExpirado,
  chaveCacheTokenUber,
  obterTokenUber,
  limparCacheTokenUber,
} from "@/lib/uber-auth";

describe("montarCorpoTokenUber", () => {
  it("monta corpo x-www-form-urlencoded com grant_type client_credentials", () => {
    const corpo = montarCorpoTokenUber("cid", "csecret", "eats.deliveries");
    const params = new URLSearchParams(corpo);
    expect(params.get("client_id")).toBe("cid");
    expect(params.get("client_secret")).toBe("csecret");
    expect(params.get("grant_type")).toBe("client_credentials");
    expect(params.get("scope")).toBe("eats.deliveries");
  });

  it("o corpo nao e JSON (a Uber rejeita JSON no token endpoint)", () => {
    const corpo = montarCorpoTokenUber("cid", "csecret", "eats.deliveries");
    expect(() => JSON.parse(corpo)).toThrow();
    expect(corpo.startsWith("{")).toBe(false);
  });
});

describe("cacheTokenExpirado", () => {
  it("nao esta expirado logo apos obter, dentro do expires_in", () => {
    const obtidoEm = 1_000_000;
    const expirado = cacheTokenExpirado(obtidoEm, 2592000, obtidoEm + 1000);
    expect(expirado).toBe(false);
  });

  it("considera expirado perto do vencimento por causa da margem de seguranca", () => {
    const obtidoEm = 1_000_000;
    const expiresInSegundos = 3600; // 1h
    // 1h - margem (120s por padrao) = 3480s depois disso ja conta expirado
    const agora = obtidoEm + 3480 * 1000;
    expect(cacheTokenExpirado(obtidoEm, expiresInSegundos, agora)).toBe(true);
  });

  it("aceita margem de seguranca customizada", () => {
    const obtidoEm = 0;
    expect(cacheTokenExpirado(obtidoEm, 100, 50 * 1000, 10)).toBe(false);
    expect(cacheTokenExpirado(obtidoEm, 100, 91 * 1000, 10)).toBe(true);
  });
});

describe("chaveCacheTokenUber", () => {
  it("chaves diferentes para escopos diferentes do mesmo client_id", () => {
    const a = chaveCacheTokenUber("cid", "eats.deliveries");
    const b = chaveCacheTokenUber("cid", "business.receipts");
    expect(a).not.toBe(b);
  });
});

const okResponse = (json: unknown) => ({ ok: true, status: 200, json: async () => json }) as Response;

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  limparCacheTokenUber();
});

describe("obterTokenUber", () => {
  it("busca o token via POST form-encoded no endpoint OAuth da Uber", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ access_token: "tok123", expires_in: 2592000 }));
    vi.stubGlobal("fetch", fetchMock);

    const token = await obterTokenUber("cid", "csecret", "eats.deliveries");

    expect(token).toBe("tok123");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://auth.uber.com/oauth/v2/token");
    expect(opts.method).toBe("POST");
    const headers = opts.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(typeof opts.body).toBe("string");
    expect((opts.body as string).startsWith("{")).toBe(false);
  });

  it("cacheia o token e nao refaz a chamada de rede dentro da validade", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ access_token: "tok123", expires_in: 2592000 }));
    vi.stubGlobal("fetch", fetchMock);

    await obterTokenUber("cid", "csecret", "eats.deliveries");
    await obterTokenUber("cid", "csecret", "eats.deliveries");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("renova o token depois que o cache vence", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse({ access_token: "tok1", expires_in: 100 }))
      .mockResolvedValueOnce(okResponse({ access_token: "tok2", expires_in: 100 }));
    vi.stubGlobal("fetch", fetchMock);

    const dataNowSpy = vi.spyOn(Date, "now");
    dataNowSpy.mockReturnValue(0);
    const primeiro = await obterTokenUber("cid", "csecret", "eats.deliveries");
    expect(primeiro).toBe("tok1");

    dataNowSpy.mockReturnValue(200 * 1000); // passou o expires_in (100s) + margem
    const segundo = await obterTokenUber("cid", "csecret", "eats.deliveries");
    expect(segundo).toBe("tok2");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    dataNowSpy.mockRestore();
  });

  it("estoura erro quando a Uber responde HTTP diferente de 2xx", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) } as Response));
    await expect(obterTokenUber("cid", "csecret", "eats.deliveries")).rejects.toThrow();
  });

  it("estoura erro quando a resposta nao tem access_token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse({ expires_in: 100 })));
    await expect(obterTokenUber("cid", "csecret", "eats.deliveries")).rejects.toThrow();
  });
});
