import { prisma } from "@/lib/db";
import { aiActions, type ActionContext } from "@/lib/ai-actions";
import { callMcpTool } from "@/lib/mcp";
import { generateText, tool, stepCountIs } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

const toolSchema = z.object({}).passthrough();

const SYSTEM_PROMPT = `Você é o assistente BFX, especialista em gestão de vendas, estoque e finanças.

CAPACIDADES COMPLETAS:
- Consultas (executam automaticamente): listar vendas, clientes, produtos, despesas, empresas, usuários; consultar parcelas, inadimplentes, limite de crédito, boletos, comissões, auditoria; resumo financeiro, fluxo de caixa, relatório de vendas, margens de produto
- Ações de escrita (requerem confirmação do usuário): criar venda, criar cliente, cadastrar produto, registrar entrada de estoque, criar despesa, atualizar venda/produto/usuário/despesa, criar empresa/usuário/fornecedor, gerar catálogo

REGRAS:
- Responda SEMPRE em português do Brasil
- Para consultas: execute a ação e apresente os resultados de forma clara e amigável
- Para ações de escrita: descreva o que vai fazer, use a ferramenta (ela pedirá confirmação ao usuário)
- Se o usuário pedir "cadastrar entrada de produto", use registrar_entrada_estoque
- Respeite o perfil do usuário: vendedor não tem acesso a ações administrativas`;

export async function runAi(prompt: string, provider: "openai" | "gemini" | "litellm") {
  const cfg = await prisma.config.findFirst();
  if (provider === "litellm") {
    if (!cfg?.litellmUrl || !cfg?.litellmKey) return "LiteLLM nao configurado.";
    const baseURL = cfg.litellmUrl.startsWith("http") ? cfg.litellmUrl : `https://${cfg.litellmUrl}`;
    const litellm = createOpenAI({ baseURL, apiKey: cfg.litellmKey });
    const { text } = await generateText({
      model: litellm(cfg.litellmModel || "gpt-4o-mini"),
      prompt,
    });
    return text || "Sem resposta.";
  }
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

export const readOnlyActions = new Set(
  aiActions.filter((a) => a.readOnly === true).map((a) => a.name)
);

function inferReadOnlyActions(prompt: string) {
  const p = prompt.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const rules: { name: string; re: RegExp }[] = [
    { name: "listar_clientes", re: /(listar|liste|lista|mostre|exiba|quantos|qtd).*(clientes?)/i },
    { name: "listar_produtos", re: /(listar|liste|lista|mostre|exiba|quantos|qtd).*(produtos?)/i },
    { name: "listar_vendas", re: /(listar|liste|lista|mostre|exiba|quantas|qtd).*(vendas?)/i },
    { name: "listar_despesas", re: /(listar|liste|lista|mostre|exiba|quantas|qtd).*(despesa|gasto|custos?)/i },
    { name: "listar_empresas", re: /(listar|liste|lista|mostre|exiba|quantas|qtd).*(empresa|parceira)s?/i },
    { name: "listar_usuarios", re: /(listar|liste|lista|mostre|exiba|quantos|qtd).*(usuarios?|vendedores?)/i },
    { name: "gerar_catalogo_produtos", re: /(catalogo|gerar catalogo)/i },
  ];
  const hasQuantos = /quantos|quantas|qtd/.test(p);
  const limitMatch = p.match(/\b(\d{1,3})\b/);
  const limit = !hasQuantos && limitMatch ? Number(limitMatch[1]) : undefined;
  const dateMatches = [...p.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)].map((m) => m[1]);
  const dateParams =
    dateMatches.length >= 2 ? { from: dateMatches[0], to: dateMatches[1] } : {};
  const baseParams = {
    ...(limit ? { limit } : {}),
    ...dateParams,
  };
  const actions = rules
    .filter((r) => r.re.test(p))
    .map((r) => {
      if (r.name === "gerar_catalogo_produtos") return { name: r.name, params: {} };
      if (r.name === "listar_vendas" || r.name === "listar_despesas") {
        return { name: r.name, params: baseParams };
      }
      const rest = { ...baseParams };
      delete rest.from;
      delete rest.to;
      return { name: r.name, params: rest };
    });
  return actions.filter((a) => readOnlyActions.has(a.name));
}

export async function runAiWithActions(
  prompt: string,
  provider: "openai" | "gemini" | "litellm",
  ctx: ActionContext & {
    mode?: "plan" | "execute";
    executeAction?: { name: string; params: Record<string, unknown> };
    baseUrl?: string;
    history?: { role: "user" | "assistant"; content: string }[];
  }
) {
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
        const rows = item.result as any[];
        const nomes = rows.slice(0, 5).map((c) => c.nome).filter(Boolean);
        parts.push(
          rows.length
            ? `Clientes encontrados: ${rows.length}. ${nomes.length ? `Exemplos: ${nomes.join(", ")}.` : ""}`.trim()
            : "Nenhum cliente encontrado."
        );
      } else if (item.name === "listar_produtos" && Array.isArray(item.result)) {
        const rows = item.result as any[];
        if (!rows.length) {
          parts.push("Nenhum produto encontrado.");
        } else {
          const linhas = rows.slice(0, 10).map((p) => {
            const estoque = p.qtdEstoque != null ? ` — estoque: ${p.qtdEstoque}` : "";
            return `${p.nome}${estoque}`;
          });
          const totalEstoque = rows.reduce((s: number, p: any) => s + (p.qtdEstoque ?? 0), 0);
          parts.push(
            `Produtos encontrados: ${rows.length}. Total em estoque: ${totalEstoque}.\n${linhas.join("\n")}`
          );
        }
      } else if (item.name === "listar_vendas" && Array.isArray(item.result)) {
        parts.push(`Vendas encontradas: ${(item.result as any[]).length}.`);
      } else if (item.name === "listar_despesas" && Array.isArray(item.result)) {
        parts.push(summarizeDespesas(item.result as any[]));
      } else if (item.name === "listar_empresas" && Array.isArray(item.result)) {
        const rows = item.result as any[];
        const nomes = rows.slice(0, 5).map((e) => e.nome).filter(Boolean);
        parts.push(
          rows.length
            ? `Empresas encontradas: ${rows.length}. ${nomes.length ? `Exemplos: ${nomes.join(", ")}.` : ""}`.trim()
            : "Nenhuma empresa encontrada."
        );
      } else if (item.name === "listar_usuarios" && Array.isArray(item.result)) {
        const nomes = (item.result as any[])
          .slice(0, 5)
          .map((u) => u.nomeExibicao || u.username)
          .filter(Boolean);
        parts.push(
          nomes.length
            ? `Usuarios encontrados: ${nomes.join(", ")}.`
            : "Nenhum usuario encontrado."
        );
      } else if (item.name === "gerar_catalogo_produtos") {
        const total = (item.result as any)?.total ?? 0;
        parts.push(`Catalogo gerado com ${total} produtos.`);
      } else {
        parts.push(`Acao executada: ${item.name}.`);
      }
    }
    return parts.join("\n");
  };

  const shouldAppendSummary = (text: string) =>
    !text.trim() || /buscando|aguarde|processando|consultando/i.test(text);
  const normalizedPrompt = prompt.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const isDespesasMes = /despesa|gasto|gastando/.test(normalizedPrompt) && /mes/.test(normalizedPrompt);

  if (ctx.mode === "execute" && ctx.executeAction) {
    const execResult = await callMcpTool(ctx.executeAction.name, ctx.executeAction.params, ctx);
    const links: { label: string; url: string }[] = [];
    if (ctx.executeAction.name === "criar_venda" && execResult && typeof execResult === "object") {
      const venda = execResult as { uuid?: string; id?: number };
      const token = venda.uuid ?? String(venda.id ?? "");
      if (token) {
        const baseUrl = ctx.baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3008";
        links.push({ label: "Recibo PDF", url: `${baseUrl}/api/recibo?id=${token}` });
      }
    }
    if (ctx.executeAction.name === "gerar_catalogo_produtos") {
      const baseUrl = ctx.baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3008";
      const search = (ctx.executeAction.params?.search as string | undefined) || "";
      const url = search
        ? `${baseUrl}/api/catalogo?q=${encodeURIComponent(search)}`
        : `${baseUrl}/api/catalogo`;
      links.push({ label: "Catalogo de Produtos (PDF)", url });
    }
    const summary = buildToolSummary([{ name: ctx.executeAction.name, result: execResult }]);
    return { text: summary || "Acao executada com sucesso.", actions: [ctx.executeAction], links };
  }

  if (provider === "litellm") {
    const cfg = await prisma.config.findFirst();
    if (!cfg?.litellmUrl || !cfg?.litellmKey) return { text: "LiteLLM nao configurado.", actions: [] };
    const baseURL = cfg.litellmUrl.startsWith("http") ? cfg.litellmUrl : `https://${cfg.litellmUrl}`;
    const litellm = createOpenAI({ baseURL, apiKey: cfg.litellmKey });
    const executed: { name: string; result: unknown }[] = [];
    const planned: { name: string; params: Record<string, unknown> }[] = [];
    const tools = Object.fromEntries(
      aiActions
        .filter((action) => action.roles?.includes(ctx.role) ?? true)
        .map((action) => [
          action.name,
          tool({
            description: action.description,
            inputSchema: toolSchema,
            execute: async (args) => {
              if (action.readOnly || ctx.mode === "execute") {
                const result = await callMcpTool(action.name, args ?? {}, ctx);
                executed.push({ name: action.name, result });
                return result;
              }
              planned.push({ name: action.name, params: (args ?? {}) as Record<string, unknown> });
              return `Ação "${action.name}" proposta. Aguardando confirmação do usuário para executar.`;
            },
          }),
        ])
    );
    const { text } = await generateText({
      model: litellm(cfg.litellmModel || "gpt-4o-mini"),
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...(ctx.history ?? []),
        { role: "user", content: prompt },
      ],
      tools,
      stopWhen: stepCountIs(5),
    });
    if (ctx.mode === "plan") {
      if (planned.length > 0) return { text: stripActions(text) || text, actions: planned };
      const inferred = inferReadOnlyActions(prompt);
      if (inferred.length) return { text: stripActions(text), actions: inferred };
      return { text: stripActions(text), actions: extractActions(text) };
    }
    if (text && text.trim()) {
      const summary = buildToolSummary(executed);
      if (summary && shouldAppendSummary(text)) return { text: summary, actions: executed };
      if (summary) return { text: `${text}\n\n${summary}`, actions: executed };
      return { text, actions: executed };
    }
    if (executed.length === 0) return { text: "Sem resposta.", actions: executed };
    const fallbackText = buildToolSummary(executed) || "Acao executada.";
    return { text: fallbackText, actions: executed };
  }

  if (provider === "gemini") {
    const cfg = await prisma.config.findFirst();
    if (!cfg?.geminiKey) return { text: "Chave Gemini nao configurada.", actions: [] };

    const google = createGoogleGenerativeAI({ apiKey: cfg.geminiKey });
    const executed: { name: string; result: unknown }[] = [];
    const planned: { name: string; params: Record<string, unknown> }[] = [];
    const tools = Object.fromEntries(
      aiActions
        .filter((action) => action.roles?.includes(ctx.role) ?? true)
        .map((action) => [
          action.name,
          tool({
            description: action.description,
            inputSchema: toolSchema,
            execute: async (args) => {
              if (action.readOnly || ctx.mode === "execute") {
                const result = await callMcpTool(action.name, args ?? {}, ctx);
                executed.push({ name: action.name, result });
                return result;
              }
              // mode === "plan" and write action: propose, don't execute
              planned.push({ name: action.name, params: (args ?? {}) as Record<string, unknown> });
              return `Ação "${action.name}" proposta. Aguardando confirmação do usuário para executar.`;
            },
          }),
        ])
    );

    let text = "";
    try {
      const result = await generateText({
        model: google("gemini-2.5-flash"),
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...(ctx.history ?? []),
          { role: "user", content: prompt },
        ],
        tools,
        stopWhen: stepCountIs(5),
      });
      text = result.text ?? "";
    } catch {
      if (cfg?.openaiKey) {
        const openai = createOpenAI({ apiKey: cfg.openaiKey });
        try {
          const result = await generateText({
            model: openai("gpt-4o-mini"),
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              ...(ctx.history ?? []),
              { role: "user", content: prompt },
            ],
            tools,
            stopWhen: stepCountIs(5),
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

    if (executed.length === 0 && isDespesasMes && ctx.mode !== "plan") {
      try {
        const now = new Date();
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const result = await callMcpTool(
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
      if (planned.length > 0) {
        return { text: stripActions(text) || text, actions: planned };
      }
      // Fallback: try to infer from prompt or extract from text
      const inferred = inferReadOnlyActions(prompt);
      if (inferred.length) {
        return { text: stripActions(text), actions: inferred };
      }
      const parsedActions = extractActions(text);
      return { text: stripActions(text), actions: parsedActions };
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
        if (a.name === "listar_produtos" && Array.isArray(a.result)) {
          const rows = a.result as any[];
          if (!rows.length) return "Nenhum produto encontrado.";
          const linhas = rows.slice(0, 10).map((p: any) => {
            const estoque = p.qtdEstoque != null ? ` — estoque: ${p.qtdEstoque}` : "";
            return `${p.nome}${estoque}`;
          });
          const totalEstoque = rows.reduce((s: number, p: any) => s + (p.qtdEstoque ?? 0), 0);
          return `Produtos encontrados: ${rows.length}. Total em estoque: ${totalEstoque}.\n${linhas.join("\n")}`;
        }
        if (a.name === "listar_despesas" && Array.isArray(a.result)) {
          return summarizeDespesas(a.result as any[]);
        }
        return `Acao executada: ${a.name}.`;
      })
      .join("\n");

    return { text: fallbackText, actions: executed };
  }

  const cfg = await prisma.config.findFirst();
  if (!cfg?.openaiKey) return { text: "Chave OpenAI nao configurada.", actions: [] };

  const openai = createOpenAI({ apiKey: cfg.openaiKey });
  const executed: { name: string; result: unknown }[] = [];
  const planned: { name: string; params: Record<string, unknown> }[] = [];
  const tools = Object.fromEntries(
    aiActions
      .filter((action) => action.roles?.includes(ctx.role) ?? true)
      .map((action) => [
        action.name,
        tool({
          description: action.description,
          inputSchema: toolSchema,
          execute: async (args) => {
            if (action.readOnly || ctx.mode === "execute") {
              const result = await callMcpTool(action.name, args ?? {}, ctx);
              executed.push({ name: action.name, result });
              return result;
            }
            // mode === "plan" and write action: propose, don't execute
            planned.push({ name: action.name, params: (args ?? {}) as Record<string, unknown> });
            return `Ação "${action.name}" proposta. Aguardando confirmação do usuário para executar.`;
          },
        }),
      ])
  );

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...(ctx.history ?? []),
      { role: "user", content: prompt },
    ],
    tools,
  });

  if (executed.length === 0 && isDespesasMes && ctx.mode !== "plan") {
    try {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const result = await callMcpTool(
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
    if (planned.length > 0) {
      return { text: stripActions(text) || text, actions: planned };
    }
    // Fallback: try to infer from prompt or extract from text
    const inferred = inferReadOnlyActions(prompt);
    if (inferred.length) {
      return { text: stripActions(text), actions: inferred };
    }
    const parsedActions = extractActions(text);
    return { text: stripActions(text), actions: parsedActions };
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
      return `Acao executada: ${a.name}.`;
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
