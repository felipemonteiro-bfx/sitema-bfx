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

export async function runAiWithActions(
  prompt: string,
  provider: "openai" | "gemini",
  ctx: ActionContext
) {
  const languageHint = "Responda sempre em portugues do Brasil.";

  if (provider === "gemini") {
    const cfg = await prisma.config.findFirst();
    if (!cfg?.geminiKey) return { text: "Chave Gemini nao configurada.", actions: [] };

    const google = createGoogleGenerativeAI({ apiKey: cfg.geminiKey });
    const executed: { name: string; result: unknown }[] = [];
    const tools = Object.fromEntries(
      aiActions.map((action) => [
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
      model: google("gemini-2.5-flash"),
      messages: [
        { role: "system", content: languageHint },
        { role: "user", content: prompt },
      ],
      tools,
    });

    return { text: text || "Sem resposta.", actions: executed };
  }

  const cfg = await prisma.config.findFirst();
  if (!cfg?.openaiKey) return { text: "Chave OpenAI nao configurada.", actions: [] };

  const openai = createOpenAI({ apiKey: cfg.openaiKey });
  const executed: { name: string; result: unknown }[] = [];
  const tools = Object.fromEntries(
    aiActions.map((action) => [
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
          "Responda sempre em portugues do Brasil.",
      },
      { role: "user", content: prompt },
    ],
    tools,
  });

  return { text: text || "Sem resposta.", actions: executed };
}
