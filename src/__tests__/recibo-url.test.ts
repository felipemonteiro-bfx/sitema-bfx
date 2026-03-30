import { describe, it, expect } from "vitest";
import { signReciboId, verifyReciboSig } from "@/lib/recibo-url";

describe("recibo-url", () => {
  it("sig gerada e valida", () => {
    const sig = signReciboId(42);
    expect(verifyReciboSig("42", sig)).toBe(true);
  });

  it("sig invalida rejeitada", () => {
    expect(verifyReciboSig("42", "wrong-sig")).toBe(false);
  });

  it("sig de IDs diferentes nao sao iguais", () => {
    const sig1 = signReciboId(1);
    const sig2 = signReciboId(2);
    expect(sig1).not.toBe(sig2);
  });

  it("retorna false para id ou sig vazios", () => {
    expect(verifyReciboSig("", "some-sig")).toBe(false);
    expect(verifyReciboSig("42", "")).toBe(false);
  });

  it("sig e deterministica (mesmo id = mesma sig)", () => {
    const sig1 = signReciboId(99);
    const sig2 = signReciboId(99);
    expect(sig1).toBe(sig2);
  });
});
