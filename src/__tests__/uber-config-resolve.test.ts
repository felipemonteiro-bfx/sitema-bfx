// Aba Uber em /configuracoes: trava a resolucao pura de qual credencial usar
// para a cotacao Uber Direct — Config no banco (client_id/client_secret via OAuth,
// nunca um token estatico) tem prioridade; variaveis de ambiente (customerId + token
// estatico, o que ja esta hoje no AWS SSM) sao o fallback, para nao quebrar producao
// enquanto a migracao para a tela nao acontece.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  resolveUberDirectConfigFromDb,
  resolveUberDirectConfigFromEnv,
  resolveUberPickupAddressJson,
} from "@/lib/uber";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  delete process.env.UBER_DIRECT_CUSTOMER_ID;
  delete process.env.UBER_DIRECT_TOKEN;
  delete process.env.UBER_PICKUP_ADDRESS_JSON;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("resolveUberDirectConfigFromDb", () => {
  it("null quando nao ha config", () => {
    expect(resolveUberDirectConfigFromDb(null)).toBeNull();
  });

  it("null quando uberEnabled nao e 1 (default 0, opt-in explicito)", () => {
    const r = resolveUberDirectConfigFromDb({
      uberEnabled: 0,
      uberClientId: "cid",
      uberClientSecret: "csecret",
      uberCustomerId: "cust",
    });
    expect(r).toBeNull();
  });

  it("null quando uberEnabled e null (linha existe mas nunca foi ligado)", () => {
    const r = resolveUberDirectConfigFromDb({
      uberEnabled: null,
      uberClientId: "cid",
      uberClientSecret: "csecret",
      uberCustomerId: "cust",
    });
    expect(r).toBeNull();
  });

  it("null quando habilitado mas falta client_secret ou customer_id", () => {
    expect(
      resolveUberDirectConfigFromDb({ uberEnabled: 1, uberClientId: "cid", uberClientSecret: "", uberCustomerId: "cust" })
    ).toBeNull();
    expect(
      resolveUberDirectConfigFromDb({ uberEnabled: 1, uberClientId: "cid", uberClientSecret: "s", uberCustomerId: "" })
    ).toBeNull();
  });

  it("devolve config oauth completa quando habilitado e todos os campos presentes", () => {
    const r = resolveUberDirectConfigFromDb({
      uberEnabled: 1,
      uberClientId: "cid",
      uberClientSecret: "csecret",
      uberCustomerId: "cust",
      uberOrganizationId: "org1",
    });
    expect(r).toEqual({
      source: "oauth",
      clientId: "cid",
      clientSecret: "csecret",
      customerId: "cust",
      organizationId: "org1",
    });
  });

  it("organizationId fica ausente (nao string vazia) quando nao configurado", () => {
    const r = resolveUberDirectConfigFromDb({
      uberEnabled: 1,
      uberClientId: "cid",
      uberClientSecret: "csecret",
      uberCustomerId: "cust",
    });
    expect(r).not.toBeNull();
    expect(r?.source).toBe("oauth");
    if (r?.source === "oauth") {
      expect(r.organizationId).toBeUndefined();
    }
  });
});

describe("resolveUberDirectConfigFromEnv", () => {
  it("null quando faltam as envs legadas", () => {
    expect(resolveUberDirectConfigFromEnv()).toBeNull();
  });

  it("devolve config static_token quando UBER_DIRECT_CUSTOMER_ID e UBER_DIRECT_TOKEN existem (compat SSM atual)", () => {
    process.env.UBER_DIRECT_CUSTOMER_ID = "cust-env";
    process.env.UBER_DIRECT_TOKEN = "token-env";
    expect(resolveUberDirectConfigFromEnv()).toEqual({
      source: "static_token",
      customerId: "cust-env",
      token: "token-env",
    });
  });
});

describe("resolveUberPickupAddressJson", () => {
  const ENDERECO = JSON.stringify({ street_address: ["Rua X"], city: "Manaus", state: "AM", zip_code: "69000000", country: "BR" });

  it("prioriza o endereco salvo no banco sobre o da env", () => {
    process.env.UBER_PICKUP_ADDRESS_JSON = "{\"city\":\"env\"}";
    expect(resolveUberPickupAddressJson({ uberPickupAddress: ENDERECO })).toBe(ENDERECO);
  });

  it("cai para a env quando o banco nao tem endereco salvo", () => {
    process.env.UBER_PICKUP_ADDRESS_JSON = ENDERECO;
    expect(resolveUberPickupAddressJson({ uberPickupAddress: null })).toBe(ENDERECO);
    expect(resolveUberPickupAddressJson(null)).toBe(ENDERECO);
  });

  it("null quando nem banco nem env tem endereco", () => {
    expect(resolveUberPickupAddressJson(null)).toBeNull();
    expect(resolveUberPickupAddressJson({ uberPickupAddress: "   " })).toBeNull();
  });
});
