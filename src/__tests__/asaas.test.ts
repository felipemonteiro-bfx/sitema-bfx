import { describe, it, expect } from "vitest";
import { getAsaasConfig } from "@/lib/asaas";

describe("getAsaasConfig", () => {
  it("retorna null quando apiKey ausente", () => {
    const result = getAsaasConfig({ asaasApiKey: null, asaasEnv: null });
    // Without env var ASAAS_API_KEY, should return null
    const envKey = process.env.ASAAS_API_KEY;
    if (!envKey) {
      expect(result).toBeNull();
    }
  });

  it("retorna config com sandbox como default", () => {
    const result = getAsaasConfig({ asaasApiKey: "test-key-123", asaasEnv: null });
    expect(result).not.toBeNull();
    expect(result!.apiKey).toBe("test-key-123");
    expect(result!.baseUrl).toBe("https://api-sandbox.asaas.com");
  });

  it("retorna config com production quando env=production", () => {
    const result = getAsaasConfig({ asaasApiKey: "test-key-123", asaasEnv: "production" });
    expect(result).not.toBeNull();
    expect(result!.baseUrl).toBe("https://api.asaas.com");
  });

  it("ignora apiKey com apenas espacos", () => {
    const result = getAsaasConfig({ asaasApiKey: "   ", asaasEnv: null });
    const envKey = process.env.ASAAS_API_KEY;
    if (!envKey) {
      expect(result).toBeNull();
    }
  });
});
