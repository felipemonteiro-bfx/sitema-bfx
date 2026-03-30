import { describe, it, expect, vi } from "vitest";

// Mock getSession to avoid cookie dependency
vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));

import { requireAdmin, requireAdminOrThrow } from "@/lib/guards";
import { getSession } from "@/lib/session";

const mockGetSession = vi.mocked(getSession);

describe("requireAdmin", () => {
  it("retorna true para admin", async () => {
    mockGetSession.mockResolvedValue({ id: 1, username: "admin", role: "admin" });
    expect(await requireAdmin()).toBe(true);
  });

  it("retorna false para vendedor", async () => {
    mockGetSession.mockResolvedValue({ id: 2, username: "user", role: "vendedor" });
    expect(await requireAdmin()).toBe(false);
  });

  it("retorna false sem sessao", async () => {
    mockGetSession.mockResolvedValue(null);
    expect(await requireAdmin()).toBe(false);
  });
});

describe("requireAdminOrThrow", () => {
  it("retorna session para admin", async () => {
    mockGetSession.mockResolvedValue({ id: 1, username: "admin", role: "admin" });
    const session = await requireAdminOrThrow();
    expect(session.id).toBe(1);
    expect(session.role).toBe("admin");
  });

  it("lanca erro para vendedor", async () => {
    mockGetSession.mockResolvedValue({ id: 2, username: "user", role: "vendedor" });
    await expect(requireAdminOrThrow()).rejects.toThrow("Acesso negado");
  });

  it("lanca erro sem sessao", async () => {
    mockGetSession.mockResolvedValue(null);
    await expect(requireAdminOrThrow()).rejects.toThrow("Nao autenticado");
  });
});
