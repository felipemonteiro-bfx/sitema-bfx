import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { runAiWithActions } from "@/lib/ai";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { IntelligenceChatClient } from "@/components/intelligence-chat-client";
import { headers } from "next/headers";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/db";

async function getAiProvider(): Promise<"gemini" | "openai" | "litellm"> {
  try {
    const cfg = await prisma.config.findFirst();
    const p = (cfg as Record<string, unknown>)?.aiProvider as string | undefined;
    if (p === "litellm" || p === "openai") return p;
  } catch { /* ignore */ }
  return "gemini";
}

function buildContextSummary(content: string): string {
  // Remove markdown tables (they bloat context and are display-only)
  // Split on table blocks (3+ consecutive pipe-starting lines) and keep non-table parts
  const parts = content.split(/((?:^\|.+\|\s*$\n?){3,})/gm);
  const withoutTables = parts
    .filter((s) => !/^\|/.test(s.trimStart()))
    .join(" ");
  // Collapse whitespace and truncate
  const cleaned = withoutTables.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 300) return cleaned;
  return cleaned.slice(0, 297) + "...";
}

async function askAi(formData: FormData) {
  "use server";
  const attachment = formData.get("attachment");
  const file =
    attachment &&
    typeof attachment !== "string" &&
    attachment instanceof File &&
    attachment.size > 0 &&
    attachment.name
      ? (attachment as File)
      : null;
  let prompt = String(formData.get("prompt") || "");
  const provider = await getAiProvider();
  if (!prompt && file) {
    prompt = `Arquivo anexado: ${file.name}`;
  } else if (file && file.name) {
    prompt = `${prompt}\n\nArquivo anexado: ${file.name}`;
  }
  if (!prompt) return;
  const session = await getSession();
  if (!session) return;
  const usuario = session.username;
  const history = await getContextHistory(usuario);

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || (host ? `${proto}://${host}` : "http://localhost:3008");

  const response = await runAiWithActions(prompt, provider, {
    role: session.role as "admin" | "vendedor",
    username: session.username,
    displayName: session.nomeExibicao || session.username,
    history,
    baseUrl,
  });

  await addAssistantMessage({
    sessaoId: usuario,
    usuario,
    content: response.text,
    promptOriginal: prompt,
    status: "done",
    links: response.links,
  });
  revalidatePath("/inteligencia");
}

async function clearAi() {
  "use server";
  const session = await getSession();
  if (!session) return;
  await prisma.aiMensagem.deleteMany({ where: { sessaoId: session.username } });
  revalidatePath("/inteligencia");
}

async function addAssistantMessage(msg: {
  sessaoId: string;
  usuario: string;
  content: string;
  promptOriginal: string;
  actions?: { name: string; params: Record<string, unknown> }[];
  status?: "pending" | "done";
  links?: { label: string; url: string }[];
}) {
  await prisma.aiMensagem.create({
    data: {
      sessaoId: msg.sessaoId,
      usuario: msg.usuario,
      role: "assistant",
      content: msg.content,
      contextResumo: buildContextSummary(msg.content),
      promptOriginal: msg.promptOriginal,
      actions: msg.actions ? (msg.actions as any) : undefined,
      status: msg.status ?? "done",
      links: msg.links ? (msg.links as any) : undefined,
    },
  });
}

async function getDisplayHistory(sessaoId: string) {
  return prisma.aiMensagem.findMany({
    where: { sessaoId, role: "assistant" },
    orderBy: { criadoEm: "desc" },
    take: 20,
  });
}

async function getContextHistory(sessaoId: string) {
  // Get last 5 assistant messages (with their prompts) for AI context
  // Uses contextResumo (token-optimized) if available, falls back to full content
  const rows = await prisma.aiMensagem.findMany({
    where: { sessaoId, role: "assistant" },
    orderBy: { criadoEm: "desc" },
    take: 5,
    select: { promptOriginal: true, content: true, contextResumo: true },
  });
  rows.reverse(); // put back in chronological order for the AI
  // Reconstruct as conversation pairs
  const history: { role: "user" | "assistant"; content: string }[] = [];
  for (const row of rows) {
    if (row.promptOriginal === "Confirmacao de acoes") continue;
    if (row.promptOriginal) {
      history.push({ role: "user", content: row.promptOriginal });
    }
    // Use summarized context if available, fall back to full content
    history.push({ role: "assistant", content: row.contextResumo ?? row.content });
  }
  return history;
}

export default async function Page() {
  const formId = "intelligence-chat-form";
  const session = await getSession();
  const dbRows = session ? await getDisplayHistory(session.username) : [];
  const history = dbRows.map((m) => ({
    prompt: m.promptOriginal ?? "",
    response: m.content,
    provider: "gemini",
    at: m.criadoEm.toISOString(),
    actions: m.actions as any,
    status: m.status as "pending" | "done",
    links: m.links as any,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-6 sm:px-6 lg:px-8">
      <Card className="h-full">
        <CardHeader className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-semibold sm:text-3xl">
                BFX Intelligence (IA)
              </CardTitle>
              <div className="text-sm text-muted-foreground sm:text-base text-balance">
                Assistente virtual para estratégias, cobranças e dúvidas do time.
              </div>
            </div>
            <form action={clearAi}>
              <button
                type="submit"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full text-xs cursor-pointer")}
              >
                Limpar conversa
              </button>
            </form>
          </div>
        </CardHeader>
        <CardContent className="flex h-[60vh] min-h-[420px] flex-col gap-4 sm:h-[68vh] lg:h-[72vh]">
          <IntelligenceChatClient
            history={history}
            action={askAi}
            formId={formId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
