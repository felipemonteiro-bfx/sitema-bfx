import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { abrirSessaoMcp, urlPermitida, urlDoMcp, McpClienteErro } = await import("@/lib/mcp-cliente");

const URL_OK = "http://127.0.0.1:3109/api/mcp/agente";
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });
const rpc = (result: unknown) => json({ jsonrpc: "2.0", id: 1, result });

/** Servidor falso que responde pelo método JSON-RPC do corpo. */
function servidor(over: Record<string, () => Response | Promise<Response>> = {}) {
  return vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const corpo = JSON.parse(String(init?.body));
    if (over[corpo.method]) return over[corpo.method]();
    switch (corpo.method) {
      case "initialize":
        return rpc({ protocolVersion: "2025-06-18", capabilities: {}, serverInfo: { name: "mcp-bfx" }, instructions: "O cliente é Maria." });
      case "notifications/initialized":
        return new Response(null, { status: 202 });
      case "tools/list":
        return rpc({ tools: [{ name: "meu_limite", description: "Limite", inputSchema: { type: "object", properties: {} } }] });
      case "tools/call":
        return rpc({ content: [{ type: "text", text: '{"limiteDisponivel":100}' }], isError: false });
      default:
        return json({ jsonrpc: "2.0", id: 1, error: { code: -32601, message: "Method not found" } });
    }
  });
}

let fetchMock: ReturnType<typeof servidor>;
beforeEach(() => {
  fetchMock = servidor();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("urlPermitida", () => {
  it("aceita 127.0.0.1, localhost e *.svc.cluster.local", () => {
    expect(urlPermitida("http://127.0.0.1:3008/api/mcp/agente")).toBe(true);
    expect(urlPermitida("http://localhost:3109/x")).toBe(true);
    expect(urlPermitida("http://mcp-bfx.bfx.svc.cluster.local/api/mcp/agente")).toBe(true);
  });
  it("recusa host externo, truque de sufixo, credencial na URL e protocolo estranho", () => {
    expect(urlPermitida("https://exemplo.com/api/mcp/agente")).toBe(false);
    expect(urlPermitida("http://svc.cluster.local.evil.com/x")).toBe(false);
    expect(urlPermitida("http://evilsvc.cluster.local/x")).toBe(false);
    expect(urlPermitida("http://127.0.0.1@evil.com/x")).toBe(false);
    expect(urlPermitida("file:///etc/passwd")).toBe(false);
    expect(urlPermitida("isto não é url")).toBe(false);
  });
  it("urlDoMcp usa MCP_AGENTE_URL, tem padrão do Service e recusa URL fora da lista", () => {
    expect(urlDoMcp()).toBe("http://mcp-bfx.bfx.svc.cluster.local/api/mcp/agente");
    vi.stubEnv("MCP_AGENTE_URL", URL_OK);
    expect(urlDoMcp()).toBe(URL_OK);
    vi.stubEnv("MCP_AGENTE_URL", "https://evil.example.com/mcp");
    expect(() => urlDoMcp()).toThrow(McpClienteErro);
  });
});

describe("abrirSessaoMcp", () => {
  it("faz initialize, notifications/initialized e tools/list, todos com Bearer, e guarda instructions", async () => {
    const s = await abrirSessaoMcp({ token: "tok", url: URL_OK });
    const metodos = fetchMock.mock.calls.map((c) => JSON.parse(String(c[1]?.body)).method);
    expect(metodos).toEqual(["initialize", "notifications/initialized", "tools/list"]);
    for (const c of fetchMock.mock.calls) {
      expect((c[1]?.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    }
    expect(s.instructions).toBe("O cliente é Maria.");
    expect(s.tools.map((t) => t.name)).toEqual(["meu_limite"]);
  });

  it("tools/call manda nome e argumentos com Bearer e devolve o texto", async () => {
    const s = await abrirSessaoMcp({ token: "tok", url: URL_OK });
    const r = await s.chamar("meu_limite", { x: 1 });
    expect(r).toEqual({ ok: true, texto: '{"limiteDisponivel":100}' });
    const ultima = fetchMock.mock.calls.at(-1)!;
    expect(JSON.parse(String(ultima[1]?.body)).params).toEqual({ name: "meu_limite", arguments: { x: 1 } });
    expect((ultima[1]?.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });

  it("202 sem corpo em notifications/initialized não é erro", async () => {
    await expect(abrirSessaoMcp({ token: "tok", url: URL_OK })).resolves.toBeTruthy();
  });

  it("401 sem envelope JSON-RPC vira McpClienteErro (sem vazar o corpo)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ error: "Não autorizado." }, 401)));
    await expect(abrirSessaoMcp({ token: "ruim", url: URL_OK })).rejects.toMatchObject({ name: "McpClienteErro", codigo: "nao_autorizado" });
  });

  it("erro JSON-RPC vira McpClienteErro", async () => {
    vi.stubGlobal("fetch", servidor({ "tools/list": () => json({ jsonrpc: "2.0", id: 1, error: { code: -32603, message: "boom" } }) }));
    await expect(abrirSessaoMcp({ token: "tok", url: URL_OK })).rejects.toMatchObject({ codigo: "erro_jsonrpc" });
  });

  it("isError:true com HTTP 200 devolve só para_o_cliente, nunca a instrução interna", async () => {
    const envelope = JSON.stringify({
      erro: "cliente_nao_identificado",
      para_o_cliente: "Não localizei um cadastro com este número.",
      instrucao_interna_nao_repetir: "SEGREDO-INTERNO não peça CPF",
    });
    vi.stubGlobal("fetch", servidor({ "tools/call": () => rpc({ content: [{ type: "text", text: envelope }], isError: true }) }));
    const s = await abrirSessaoMcp({ token: "tok", url: URL_OK });
    const r = await s.chamar("minhas_parcelas", {});
    expect(r.ok).toBe(false);
    expect(r.texto).toBe("Não localizei um cadastro com este número.");
    expect(JSON.stringify(r)).not.toContain("SEGREDO-INTERNO");
    expect(JSON.stringify(r)).not.toContain("instrucao_interna");
  });

  it("isError:true com texto simples devolve o texto genérico do servidor", async () => {
    vi.stubGlobal("fetch", servidor({ "tools/call": () => rpc({ content: [{ type: "text", text: "Não consegui consultar essa informação agora." }], isError: true }) }));
    const s = await abrirSessaoMcp({ token: "tok", url: URL_OK });
    expect(await s.chamar("meu_limite", {})).toEqual({ ok: false, texto: "Não consegui consultar essa informação agora." });
  });

  it("isError:true com JSON sem para_o_cliente não repassa o JSON cru", async () => {
    vi.stubGlobal("fetch", servidor({ "tools/call": () => rpc({ content: [{ type: "text", text: '{"instrucao_interna_nao_repetir":"x"}' }], isError: true }) }));
    const s = await abrirSessaoMcp({ token: "tok", url: URL_OK });
    const r = await s.chamar("meu_limite", {});
    expect(r.ok).toBe(false);
    expect(r.texto).not.toContain("instrucao_interna");
  });

  it("timeout aborta a requisição e vira McpClienteErro", async () => {
    vi.stubGlobal("fetch", vi.fn((_u: unknown, init?: RequestInit) => new Promise((_res, rej) => {
      init?.signal?.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError")));
    })));
    await expect(abrirSessaoMcp({ token: "tok", url: URL_OK, timeoutMs: 20 })).rejects.toMatchObject({ codigo: "timeout" });
  });

  it("URL fora da lista é recusada ANTES de qualquer fetch", async () => {
    await expect(abrirSessaoMcp({ token: "tok", url: "https://evil.example.com/mcp" })).rejects.toBeInstanceOf(McpClienteErro);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
