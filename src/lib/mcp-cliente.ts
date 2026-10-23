/**
 * Cliente MCP mínimo (JSON-RPC 2.0 sobre `fetch`) para o assistente interno do WhatsApp falar com
 * o `mcp-bfx` (`src/app/api/mcp/agente/route.ts`). Spec: `docs/MCP-AGENTE-SPEC.md`.
 *
 * O pacote `ai` instalado não traz cliente MCP e não dá para instalar um. O protocolo que o
 * servidor fala é pequeno: `initialize` (guarda `instructions`), `notifications/initialized`
 * (202 sem corpo), `tools/list` e `tools/call`, todos com Bearer.
 *
 * Duas fronteiras importam aqui:
 * - o host da URL é de uma lista curta (o token vai nela); URL fora da lista é recusada;
 * - o que volta de um `tools/call` com erro vai para o modelo, e do modelo pode ir ao WhatsApp do
 *   cliente. Por isso só `para_o_cliente` atravessa; `instrucao_interna_nao_repetir` nunca.
 */

const URL_PADRAO = "http://mcp-bfx.bfx.svc.cluster.local/api/mcp/agente";
const TIMEOUT_PADRAO_MS = 8_000;
const PROTOCOLO = "2025-06-18";

export type CodigoErroMcp =
  | "url_recusada"
  | "nao_autorizado"
  | "http"
  | "erro_jsonrpc"
  | "resposta_invalida"
  | "timeout"
  | "rede";

export class McpClienteErro extends Error {
  constructor(
    public codigo: CodigoErroMcp,
    mensagem?: string,
  ) {
    super(mensagem ?? codigo);
    this.name = "McpClienteErro";
  }
}

export interface McpFerramenta {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

export interface ResultadoChamada {
  ok: boolean;
  texto: string;
}

export interface SessaoMcp {
  instructions: string;
  tools: McpFerramenta[];
  chamar(nome: string, args: Record<string, unknown>): Promise<ResultadoChamada>;
}

/** Só loopback e Service interno do cluster recebem o Bearer. */
export function urlPermitida(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  if (u.username || u.password) return false;
  const host = u.hostname.toLowerCase();
  return host === "127.0.0.1" || host === "localhost" || host.endsWith(".svc.cluster.local");
}

export function urlDoMcp(): string {
  const url = process.env.MCP_AGENTE_URL?.trim() || URL_PADRAO;
  if (!urlPermitida(url)) throw new McpClienteErro("url_recusada", "Host do MCP fora da lista permitida.");
  return url;
}

interface OpcoesSessao {
  token: string;
  url?: string;
  /** Timeout de cada requisição. */
  timeoutMs?: number;
  /** Prazo global do chamador (ex.: o orçamento de tempo da resposta inteira). */
  signal?: AbortSignal;
}

export async function abrirSessaoMcp(opts: OpcoesSessao): Promise<SessaoMcp> {
  const url = opts.url ?? urlDoMcp();
  if (!urlPermitida(url)) throw new McpClienteErro("url_recusada", "Host do MCP fora da lista permitida.");
  const timeoutMs = opts.timeoutMs ?? TIMEOUT_PADRAO_MS;
  let proximoId = 1;

  /** Uma requisição JSON-RPC. `notificacao` não tem id nem resposta com corpo. */
  async function chamarRpc(method: string, params: unknown, notificacao = false): Promise<unknown> {
    const sinais = [AbortSignal.timeout(timeoutMs)];
    if (opts.signal) sinais.push(opts.signal);
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${opts.token}`,
        },
        body: JSON.stringify({ jsonrpc: "2.0", ...(notificacao ? {} : { id: proximoId++ }), method, params }),
        signal: AbortSignal.any(sinais),
      });
    } catch (e) {
      const nome = (e as { name?: string })?.name;
      throw new McpClienteErro(nome === "AbortError" || nome === "TimeoutError" ? "timeout" : "rede");
    }
    // 401 vem sem envelope JSON-RPC: `{ error: "..." }`. Não repassa o corpo.
    if (res.status === 401) throw new McpClienteErro("nao_autorizado");
    if (!res.ok) throw new McpClienteErro("http", `HTTP ${res.status}`);
    if (notificacao) return null;
    let corpo: { result?: unknown; error?: { message?: string } };
    try {
      corpo = (await res.json()) as typeof corpo;
    } catch {
      throw new McpClienteErro("resposta_invalida");
    }
    if (corpo?.error) throw new McpClienteErro("erro_jsonrpc", corpo.error.message);
    if (corpo?.result === undefined) throw new McpClienteErro("resposta_invalida");
    return corpo.result;
  }

  const init = (await chamarRpc("initialize", {
    protocolVersion: PROTOCOLO,
    capabilities: {},
    clientInfo: { name: "bfx-assistente-whatsapp", version: "1.0.0" },
  })) as { instructions?: unknown };
  await chamarRpc("notifications/initialized", {}, true);
  const lista = (await chamarRpc("tools/list", {})) as { tools?: McpFerramenta[] };
  if (!Array.isArray(lista.tools)) throw new McpClienteErro("resposta_invalida");

  return {
    instructions: typeof init.instructions === "string" ? init.instructions : "",
    tools: lista.tools,
    async chamar(nome, args) {
      const r = (await chamarRpc("tools/call", { name: nome, arguments: args })) as {
        content?: { type?: string; text?: string }[];
        isError?: boolean;
      };
      const texto = (r.content ?? [])
        .filter((c) => c?.type === "text" && typeof c.text === "string")
        .map((c) => c.text as string)
        .join("\n");
      if (!r.isError) return { ok: true, texto };
      return { ok: false, texto: textoSeguroDeErro(texto) };
    },
  };
}

/**
 * Erro de tool chega como JSON `{ erro, para_o_cliente, instrucao_interna_nao_repetir }` (falta de
 * cadastro) ou como frase simples. Do JSON só `para_o_cliente` passa; JSON sem ele vira frase fixa.
 */
function textoSeguroDeErro(texto: string): string {
  const generico = "Não consegui consultar essa informação agora.";
  const t = texto.trim();
  if (!t.startsWith("{")) return t || generico;
  try {
    const o = JSON.parse(t) as { para_o_cliente?: unknown };
    return typeof o.para_o_cliente === "string" && o.para_o_cliente.trim() ? o.para_o_cliente : generico;
  } catch {
    return generico;
  }
}
