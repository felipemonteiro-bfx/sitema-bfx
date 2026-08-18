import { NextResponse } from "next/server";
import {
  PROTOCOL_VERSION,
  SERVER_NAME,
  TOOLS,
  executarTool,
  exigeCadastro,
  instrucoesDaSessao,
  resolverEscopo,
  verificarToken,
  type Escopo,
} from "@/lib/mcp-agente";

/**
 * Transporte MCP (JSON-RPC 2.0 sobre HTTP POST) do `mcp-bfx`.
 * Spec: `docs/MCP-AGENTE-SPEC.md`.
 *
 * Esta rota está em `PUBLIC_API_PATHS` no `src/middleware.ts` — o middleware
 * autentica por cookie de sessão de usuário interno, que não existe aqui. A
 * autenticação é feita neste arquivo, por token de máquina, e é a primeira
 * coisa que acontece: sem token válido nada além de um 401 sai daqui.
 *
 * Servidor sem sessão, por decisão: o `Mcp-Session-Id` é opcional na spec, e
 * mantê-lo exigiria estado compartilhado entre réplicas para nada — o Bearer
 * viaja em toda requisição e é ele que carrega o escopo.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Requisicao {
  jsonrpc?: string;
  id?: number | string | null;
  method?: string;
  params?: Record<string, unknown>;
}

function resultado(id: number | string | null | undefined, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, result });
}

function erro(
  id: number | string | null | undefined,
  code: number,
  message: string,
) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
}

/** Erro de tool volta como resultado com `isError`, não como erro de protocolo:
 *  o modelo precisa poder se recuperar e explicar ao cliente, em vez de a
 *  conversa morrer numa exceção. */
function falhaDeTool(id: number | string | null | undefined, texto: string) {
  return resultado(id, {
    content: [{ type: "text", text: texto }],
    isError: true,
  });
}

export async function POST(req: Request) {
  const contato = await verificarToken(req.headers.get("authorization"));
  if (!contato) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let corpo: Requisicao | null = null;
  try {
    corpo = (await req.json()) as Requisicao;
  } catch {
    return erro(null, -32700, "Parse error");
  }
  if (!corpo || typeof corpo !== "object" || typeof corpo.method !== "string") {
    return erro(corpo?.id ?? null, -32600, "Invalid Request");
  }

  const { id, method } = corpo;
  const params = corpo.params ?? {};

  switch (method) {
    case "initialize":
      return resultado(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: SERVER_NAME, version: "1.0.0" },
        // Campo previsto na spec do MCP para o servidor orientar o cliente
        // sobre como usá-lo; o cliente o injeta no prompt do modelo. Aqui ele
        // carrega o estado de identificação, que é a informação que o modelo
        // precisa ter ANTES de decidir o que responder. Ver comentário em
        // `instrucoesDaSessao`. Nenhum dado sensível vai nele além do nome do
        // próprio cliente da conversa.
        instructions: await instrucoesDaSessao(
          contato.telefone,
          contato.nomeNoWhatsapp,
        ),
      });

    case "notifications/initialized":
      // Notificação: sem corpo de resposta.
      return new NextResponse(null, { status: 202 });

    case "tools/list":
      return resultado(id, { tools: TOOLS });

    case "tools/call": {
      const nome = typeof params.name === "string" ? params.name : "";
      const args = (params.arguments ?? {}) as Record<string, unknown>;

      if (!TOOLS.some((t) => t.name === nome)) {
        return falhaDeTool(id, `Ferramenta desconhecida: ${nome}`);
      }

      // O escopo é resolvido a partir do TOKEN, nunca de `args`. É o único
      // ponto onde "de quem é o dado" é decidido, e `args` não participa dele.
      let escopo: Escopo | null = null;
      if (exigeCadastro(nome)) {
        const r = await resolverEscopo(contato.telefone);
        if (!r.ok) {
          // Os dois campos são separados e rotulados de propósito. Observado
          // rodando de verdade: com instrução e texto no mesmo campo, o modelo
          // repapagueia a instrução para o cliente ("não preciso de CPF..."),
          // que é ruído interno vazando para o WhatsApp.
          return falhaDeTool(
            id,
            JSON.stringify({
              erro: r.erro,
              para_o_cliente: r.paraOCliente,
              instrucao_interna_nao_repetir: r.instrucao,
            }),
          );
        }
        escopo = r.escopo;
      }

      try {
        const saida = await executarTool(nome, args, escopo);
        return resultado(id, {
          content: [{ type: "text", text: JSON.stringify(saida) }],
          isError: false,
        });
      } catch (e) {
        // O detalhe fica no log do servidor, não na resposta: o texto devolvido
        // vai para o modelo, e do modelo pode ir direto para o WhatsApp do
        // cliente. Erro de Prisma carrega nome de tabela, coluna e às vezes o
        // SQL — nada disso pode atravessar essa fronteira.
        console.error("mcp_agente_tool_falhou", {
          tool: nome,
          erro: (e as Error).message,
        });
        return falhaDeTool(
          id,
          "Não consegui consultar essa informação agora. Ofereça encaminhar para um atendente.",
        );
      }
    }

    default:
      return erro(id, -32601, `Method not found: ${method}`);
  }
}
