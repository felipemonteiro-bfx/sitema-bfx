import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("env validation (real module)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset module cache so each test gets a fresh import
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  it("validateEnv() aceita env com DATABASE_URL presente", async () => {
    process.env.DATABASE_URL = "postgresql://localhost/test";
    process.env.SKIP_ENV_VALIDATION = "false";
    process.env.NODE_ENV = "test";

    const { validateEnv } = await import("@/env");
    // Should not throw
    const result = validateEnv();
    expect(result.DATABASE_URL).toBe("postgresql://localhost/test");
  });

  it("validateEnv() lanca erro quando DATABASE_URL ausente", async () => {
    delete process.env.DATABASE_URL;
    process.env.SKIP_ENV_VALIDATION = "false";
    process.env.NODE_ENV = "test";

    // env.ts calls validateEnv() at module scope, so the throw happens at import time
    await expect(import("@/env")).rejects.toThrow("Env vars invalidas");
  });

  it("validateEnv() lanca erro quando DATABASE_URL vazia", async () => {
    process.env.DATABASE_URL = "";
    process.env.SKIP_ENV_VALIDATION = "false";
    process.env.NODE_ENV = "test";

    // env.ts calls validateEnv() at module scope, so the throw happens at import time
    await expect(import("@/env")).rejects.toThrow("Env vars invalidas");
  });

  it("validateEnv() pula validacao quando SKIP_ENV_VALIDATION=true", async () => {
    delete process.env.DATABASE_URL;
    process.env.SKIP_ENV_VALIDATION = "true";
    process.env.NODE_ENV = "test";

    const { validateEnv } = await import("@/env");
    // Should NOT throw even without DATABASE_URL
    expect(() => validateEnv()).not.toThrow();
  });

  it("validateEnv() aceita NODE_ENV valido", async () => {
    process.env.DATABASE_URL = "postgresql://localhost/test";
    process.env.SKIP_ENV_VALIDATION = "false";
    process.env.NODE_ENV = "production";
    process.env.SESSION_SECRET = "a-very-long-secret-that-is-at-least-32-chars-long!!";

    const { validateEnv } = await import("@/env");
    const result = validateEnv();
    expect(result.NODE_ENV).toBe("production");
  });

  it("validateEnv() default SESSION_SECRET para dev-secret em dev", async () => {
    process.env.DATABASE_URL = "postgresql://localhost/test";
    process.env.SKIP_ENV_VALIDATION = "false";
    process.env.NODE_ENV = "test";
    delete process.env.SESSION_SECRET;

    const { validateEnv } = await import("@/env");
    const result = validateEnv();
    expect(result.SESSION_SECRET).toBe("dev-secret");
  });
});
