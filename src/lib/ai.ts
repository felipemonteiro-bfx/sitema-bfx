import { prisma } from "@/lib/db";
import { aiActions, type ActionContext } from "@/lib/ai-actions";
import { callMcpTool } from "@/lib/mcp";
import { generateText, tool, stepCountIs } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

const toolSchema = z.object({}).passthrough();

function stripThinkTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

const SYSTEM_PROMPT = `Você é o assistente BFX, especialista em gestão de vendas, estoque e finanças.

CAPACIDADES COMPLETAS:
- Consultas (executam automaticamente): listar vendas, clientes, produtos, despesas, empresas, usuários; consultar parcelas, inadimplentes, limite de crédito, boletos, comissões, auditoria; resumo financeiro, fluxo de caixa, relatório de vendas, margens de produto
- Ações de escrita (executadas diretamente): criar venda, criar cliente, cadastrar produto, registrar entrada de estoque, criar despesa, atualizar venda/produto/usuário/despesa, criar empresa/usuário/fornecedor, gerar catálogo

REGRAS:
- Responda SEMPRE em português do Brasil
- Use formatação Markdown nas respostas: **negrito** para destaques, listas com - para enumerar itens, ## para títulos de seção quando necessário
- Para consultas: execute a ação e apresente os resultados de forma clara e amigável, usando listas e tabelas quando adequado
- Para ações de escrita: siga o FLUXO DE CADASTRO abaixo
- Se o usuário pedir "cadastrar entrada de produto", use registrar_entrada_estoque
- Respeite o perfil do usuário: vendedor não tem acesso a ações administrativas

FLUXO DE CADASTRO (acoes de escrita):
- ANTES de executar qualquer cadastro, resolva TODAS as referencias usando ferramentas de consulta:
  * Se o usuario menciona um fornecedor por nome, use listar_fornecedores para buscar e encontrar o ID correto
  * Se menciona um cliente por nome, use listar_clientes para encontrar o ID
  * Se menciona um produto, use listar_produtos para verificar se ja existe
- Ao cadastrar produto: use listar_produtos para ver categorias e marcas existentes e escolha a mais adequada. Inclua TODOS os campos (categoria, marca, custoPadrao, valorVenda, fornecedorId, qtdEstoque).
- Execute a acao de escrita diretamente apos resolver as referencias
- Apresente um resumo do que foi criado apos a execucao
- Se alguma referencia nao for encontrada (ex: fornecedor "XYZ" nao existe), informe o usuario e pergunte se deseja criar primeiro`;

export async function runAi(prompt: string, provider: "openai" | "gemini" | "litellm") {
  const cfg = await prisma.config.findFirst();
  if (provider === "litellm") {
    if (!cfg?.litellmUrl || !cfg?.litellmKey) return "LiteLLM nao configurado.";
    const baseURL = cfg.litellmUrl.startsWith("http") ? cfg.litellmUrl : `https://${cfg.litellmUrl}`;
    const litellm = createOpenAI({ baseURL, apiKey: cfg.litellmKey });
    const litellmProviderOptions = cfg.litellmEnableThinking
      ? { openai: { body: { chat_template_kwargs: { enable_thinking: true } } } }
      : undefined;
    const { text } = await generateText({
      model: litellm.chat(cfg.litellmModel || "gpt-4o"),
      prompt,
      ...(litellmProviderOptions && { providerOptions: litellmProviderOptions }),
    });
    return stripThinkTags(text) || "Sem resposta.";
  }
  if (provider === "openai") {
    if (!cfg?.openaiKey) return "Chave OpenAI nao configurada.";
    const openai = createOpenAI({ apiKey: cfg.openaiKey });
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
    });
    return stripThinkTags(text) || "Sem resposta.";
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

type AiResult = { text: string; actions: unknown[]; links?: { label: string; url: string }[] };

export async function runAiWithActions(
  prompt: string,
  provider: "openai" | "gemini" | "litellm",
  ctx: ActionContext & {
    baseUrl?: string;
    history?: { role: "user" | "assistant"; content: string }[];
  }
): Promise<AiResult> {
  const currency = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const summarizeDespesas = (rows: any[]) => {
    const total = rows.reduce((sum, item) => sum + Number(item?.valor ?? 0), 0);
    return `Despesas encontradas: ${rows.length}. Total: ${currency.format(total)}.`;
  };

  const buildMarkdownTable = (headers: string[], rows: string[][]): string => {
    const sep = headers.map(() => "---").join(" | ");
    const header = headers.join(" | ");
    const body = rows.map((r) => r.join(" | ")).join("\n");
    return `| ${header} |\n| ${sep} |\n${rows.map((r) => `| ${r.join(" | ")} |`).join("\n")}`;
  };

  const buildToolSummary = (executed: { name: string; result: unknown }[]) => {
    if (!executed.length) return "";
    const parts: string[] = [];
    for (const item of executed) {
      if (item.name === "listar_clientes" && Array.isArray(item.result)) {
        const rows = item.result as any[];
        if (!rows.length) {
          parts.push("Nenhum cliente encontrado.");
        } else {
          const tableRows = rows.slice(0, 15).map((c) => [
            c.nome ?? "-",
            c.telefone ?? "-",
            c.email ?? "-",
          ]);
          parts.push(
            `**${rows.length} cliente(s) encontrado(s):**\n\n${buildMarkdownTable(["Nome", "Telefone", "E-mail"], tableRows)}`
          );
        }
      } else if (item.name === "listar_produtos" && Array.isArray(item.result)) {
        const rows = item.result as any[];
        if (!rows.length) {
          parts.push("Nenhum produto encontrado.");
        } else {
          const totalEstoque = rows.reduce((s: number, p: any) => s + (p.qtdEstoque ?? 0), 0);
          const tableRows = rows.slice(0, 15).map((p) => [
            p.nome ?? "-",
            String(p.qtdEstoque ?? 0),
            p.preco != null ? currency.format(Number(p.preco)) : "-",
          ]);
          parts.push(
            `**${rows.length} produto(s) — estoque total: ${totalEstoque}:**\n\n${buildMarkdownTable(["Produto", "Estoque", "Preço"], tableRows)}`
          );
        }
      } else if (item.name === "listar_vendas" && Array.isArray(item.result)) {
        const rows = item.result as any[];
        if (!rows.length) {
          parts.push("Nenhuma venda encontrada.");
        } else {
          const total = rows.reduce((s, v) => s + Number(v?.valorTotal ?? 0), 0);
          const tableRows = rows.slice(0, 15).map((v) => [
            v.cliente?.nome ?? v.clienteNome ?? "-",
            v.createdAt ? new Date(v.createdAt).toLocaleDateString("pt-BR") : "-",
            v.valorTotal != null ? currency.format(Number(v.valorTotal)) : "-",
            v.status ?? "-",
          ]);
          parts.push(
            `**${rows.length} venda(s) — total: ${currency.format(total)}:**\n\n${buildMarkdownTable(["Cliente", "Data", "Valor", "Status"], tableRows)}`
          );
        }
      } else if (item.name === "listar_despesas" && Array.isArray(item.result)) {
        const rows = item.result as any[];
        if (!rows.length) {
          parts.push("Nenhuma despesa encontrada.");
        } else {
          const total = rows.reduce((s, d) => s + Number(d?.valor ?? 0), 0);
          const tableRows = rows.slice(0, 15).map((d) => [
            d.descricao ?? "-",
            d.data ? new Date(d.data).toLocaleDateString("pt-BR") : "-",
            d.valor != null ? currency.format(Number(d.valor)) : "-",
          ]);
          parts.push(
            `**${rows.length} despesa(s) — total: ${currency.format(total)}:**\n\n${buildMarkdownTable(["Descrição", "Data", "Valor"], tableRows)}`
          );
        }
      } else if (item.name === "listar_empresas" && Array.isArray(item.result)) {
        const rows = item.result as any[];
        if (!rows.length) {
          parts.push("Nenhuma empresa encontrada.");
        } else {
          const tableRows = rows.slice(0, 10).map((e) => [
            e.nome ?? "-",
            e.cnpj ?? "-",
          ]);
          parts.push(
            `**${rows.length} empresa(s) encontrada(s):**\n\n${buildMarkdownTable(["Nome", "CNPJ"], tableRows)}`
          );
        }
      } else if (item.name === "listar_usuarios" && Array.isArray(item.result)) {
        const rows = item.result as any[];
        if (!rows.length) {
          parts.push("Nenhum usuário encontrado.");
        } else {
          const tableRows = rows.slice(0, 10).map((u) => [
            u.nomeExibicao ?? u.username ?? "-",
            u.email ?? "-",
            u.role ?? "-",
          ]);
          parts.push(
            `**${rows.length} usuário(s):**\n\n${buildMarkdownTable(["Nome", "E-mail", "Perfil"], tableRows)}`
          );
        }
      } else if (item.name === "gerar_catalogo_produtos") {
        const total = (item.result as any)?.total ?? 0;
        parts.push(`Catálogo gerado com ${total} produto(s).`);
      } else if (item.result && typeof item.result === "object" && "error" in (item.result as object)) {
        parts.push(`⚠️ ${(item.result as any).error}`);
      } else if (item.name === "criar_produto") {
        const r = item.result as any;
        parts.push(`✅ **Produto cadastrado com sucesso!**\n- **Nome:** ${r?.nome ?? "-"}\n- **Valor de venda:** ${r?.valorVenda != null ? currency.format(Number(r.valorVenda)) : "-"}\n- **Estoque:** ${r?.qtdEstoque ?? 0} unidades`);
      } else if (item.name === "criar_cliente") {
        const r = item.result as any;
        parts.push(`✅ **Cliente cadastrado com sucesso!**\n- **Nome:** ${r?.nome ?? "-"}\n- **Telefone:** ${r?.telefone ?? "-"}\n- **E-mail:** ${r?.email ?? "-"}`);
      } else if (item.name === "criar_venda") {
        const r = item.result as any;
        parts.push(`✅ **Venda registrada com sucesso!** (ID: ${r?.id ?? "-"})`);
      } else if (item.name === "criar_despesa") {
        const r = item.result as any;
        const valor = r?.valor != null ? currency.format(Number(r.valor)) : "-";
        parts.push(`✅ **Despesa registrada!**\n- **Descrição:** ${r?.descricao ?? "-"}\n- **Valor:** ${valor}`);
      } else if (item.name === "criar_empresa") {
        const r = item.result as any;
        parts.push(`✅ **Empresa cadastrada!**\n- **Nome:** ${r?.nome ?? "-"}`);
      } else if (item.name === "criar_usuario") {
        const r = item.result as any;
        parts.push(`✅ **Usuário criado!**\n- **Nome:** ${r?.nomeExibicao ?? r?.username ?? "-"}`);
      } else if (item.name === "criar_fornecedor") {
        const r = item.result as any;
        parts.push(`✅ **Fornecedor cadastrado!**\n- **Nome:** ${r?.nome ?? "-"}`);
      } else if (item.name === "atualizar_produto") {
        const r = item.result as any;
        parts.push(`✅ **Produto atualizado!**\n- **Nome:** ${r?.produto ?? r?.nome ?? "-"}`);
      } else if (item.name === "atualizar_venda") {
        const r = item.result as any;
        parts.push(`✅ **Venda atualizada!** (ID: ${r?.id ?? "-"})`);
      } else if (item.name === "atualizar_usuario") {
        const r = item.result as any;
        parts.push(`✅ **Usuário atualizado!**\n- **Nome:** ${r?.nomeExibicao ?? r?.username ?? "-"}`);
      } else if (item.name === "atualizar_despesa") {
        const r = item.result as any;
        parts.push(`✅ **Despesa atualizada!**\n- **Descrição:** ${r?.descricao ?? "-"}`);
      } else if (item.name === "registrar_entrada_estoque") {
        const r = item.result as any;
        parts.push(`✅ **Estoque atualizado!**\n- **Produto:** ${r?.produto ?? "-"}\n- **Estoque anterior:** ${r?.qtdEstoqueAnterior ?? 0}\n- **Estoque novo:** ${r?.qtdEstoqueNova ?? 0}`);
      } else {
        parts.push(`✅ Ação **${item.name.replace(/_/g, " ")}** executada com sucesso.`);
      }
    }
    return parts.join("\n\n");
  };

  const buildLinks = (executed: { name: string; result: unknown }[]): { label: string; url: string }[] => {
    const links: { label: string; url: string }[] = [];
    for (const item of executed) {
      if (item.name === "criar_venda" && item.result && typeof item.result === "object") {
        const venda = item.result as { uuid?: string; id?: number };
        const token = venda.uuid ?? String(venda.id ?? "");
        if (token && ctx.baseUrl) {
          links.push({ label: "Recibo PDF", url: `${ctx.baseUrl}/api/recibo?id=${token}` });
        }
      }
      if (item.name === "gerar_catalogo_produtos" && ctx.baseUrl) {
        links.push({ label: "Catalogo de Produtos (PDF)", url: `${ctx.baseUrl}/api/catalogo` });
      }
    }
    return links;
  };

  const shouldAppendSummary = (text: string) =>
    !text.trim() || /buscando|aguarde|processando|consultando/i.test(text);
  const normalizedPrompt = prompt.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const isDespesasMes = /despesa|gasto|gastando/.test(normalizedPrompt) && /mes/.test(normalizedPrompt);

  if (provider === "litellm") {
    const cfg = await prisma.config.findFirst();
    if (!cfg?.litellmUrl || !cfg?.litellmKey) return { text: "LiteLLM nao configurado.", actions: [] };
    const baseURL = cfg.litellmUrl.startsWith("http") ? cfg.litellmUrl : `https://${cfg.litellmUrl}`;
    const litellm = createOpenAI({ baseURL, apiKey: cfg.litellmKey });
    // .chat() forces the /chat/completions endpoint instead of /responses (Responses API)
    const litellmModel = litellm.chat(cfg.litellmModel || "gpt-4o");
    const litellmProviderOptions = cfg.litellmEnableThinking
      ? { openai: { body: { chat_template_kwargs: { enable_thinking: true } } } }
      : undefined;
    const executed: { name: string; result: unknown }[] = [];
    const tools = Object.fromEntries(
      aiActions
        .filter((action) => action.roles?.includes(ctx.role) ?? true)
        .map((action) => [
          action.name,
          tool({
            description: action.description,
            inputSchema: toolSchema,
            execute: async (args) => {
              const result = await callMcpTool(action.name, args ?? {}, ctx);
              executed.push({ name: action.name, result });
              return result;
            },
          }),
        ])
    );
    let text = "";
    try {
    const result = await generateText({
      model: litellmModel,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...(ctx.history ?? []),
        { role: "user", content: prompt },
      ],
      tools,
      stopWhen: stepCountIs(5),
      ...(litellmProviderOptions && { providerOptions: litellmProviderOptions }),
    });
    text = stripThinkTags(result.text ?? "");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { text: `Erro ao chamar LiteLLM: ${msg.slice(0, 200)}`, actions: [] };
    }
    if (text && text.trim()) {
      const summary = buildToolSummary(executed);
      const links = buildLinks(executed);
      if (summary && shouldAppendSummary(text)) return { text: summary, actions: executed, links };
      if (summary) return { text: `${text}\n\n${summary}`, actions: executed, links };
      return { text, actions: executed, links };
    }
    if (executed.length === 0) return { text: "Sem resposta.", actions: executed };
    const fallbackText = buildToolSummary(executed) || "Acao executada.";
    return { text: fallbackText, actions: executed, links: buildLinks(executed) };
  }

  if (provider === "gemini") {
    const cfg = await prisma.config.findFirst();
    if (!cfg?.geminiKey) return { text: "Chave Gemini nao configurada.", actions: [] };

    const google = createGoogleGenerativeAI({ apiKey: cfg.geminiKey });
    const executed: { name: string; result: unknown }[] = [];
    const tools = Object.fromEntries(
      aiActions
        .filter((action) => action.roles?.includes(ctx.role) ?? true)
        .map((action) => [
          action.name,
          tool({
            description: action.description,
            inputSchema: toolSchema,
            execute: async (args) => {
              const result = await callMcpTool(action.name, args ?? {}, ctx);
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
          { role: "system", content: SYSTEM_PROMPT },
          ...(ctx.history ?? []),
          { role: "user", content: prompt },
        ],
        tools,
        stopWhen: stepCountIs(5),
      });
      text = stripThinkTags(result.text ?? "");
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
          text = stripThinkTags(result.text ?? "");
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

    if (text && text.trim()) {
      const summary = buildToolSummary(executed);
      const links = buildLinks(executed);
      if (summary && shouldAppendSummary(text)) {
        return { text: summary, actions: executed, links };
      }
      if (summary) {
        return { text: `${text}\n\n${summary}`, actions: executed, links };
      }
      return { text, actions: executed, links };
    }
    if (executed.length === 0) return { text: "Sem resposta.", actions: executed };

    return { text: buildToolSummary(executed) || "Ação executada.", actions: executed, links: buildLinks(executed) };
  }

  const cfg = await prisma.config.findFirst();
  if (!cfg?.openaiKey) return { text: "Chave OpenAI nao configurada.", actions: [] };

  const openai = createOpenAI({ apiKey: cfg.openaiKey });
  const executed: { name: string; result: unknown }[] = [];
  const tools = Object.fromEntries(
    aiActions
      .filter((action) => action.roles?.includes(ctx.role) ?? true)
      .map((action) => [
        action.name,
        tool({
          description: action.description,
          inputSchema: toolSchema,
          execute: async (args) => {
            const result = await callMcpTool(action.name, args ?? {}, ctx);
            executed.push({ name: action.name, result });
            return result;
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

  if (executed.length === 0 && isDespesasMes) {
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

  if (text && text.trim()) {
    const summary = buildToolSummary(executed);
    const links = buildLinks(executed);
    if (summary && shouldAppendSummary(text)) {
      return { text: summary, actions: executed, links };
    }
    if (summary) {
      return { text: `${text}\n\n${summary}`, actions: executed, links };
    }
    return { text, actions: executed, links };
  }
  if (executed.length === 0) return { text: "Sem resposta.", actions: executed };

  return { text: buildToolSummary(executed) || "Ação executada.", actions: executed, links: buildLinks(executed) };
}
