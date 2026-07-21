import { describe, it, expect, vi } from "vitest";

// Mock next/headers to avoid cookie dependency in test environment
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
  }),
}));

describe("session secret fail-fast", () => {
  it("session.ts carrega sem erro em development (sem SESSION_SECRET)", async () => {
    // In test environment (not production), should load fine with fallback
    const mod = await import("@/lib/session");
    expect(mod.createSessionToken).toBeDefined();
    expect(mod.verifySessionToken).toBeDefined();
    expect(mod.getSession).toBeDefined();
  });
});
