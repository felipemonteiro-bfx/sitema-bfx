import { prisma } from "@/lib/db";
import { aiActions, executeAiAction, type ActionContext } from "@/lib/ai-actions";
import { generateText, tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

const toolSchema = z.object({}).passthrough();

export async function runAi(prompt: string, provider: "openai" | "gemini") {
  const cfg = await prisma.config.findFirst();
  if (provider === "openai") {
    if (!cfg?.openaiKey) return "Chave OpenAI nao configurada.";
    const openai = createOpenAI({ apiKey: cfg.openaiKey });
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
    });
    return text || "Sem resposta.";
  }

  if (!cfg?.geminiKey) return "Chave Gemini nao configurada.";
  const google = createGoogleGenerativeAI({ apiKey: cfg.geminiKey });
  const { text } = await generateText({
    model: google("gemini-2.5-flash"),
    prompt,
  });
  return text || "Sem resposta.";
}

const readOnlyActions = new Set([
  "listar_vendas",
  "listar_clientes",
  "listar_produtos",
  "listar_despesas",
  "listar_empresas",
  "listar_usuarios",
]);

export async function runAiWithActions(
  prompt: string,
  provider: "openai" | "gemini",
  ctx: ActionContext & {
    mode?: "plan" | "execute";
    executeAction?: { name: string; params: Record<string, unknown> };
    baseUrl?: string;
  }
) {
  const languageHint =
    "Responda sempre em portugues do Brasil. " +
    "Quando precisar criar/atualizar algo, descreva o que pretende fazer e " +
    "inclua uma linha no final com ACTIONS: [ {\"name\":\"...\",\"params\":{...}} ].";
  const currency = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const summarizeDespesas = (rows: any[]) => {
    const total = rows.reduce((sum, item) => sum + Number(item?.valor ?? 0), 0);
    return `Despesas encontradas: ${rows.length}. Total: ${currency.format(total)}.`;
  };

  
  const buildToolSummary = (executed: { name: string; result: unknown }[]) => {
    if (!executed.length) return "";
    const parts: string[] = [];
    for (const item of executed) {
      if (item.name === "listar_clientes" && Array.isArray(item.result)) {
        const nomes = (item.result as any[]).slice(0, 5).map((c) => c.nome).filter(Boolean);
        parts.push(
          nomes.length
            ? `Clientes encontrados: ${nomes.join(", ")}.`
            : "Nenhum cliente encontrado."
        );
      } else if (item.name === "listar_produtos" && Array.isArray(item.result)) {
        const nomes = (item.result as any[]).slice(0, 5).map((p) => p.nome).filter(Boolean);
        parts.push(
          nomes.length
            ? `Produtos encontrados: ${nomes.join(", ")}.`
            : "Nenhum produto encontrado."
        );
      } else if (item.name === "listar_vendas" && Array.isArray(item.result)) {
        parts.push(`Vendas encontradas: ${(item.result as any[]).length}.`);
      } else if (item.name === "listar_despesas" && Array.isArray(item.result)) {
        parts.push(summarizeDespesas(item.result as any[]));
      } else if (item.name === "listar_usuarios" && Array.isArray(item.result)) {
        const nomes = (item.result as any[]).slice(0, 5).map((u) => u.nomeExibicao || u.username).filter(Boolean);
        parts.push(
          nomes.length
            ? `Usuários encontrados: ${nomes.join(", ")}.`
            : "Nenhum usuário encontrado."
        );
      } else {
        parts.push(`Ação executada: ${item.name}.`);
      }
    }
    return parts.join("\n");
  };

  const shouldAppendSummary = (text: string) =>
    !text.trim() || /buscando|aguarde|processando|consultando/i.test(text);
const isDespesasMes = /despesa|gasto|gastando/i.test(prompt) && /m[eê]s|mes/i.test(prompt);

  if (ctx.mode === "execute" && ctx.executeAction) {
    const execResult = await executeAiAction(ctx.executeAction.name, ctx.executeAction.params, ctx);
    const links: { label: string; url: string }[] = [];
    if (ctx.executeAction.name === "criar_venda" && execResult && typeof execResult === "object") {
      const venda = execResult as { uuid?: string; id?: number };
      const token = venda.uuid ?? String(venda.id ?? "");
      if (token) {
        const baseUrl =
          ctx.baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        links.push({ label: "Recibo PDF", url: `${baseUrl}/api/recibo?id=${token}` });
      }
    }
    return { text: "Ação executada com sucesso.", actions: [ctx.executeAction], links };
  }

  if (provider === "gemini") {
    const cfg = await prisma.config.findFirst();
    if (!cfg?.geminiKey) return { text: "Chave Gemini nao configurada.", actions: [] };

    const google = createGoogleGenerativeAI({ apiKey: cfg.geminiKey });
    const executed: { name: string; result: unknown }[] = [];
    const tools = Object.fromEntries(
      aiActions
        .filter((action) => (ctx.mode === "plan" ? readOnlyActions.has(action.name) : true))
        .map((action) => [
          action.name,
          tool({
            description: action.description,
            inputSchema: toolSchema,
            execute: async (args) => {
              const result = await executeAiAction(action.name, args ?? {}, ctx);
              executed.push({ name: action.name, result });
              return result;
            },
          }),
        ])
    );

    let text = "";
    try {
      const result = await generateText({
        model: google("gemini-2.5-flash"),
        messages: [
          { role: "system", content: languageHint },
          { role: "user", content: prompt },
        ],
        tools,
      });
      text = result.text ?? "";
    } catch (err) {
      // Fallback to OpenAI when Gemini hits quota or fails
      if (cfg?.openaiKey) {
        const openai = createOpenAI({ apiKey: cfg.openaiKey });
        try {
          const result = await generateText({
            model: openai("gpt-4o-mini"),
            messages: [
              {
                role: "system",
                content:
                  "Voce e um assistente do sistema BFX. Use as funcoes disponiveis para executar acoes. " +
                  "Quando precisar criar/atualizar algo, descreva e inclua ACTIONS: [...] no final. " +
                  "Responda sempre em portugues do Brasil.",
              },
              { role: "user", content: prompt },
            ],
            tools,
          });
          text = result.text ?? "";
        } catch {
          return {
            text:
              "O provedor Gemini atingiu o limite de uso. Tente novamente em alguns minutos ou altere para OpenAI.",
            actions: executed,
          };
        }
      } else {
        return {
          text:
            "O provedor Gemini atingiu o limite de uso. Tente novamente em alguns minutos ou configure a chave OpenAI.",
          actions: executed,
        };
      }
    }

    if (executed.length === 0 && isDespesasMes) {
      try {
        const now = new Date();
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const result = await executeAiAction(
          "listar_despesas",
          { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
          ctx
        );
        if (Array.isArray(result)) {
          return { text: summarizeDespesas(result), actions: [{ name: "listar_despesas", result }] };
        }
      } catch {
        // fallback below
      }
    }

    if (ctx.mode === "plan") {
      const planned = extractActions(text);
      return { text: stripActions(text), actions: planned };
    }
    if (text && text.trim()) {
      const summary = buildToolSummary(executed);
      if (summary && shouldAppendSummary(text)) {
        return { text: summary, actions: executed };
      }
      if (summary) {
        return { text: `${text}\n\n${summary}`, actions: executed };
      }
      return { text, actions: executed };
    }
    if (executed.length === 0) return { text: "Sem resposta.", actions: executed };

    const fallbackText = executed
      .map((a) => {
        if (a.name === "listar_clientes" && Array.isArray(a.result)) {
          const items = (a.result as any[]).slice(0, 3).map((c) => c.nome).filter(Boolean);
          return items.length
            ? `Clientes encontrados: ${items.join(", ")}.`
            : "Nenhum cliente encontrado.";
        }
        if (a.name === "listar_despesas" && Array.isArray(a.result)) {
          return summarizeDespesas(a.result as any[]);
        }
        return `Ação executada: ${a.name}.`;
      })
      .join("\n");

    return { text: fallbackText, actions: executed };
  }

  const cfg = await prisma.config.findFirst();
  if (!cfg?.openaiKey) return { text: "Chave OpenAI nao configurada.", actions: [] };

  const openai = createOpenAI({ apiKey: cfg.openaiKey });
  const executed: { name: string; result: unknown }[] = [];
  const tools = Object.fromEntries(
    aiActions
      .filter((action) => (ctx.mode === "plan" ? readOnlyActions.has(action.name) : true))
      .map((action) => [
        action.name,
        tool({
          description: action.description,
          inputSchema: toolSchema,
          execute: async (args) => {
            const result = await executeAiAction(action.name, args ?? {}, ctx);
            executed.push({ name: action.name, result });
            return result;
          },
        }),
      ])
  );

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    messages: [
      {
        role: "system",
        content:
          "Voce e um assistente do sistema BFX. Use as funcoes disponiveis para executar acoes. " +
          "Respeite o perfil do usuario. Se for vendedor, nao tente acoes administrativas. " +
          "Quando precisar criar/atualizar algo, descreva e inclua ACTIONS: [...] no final. " +
          "Responda sempre em portugues do Brasil.",
      },
      { role: "user", content: prompt },
    ],
    tools,
  });

  if (executed.length === 0 && isDespesasMes) {
    try {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const result = await executeAiAction(
        "listar_despesas",
        { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
        ctx
      );
      if (Array.isArray(result)) {
        return { text: summarizeDespesas(result), actions: [{ name: "listar_despesas", result }] };
      }
    } catch {
      // fallback below
    }
  }

  if (ctx.mode === "plan") {
    const planned = extractActions(text);
    return { text: stripActions(text), actions: planned };
  }
  if (text && text.trim()) {
      const summary = buildToolSummary(executed);
      if (summary && shouldAppendSummary(text)) {
        return { text: summary, actions: executed };
      }
      if (summary) {
        return { text: `${text}\n\n${summary}`, actions: executed };
      }
      return { text, actions: executed };
    }
  if (executed.length === 0) return { text: "Sem resposta.", actions: executed };

  const fallbackText = executed
    .map((a) => {
      if (a.name === "listar_clientes" && Array.isArray(a.result)) {
        const items = (a.result as any[]).slice(0, 3).map((c) => c.nome).filter(Boolean);
        return items.length
          ? `Clientes encontrados: ${items.join(", ")}.`
          : "Nenhum cliente encontrado.";
      }
      if (a.name === "listar_despesas" && Array.isArray(a.result)) {
        return summarizeDespesas(a.result as any[]);
      }
      return `Ação executada: ${a.name}.`;
    })
    .join("\n");

  return { text: fallbackText, actions: executed };
}

function extractActions(text: string) {
  const marker = "ACTIONS:";
  const idx = text.indexOf(marker);
  if (idx === -1) return [];
  const raw = text.slice(idx + marker.length).trim();
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as { name: string; params: Record<string, unknown> }[];
  } catch {
    // ignore
  }
  return [];
}

function stripActions(text: string) {
  const marker = "ACTIONS:";
  const idx = text.indexOf(marker);
  if (idx === -1) return text.trim();
  return text.slice(0, idx).trim();
}
