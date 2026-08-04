// D-XX: `getUberDirectConfig()`/`getUberPickupAddressJson()` agora leem a tabela Config
// (aba Uber em /configuracoes) antes de cair para as variaveis de ambiente legadas —
// mesmo padrao ja usado em `src/lib/meta-templates.ts` (mock de `@/lib/db`).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const configMock = { findFirst: vi.fn() };
vi.mock("@/lib/db", () => ({ prisma: { config: configMock } }));

const { getUberDirectConfig, getUberPickupAddressJson } = await import("@/lib/uber");

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.UBER_DIRECT_CUSTOMER_ID;
  delete process.env.UBER_DIRECT_TOKEN;
  delete process.env.UBER_PICKUP_ADDRESS_JSON;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("getUberDirectConfig", () => {
  it("usa a config oauth do banco quando uberEnabled=1 e credenciais completas", async () => {
    configMock.findFirst.mockResolvedValue({
      uberEnabled: 1,
      uberClientId: "cid",
      uberClientSecret: "csecret",
      uberCustomerId: "cust",
      uberOrganizationId: null,
    });
    const cfg = await getUberDirectConfig();
    expect(cfg).toEqual({ source: "oauth", clientId: "cid", clientSecret: "csecret", customerId: "cust" });
  });

  it("cai para env quando a linha do banco existe mas uberEnabled != 1", async () => {
    configMock.findFirst.mockResolvedValue({
      uberEnabled: 0,
      uberClientId: "cid",
      uberClientSecret: "csecret",
      uberCustomerId: "cust",
    });
    process.env.UBER_DIRECT_CUSTOMER_ID = "cust-env";
    process.env.UBER_DIRECT_TOKEN = "token-env";
    const cfg = await getUberDirectConfig();
    expect(cfg).toEqual({ source: "static_token", customerId: "cust-env", token: "token-env" });
  });

  it("cai para env quando prisma.config.findFirst falha (coluna ausente em producao antiga)", async () => {
    configMock.findFirst.mockRejectedValue(new Error("column uber_enabled does not exist"));
    process.env.UBER_DIRECT_CUSTOMER_ID = "cust-env";
    process.env.UBER_DIRECT_TOKEN = "token-env";
    const cfg = await getUberDirectConfig();
    expect(cfg).toEqual({ source: "static_token", customerId: "cust-env", token: "token-env" });
  });

  it("null quando nem banco nem env estao configurados", async () => {
    configMock.findFirst.mockResolvedValue(null);
    const cfg = await getUberDirectConfig();
    expect(cfg).toBeNull();
  });
});

describe("getUberPickupAddressJson", () => {
  it("le o endereco salvo no banco", async () => {
    configMock.findFirst.mockResolvedValue({ uberPickupAddress: "{\"city\":\"Manaus\"}" });
    expect(await getUberPickupAddressJson()).toBe("{\"city\":\"Manaus\"}");
  });

  it("cai para a env quando o banco nao tem endereco", async () => {
    configMock.findFirst.mockResolvedValue({ uberPickupAddress: null });
    process.env.UBER_PICKUP_ADDRESS_JSON = "{\"city\":\"env\"}";
    expect(await getUberPickupAddressJson()).toBe("{\"city\":\"env\"}");
  });
});
