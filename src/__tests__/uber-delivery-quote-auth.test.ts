// Aba Uber em /configuracoes: `getDeliveryQuote()` precisa resolver a Authorization certa conforme a origem da
// credencial — token estatico legado (env, T-09-02 ja cobre nao vazar) usa o bearer
// direto; config oauth (banco, nova aba /configuracoes) busca o access_token via
// `obterTokenUber` (src/lib/uber-auth.ts) antes de chamar a Uber. Isso e o cerne da
// feature: nunca guardar um token que expira, sempre buscar sob demanda.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDeliveryQuote, type UberAddress } from "@/lib/uber";
import { limparCacheTokenUber } from "@/lib/uber-auth";

const ENDERECO: UberAddress = {
  street_address: ["Rua Exemplo, 123"],
  city: "Manaus",
  state: "AM",
  zip_code: "69000000",
  country: "BR",
};

const quoteOkResponse = () =>
  ({ ok: true, status: 200, json: async () => ({ id: "q1", fee: 1000, duration: 20, currency_type: "BRL" }) }) as Response;

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  limparCacheTokenUber();
});

describe("getDeliveryQuote — resolucao de credencial", () => {
  it("config static_token (legado/env): usa o token direto, sem chamar o endpoint OAuth", async () => {
    const fetchMock = vi.fn().mockResolvedValue(quoteOkResponse());
    vi.stubGlobal("fetch", fetchMock);

    await getDeliveryQuote(
      { source: "static_token", customerId: "cust-env", token: "token-estatico" },
      { pickupAddress: ENDERECO, dropoffAddress: ENDERECO, orderValueCents: 5000 }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/customers/cust-env/delivery_quotes");
    const headers = opts.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer token-estatico");
  });

  it("config oauth (banco): busca o access_token via OAuth antes de cotar", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "https://auth.uber.com/oauth/v2/token") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ access_token: "tok-fresco", expires_in: 2592000 }) } as Response);
      }
      return Promise.resolve(quoteOkResponse());
    });
    vi.stubGlobal("fetch", fetchMock);

    await getDeliveryQuote(
      { source: "oauth", customerId: "cust-db", clientId: "cid", clientSecret: "csecret" },
      { pickupAddress: ENDERECO, dropoffAddress: ENDERECO, orderValueCents: 5000 }
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const chamadaOAuth = fetchMock.mock.calls.find((c) => c[0] === "https://auth.uber.com/oauth/v2/token");
    expect(chamadaOAuth).toBeTruthy();
    const chamadaQuote = fetchMock.mock.calls.find((c) => (c[0] as string).includes("/delivery_quotes"));
    expect(chamadaQuote).toBeTruthy();
    const opts = chamadaQuote![1] as RequestInit;
    const headers = opts.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tok-fresco");
    expect((chamadaQuote![0] as string)).toContain("/customers/cust-db/delivery_quotes");
  });

  it("quando o OAuth falha, devolve o mesmo formato de falha de rede (nunca estoura excecao para o chamador)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) } as Response));

    const resultado = await getDeliveryQuote(
      { source: "oauth", customerId: "cust-db", clientId: "cid", clientSecret: "errada" },
      { pickupAddress: ENDERECO, dropoffAddress: ENDERECO, orderValueCents: 5000 }
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error("esperava ok:false");
    expect(resultado.motivo).toBe("erro_upstream");
  });

  it("401 na cotacao com token oauth ja em cache: renova UMA vez e tenta de novo (achado #1 da revisao)", async () => {
    let chamadasToken = 0;
    let chamadasQuote = 0;
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "https://auth.uber.com/oauth/v2/token") {
        chamadasToken += 1;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ access_token: "tok-" + chamadasToken, expires_in: 2592000 }),
        } as Response);
      }
      chamadasQuote += 1;
      // primeira tentativa de cotacao com o token cacheado falha com 401; a segunda (com
      // token renovado) sucede.
      if (chamadasQuote === 1) {
        return Promise.resolve({ ok: false, status: 401, json: async () => ({}) } as Response);
      }
      return Promise.resolve(quoteOkResponse());
    });
    vi.stubGlobal("fetch", fetchMock);

    const config = { source: "oauth" as const, customerId: "cust-db", clientId: "cid", clientSecret: "csecret" };
    const req = { pickupAddress: ENDERECO, dropoffAddress: ENDERECO, orderValueCents: 5000 };

    // 1a busca de token (cache frio) -> tok-1; 1a cotacao com tok-1 -> 401; cache limpo;
    // 2a busca de token -> tok-2; 2a cotacao com tok-2 -> sucesso.
    const resultado = await getDeliveryQuote(config, req);

    expect(resultado.ok).toBe(true);
    expect(chamadasToken).toBe(2);
    expect(chamadasQuote).toBe(2);
    const segundaQuote = fetchMock.mock.calls.filter((c) => (c[0] as string).includes("/delivery_quotes"))[1];
    const headers = (segundaQuote![1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tok-2");
  });

  it("401 na cotacao com token static_token (legado/env) NAO tenta renovar (nao ha OAuth nesse modo)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) } as Response);
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await getDeliveryQuote(
      { source: "static_token", customerId: "cust-env", token: "token-vencido" },
      { pickupAddress: ENDERECO, dropoffAddress: ENDERECO, orderValueCents: 5000 }
    );

    expect(resultado.ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
