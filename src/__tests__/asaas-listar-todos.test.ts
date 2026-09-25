import { afterEach, describe, expect, it, vi } from "vitest";
import { listAllPayments } from "@/lib/asaas";

const config = { baseUrl: "https://asaas.test", apiKey: "k" };

function pagina(offset: number, n: number, hasMore: boolean) {
  return { data: Array.from({ length: n }, (_, i) => ({ id: `p${offset + i}`, value: 1, dueDate: "2026-09-01", status: "OVERDUE" })), hasMore, totalCount: 250 };
}

afterEach(() => vi.unstubAllGlobals());

describe("listAllPayments", () => {
  it("pagina até o fim em vez de parar nos 100 primeiros", async () => {
    const urls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      urls.push(url);
      const offset = Number(new URL(url).searchParams.get("offset"));
      const corpo = offset === 0 ? pagina(0, 100, true) : offset === 100 ? pagina(100, 100, true) : pagina(200, 50, false);
      return new Response(JSON.stringify(corpo), { status: 200 });
    }));

    const r = await listAllPayments(config, { billingType: "BOLETO", status: "OVERDUE" });
    expect(r).toHaveLength(250);
    expect(urls.map((u) => new URL(u).searchParams.get("offset"))).toEqual(["0", "100", "200"]);
    expect(new URL(urls[0]).searchParams.get("status")).toBe("OVERDUE");
  });

  it("respeita o teto para não varrer sem fim", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const offset = Number(new URL(url).searchParams.get("offset"));
      return new Response(JSON.stringify(pagina(offset, 100, true)), { status: 200 });
    }));
    const r = await listAllPayments(config, { billingType: "BOLETO", status: "RECEIVED" }, 300);
    expect(r).toHaveLength(300);
  });
});
