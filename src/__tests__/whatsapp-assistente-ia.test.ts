import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { MockLanguageModelV3 } from "ai/test";

const m = vi.hoisted(() => ({ config: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { config: { findFirst: m.config } } }));

const { responderComAssistente, ajustarSaida } = await import("@/lib/whatsapp-assistente-ia");
const { TOOLS } = await import("@/lib/mcp-agente");

const URL_MCP = "http://127.0.0.1:3109/api/mcp/agente";
const SEGREDO = "segredo-mcp-de-teste-com-mais-de-32-caracteres";

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });
const rpc = (result: unknown) => json({ jsonrpc: "2.0", id: 1, result });

/** Servidor MCP falso com as tools reais do servidor da BFX. */
function servidorMcp(callResult: () => Response = () => rpc({ content: [{ type: "text", text: '{"limiteDisponivel":100}' }], isError: false })) {
  return vi.fn(async (_u: string | URL | Request, init?: RequestInit) => {
    const corpo = JSON.parse(String(init?.body));
    if (corpo.method === "initialize") return rpc({ instructions: "O cliente desta conversa é Maria Teste, já identificada." });
    if (corpo.method === "notifications/initialized") return new Response(null, { status: 202 });
    if (corpo.method === "tools/list") return rpc({ tools: TOOLS });
    if (corpo.method === "tools/call") return callResult();
    return json({ error: "x" }, 400);
  });
}

type Passo = { tool: string; args?: unknown } | { texto: string };
/** Modelo falso: cada chamada consome um passo (tool-call ou texto final). */
function modelo(passos: Passo[], prompts: unknown[] = []) {
  let i = 0;
  return new MockLanguageModelV3({
    doGenerate: async (opts) => {
      prompts.push(opts);
      const p = passos[Math.min(i++, passos.length - 1)];
      const usage = {
        inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 1, text: 1, reasoning: 0 },
      };
      if ("tool" in p) {
        return {
          content: [{ type: "tool-call" as const, toolCallId: `c${i}`, toolName: p.tool, input: JSON.stringify(p.args ?? {}) }],
          finishReason: { unified: "tool-calls" as const, raw: "tool_calls" },
          usage,
          warnings: [],
        };
      }
      return {
        content: [{ type: "text" as const, text: p.texto }],
        finishReason: { unified: "stop" as const, raw: "stop" },
        usage,
        warnings: [],
      };
    },
  });
}

let fetchMcp: ReturnType<typeof servidorMcp>;
beforeEach(() => {
  vi.stubEnv("MCP_AGENTE_SECRET", SEGREDO);
  vi.stubEnv("MCP_AGENTE_URL", URL_MCP);
  m.config.mockResolvedValue({ litellmUrl: "https://litellm.local", litellmKey: "k", litellmModel: "modelo-teste" });
  fetchMcp = servidorMcp();
  vi.stubGlobal("fetch", fetchMcp);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const base = { telefone: "5592999990000", nome: "Maria", historico: [] as { papel: "user" | "assistant"; texto: string }[] };

describe("responderComAssistente", () => {
  it("usa as tools do servidor MCP, devolve texto e marca usouTool", async () => {
    const r = await responderComAssistente({ ...base, texto: "qual meu limite?" }, {
      modelo: modelo([{ tool: "meu_limite" }, { texto: "Seu limite disponível é de cem reais." }]),
    });
    expect(r?.usouTool).toBe(true);
    expect(r?.texto).toContain("Seu limite disponível é de cem reais.");
    const metodos = fetchMcp.mock.calls.map((c) => JSON.parse(String(c[1]?.body)).method);
    expect(metodos).toEqual(["initialize", "notifications/initialized", "tools/list", "tools/call"]);
    for (const c of fetchMcp.mock.calls) expect((c[1]?.headers as Record<string, string>).Authorization).toMatch(/^Bearer ey/);
  });

  it("estado de identificação e persona entram no system; histórico e a entrada vão nas mensagens", async () => {
    const prompts: { prompt: { role: string; content: unknown }[] }[] = [];
    await responderComAssistente(
      { ...base, texto: "sim, o primeiro", historico: [{ papel: "user", texto: "tem iphone?" }, { papel: "assistant", texto: "Temos o iPhone 13 e o 14. Qual prefere?" }] },
      { modelo: modelo([{ texto: "Certo, o iPhone 13." }], prompts) },
    );
    const prompt = prompts[0].prompt;
    const system = String(prompt.find((p) => p.role === "system")?.content);
    expect(system).toContain("identificado como Maria Teste");
    expect(system).toMatch(/BFX/);
    expect(system).toMatch(/preç/i);
    const papeis = prompt.map((p) => p.role);
    expect(papeis).toEqual(["system", "user", "assistant", "user"]);
    expect(JSON.stringify(prompt.at(-1))).toContain("sim, o primeiro");
  });

  it("corta a entrada em 1000 caracteres", async () => {
    const prompts: { prompt: unknown[] }[] = [];
    await responderComAssistente({ ...base, texto: "a".repeat(5000) }, { modelo: modelo([{ texto: "ok" }], prompts) });
    const ultimo = JSON.stringify(prompts[0].prompt.at(-1));
    expect(ultimo).toContain("a".repeat(1000));
    expect(ultimo).not.toContain("a".repeat(1001));
  });

  it("nenhuma tool exposta ao modelo tem clienteId, telefone ou cpf", async () => {
    const prompts: { tools?: { name: string; inputSchema: unknown }[] }[] = [];
    await responderComAssistente({ ...base, texto: "oi" }, { modelo: modelo([{ texto: "Olá!" }], prompts) });
    const tools = prompts[0].tools ?? [];
    expect(tools.map((t) => t.name).sort()).toEqual(["catalogo_produtos", "meu_limite", "meus_boletos", "minhas_parcelas"]);
    for (const t of tools) {
      const schema = JSON.stringify(t.inputSchema).toLowerCase();
      for (const proibido of ["clienteid", "cliente_id", "telefone", "cpf"]) expect(schema).not.toContain(proibido);
    }
  });

  it("descarta tool do servidor que aceite identificador de pessoa", async () => {
    const perigosa = { name: "dados_de", description: "x", inputSchema: { type: "object", properties: { clienteId: { type: "integer" } } } };
    vi.stubGlobal("fetch", vi.fn(async (_u: unknown, init?: RequestInit) => {
      const c = JSON.parse(String(init?.body));
      if (c.method === "tools/list") return rpc({ tools: [...TOOLS, perigosa] });
      if (c.method === "notifications/initialized") return new Response(null, { status: 202 });
      return rpc({ instructions: "x" });
    }));
    const prompts: { tools?: { name: string }[] }[] = [];
    await responderComAssistente({ ...base, texto: "oi" }, { modelo: modelo([{ texto: "Olá!" }], prompts) });
    expect(prompts[0].tools?.map((t) => t.name)).not.toContain("dados_de");
  });

  it("limita a 4 passos: modelo que só chama tool vira null", async () => {
    const mod = modelo([{ tool: "meu_limite" }]);
    const r = await responderComAssistente({ ...base, texto: "limite" }, { modelo: mod });
    expect(r).toBeNull();
    expect(mod.doGenerateCalls.length).toBe(4);
  });

  it("falha fechada: sem segredo, sem LiteLLM, MCP fora do ar, modelo com erro, resposta vazia", async () => {
    vi.stubEnv("MCP_AGENTE_SECRET", "");
    expect(await responderComAssistente({ ...base, texto: "oi" }, { modelo: modelo([{ texto: "x" }]) })).toBeNull();
    vi.stubEnv("MCP_AGENTE_SECRET", SEGREDO);

    m.config.mockResolvedValue({});
    const antes = fetchMcp.mock.calls.length;
    expect(await responderComAssistente({ ...base, texto: "oi" })).toBeNull();
    expect(fetchMcp.mock.calls.length).toBe(antes);
    m.config.mockResolvedValue({ litellmUrl: "https://litellm.local", litellmKey: "k" });

    vi.stubGlobal("fetch", vi.fn(async () => json({ error: "x" }, 401)));
    expect(await responderComAssistente({ ...base, texto: "oi" }, { modelo: modelo([{ texto: "x" }]) })).toBeNull();
    vi.stubGlobal("fetch", servidorMcp());

    const quebrado = new MockLanguageModelV3({ doGenerate: async () => { throw new Error("litellm 500"); } });
    expect(await responderComAssistente({ ...base, texto: "oi" }, { modelo: quebrado })).toBeNull();
    expect(await responderComAssistente({ ...base, texto: "oi" }, { modelo: modelo([{ texto: "<think>pensando</think>" }]) })).toBeNull();
  });

  it("timeout total aborta e devolve null", async () => {
    const lento = new MockLanguageModelV3({
      doGenerate: async (o) => new Promise((_res, rej) => o.abortSignal?.addEventListener("abort", () => rej(new Error("abortado")))),
    });
    expect(await responderComAssistente({ ...base, texto: "oi" }, { modelo: lento, timeoutMs: 50 })).toBeNull();
  });

  it("erro de tool (sem cadastro) entrega ao modelo só para_o_cliente", async () => {
    const envelope = JSON.stringify({ erro: "cliente_nao_identificado", para_o_cliente: "Não localizei um cadastro com este número.", instrucao_interna_nao_repetir: "SEGREDO-INTERNO" });
    vi.stubGlobal("fetch", servidorMcp(() => rpc({ content: [{ type: "text", text: envelope }], isError: true })));
    const prompts: { prompt: unknown[] }[] = [];
    const r = await responderComAssistente({ ...base, texto: "qual meu limite?" }, {
      modelo: modelo([{ tool: "meu_limite" }, { texto: "Não localizei seu cadastro por este número." }], prompts),
    });
    const ultimaChamada = JSON.stringify(prompts[1].prompt);
    expect(ultimaChamada).toContain("Não localizei um cadastro com este número.");
    expect(ultimaChamada).not.toContain("SEGREDO-INTERNO");
    // Pergunta financeira sem consulta bem-sucedida: aterramento derruba para o determinístico.
    expect(r).toBeNull();
  });

  it("assunto financeiro/pedido sem tool bem-sucedida cai no determinístico (null)", async () => {
    expect(await responderComAssistente({ ...base, texto: "quanto devo de parcela?" }, { modelo: modelo([{ texto: "Você deve duzentos reais." }]) })).toBeNull();
    expect(await responderComAssistente({ ...base, texto: "cadê meu pedido?" }, { modelo: modelo([{ texto: "Está a caminho." }]) })).toBeNull();
  });

  it.each(["qual meu limite?", "quanto devo?", "quando vence?", "posso pagar amanhã?", "fiz o pix agora, confirma?", "tenho atraso?", "minha dívida", "fiz o depósito"])(
    "pergunta financeira '%s' sem tool cai no determinístico (null)",
    async (pergunta) => {
      expect(await responderComAssistente({ ...base, texto: pergunta }, { modelo: modelo([{ texto: "Está tudo certo, pode ficar tranquilo." }]) })).toBeNull();
    },
  );

  it("tool financeira usada força a ressalva mesmo com assunto que a regex não pega", async () => {
    const r = await responderComAssistente({ ...base, texto: "como estamos?" }, {
      modelo: modelo([{ tool: "meu_limite" }, { texto: "Seu limite disponível é de cem." }]),
    });
    expect(r?.texto).toMatch(/não confirma quitação/i);
  });

  it("texto do modelo que fala em recebimento/quitação leva a ressalva em qualquer assunto", async () => {
    const r = await responderComAssistente({ ...base, texto: "bom dia, tudo bem?" }, {
      modelo: modelo([{ texto: "Bom dia! Recebemos sua mensagem." }]),
    });
    expect(r?.texto).toMatch(/não confirma quitação/i);
  });

  it("system prompt não cola o texto interno de instrucao (ambíguo/sem cadastro) e deriva o estado", async () => {
    const casos: [string, string[], string][] = [
      ["Não localizei um cadastro com este número. Não existe consulta por CPF, matrícula ou qualquer outro documento — não peça nenhum.", ["Não existe consulta por CPF"], "sem cadastro"],
      ["Preciso confirmar sua identidade antes de mostrar esses dados. Este número aparece em mais de um cadastro. Não tente desempatar", ["Não tente desempatar", "mais de um cadastro"], "ambígua"],
    ];
    for (const [instr, proibidos, estado] of casos) {
      vi.stubGlobal("fetch", vi.fn(async (_u: unknown, init?: RequestInit) => {
        const c = JSON.parse(String(init?.body));
        if (c.method === "initialize") return rpc({ instructions: `As ferramentas deste servidor já sabem quem está falando. ATENÇÃO: ${instr}` });
        if (c.method === "notifications/initialized") return new Response(null, { status: 202 });
        if (c.method === "tools/list") return rpc({ tools: TOOLS });
        return json({ error: "x" }, 400);
      }));
      const prompts: { prompt: { role: string; content: unknown }[] }[] = [];
      await responderComAssistente({ ...base, texto: "oi" }, { modelo: modelo([{ texto: "Olá!" }], prompts) });
      const system = JSON.stringify(prompts[0].prompt.find((p) => p.role === "system")?.content);
      for (const proibido of proibidos) expect(system).not.toContain(proibido);
      expect(system).toContain(estado);
    }
  });

  it("identificado: o system prompt traz só o nome, não o texto cru do servidor", async () => {
    const prompts: { prompt: { role: string; content: unknown }[] }[] = [];
    await responderComAssistente({ ...base, texto: "oi" }, { modelo: modelo([{ texto: "Olá!" }], prompts) });
    const system = JSON.stringify(prompts[0].prompt.find((p) => p.role === "system")?.content);
    expect(system).toContain("Maria Teste");
    expect(system).not.toContain("O cliente desta conversa é Maria Teste, já identificada.");
  });

  it("assunto financeiro com tool ok anexa a ressalva fixa de quitação", async () => {
    const r = await responderComAssistente({ ...base, texto: "já está paga minha parcela?" }, {
      modelo: modelo([{ tool: "minhas_parcelas" }, { texto: "A parcela 1 consta como paga no sistema." }]),
    });
    expect(r?.texto).toContain("A parcela 1 consta como paga no sistema.");
    expect(r?.texto).toMatch(/não confirma quitação/i);
  });

  it("assunto de produto: R$ do modelo cai no determinístico; sem R$, anexa a ressalva de preço", async () => {
    expect(await responderComAssistente({ ...base, texto: "quanto custa o iphone?" }, {
      modelo: modelo([{ tool: "catalogo_produtos" }, { texto: "O iPhone 13 custa R$ 3.000." }]),
    })).toBeNull();
    const r = await responderComAssistente({ ...base, texto: "tem iphone?" }, {
      modelo: modelo([{ tool: "catalogo_produtos" }, { texto: "Temos o iPhone 13 disponível." }]),
    });
    expect(r?.texto).toContain("Temos o iPhone 13 disponível.");
    expect(r?.texto).toContain("A equipe confirma preço e condições antes da oferta");
  });

  it("não importa o stack de IA do chat interno (runAiWithActions, aiActions, lib/mcp)", () => {
    const fonte = readFileSync("src/lib/whatsapp-assistente-ia.ts", "utf8");
    expect(fonte).not.toContain("runAiWithActions");
    expect(fonte).not.toContain("aiActions");
    expect(fonte).not.toContain("ai-actions");
    expect(fonte).not.toMatch(/from\s+["']@\/lib\/mcp["']/);
    expect(fonte).not.toMatch(/from\s+["']@\/lib\/ai["']/);
    expect(fonte).not.toContain("createSessionToken");
  });
});

describe("ajustarSaida", () => {
  it("remove <think>, markdown e vírgula de lista", () => {
    const s = ajustarSaida("<think>oculto</think>**Olá**, veja:\n# Título\n* item um\n[boleto](https://x.com/b)\n`código`");
    expect(s).not.toContain("think");
    expect(s).not.toMatch(/[*#`]/);
    expect(s).toContain("- item um");
    expect(s).toContain("boleto: https://x.com/b");
  });
  it("trunca em fronteira de linha até 1500 sem quebrar link", () => {
    const linhas = Array.from({ length: 40 }, (_, i) => `Linha ${i} ` + "x".repeat(60) + ` https://boleto.exemplo.com/${i}`);
    const s = ajustarSaida(linhas.join("\n"));
    expect(s.length).toBeLessThanOrEqual(1500);
    const ultima = s.split("\n").at(-1) ?? "";
    expect(ultima).toMatch(/https:\/\/boleto\.exemplo\.com\/\d+$/);
  });
  it("respeita um limite menor (reserva da ressalva)", () => {
    expect(ajustarSaida("a b ".repeat(500), 100).length).toBeLessThanOrEqual(100);
  });
});
