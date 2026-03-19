import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readOnlyActions, runAiWithActions } from "@/lib/ai";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { IntelligenceChatClient } from "@/components/intelligence-chat-client";
import { headers } from "next/headers";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";

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
  const provider = "gemini" as const;
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
  const response = await runAiWithActions(prompt, provider, {
    role: session.role as "admin" | "vendedor",
    username: session.username,
    displayName: session.nomeExibicao || session.username,
    mode: "plan",
    history,
  });
  const plannedActions = Array.isArray(response.actions)
    ? (response.actions.filter((a) => "params" in (a as any)) as {
        name: string;
        params: Record<string, unknown>;
      }[])
    : undefined;
  const autoActions = plannedActions?.filter((a) => readOnlyActions.has(a.name)) ?? [];

  if (autoActions.length > 0 && autoActions.length === (plannedActions?.length ?? 0)) {
    const headerList = await headers();
    const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
    const proto = headerList.get("x-forwarded-proto") ?? "http";
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || (host ? `${proto}://${host}` : "http://localhost:3008");

    const results: string[] = [];
    const links: { label: string; url: string }[] = [];
    for (const action of autoActions) {
      const result = await runAiWithActions("", provider, {
        role: session.role as "admin" | "vendedor",
        username: session.username,
        displayName: session.nomeExibicao || session.username,
        mode: "execute",
        executeAction: action,
        baseUrl,
      });
      if (result.text) results.push(result.text);
      if (result.links?.length) links.push(...result.links);
    }

    await addAssistantMessage({
      sessaoId: usuario,
      usuario,
      content: results.join("\n") || response.text,
      promptOriginal: prompt,
      status: "done",
      links,
    });
    revalidatePath("/inteligencia");
    return;
  }

  await addAssistantMessage({
    sessaoId: usuario,
    usuario,
    content: response.text,
    promptOriginal: prompt,
    actions: plannedActions,
    status: plannedActions && plannedActions.length > 0 ? "pending" : "done",
  });
  revalidatePath("/inteligencia");
}

async function confirmAi(formData: FormData) {
  "use server";
  const raw = String(formData.get("actions") || "");
  if (!raw) return;
  const session = await getSession();
  if (!session) return;

  let actions: { name: string; params: Record<string, unknown> }[] = [];
  try {
    actions = JSON.parse(raw);
  } catch {
    return;
  }
  if (!Array.isArray(actions) || actions.length === 0) return;

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || (host ? `${proto}://${host}` : "http://localhost:3008");

  const results: string[] = [];
  const links: { label: string; url: string }[] = [];
  for (const action of actions) {
    try {
      const result = await runAiWithActions("", "gemini", {
        role: session.role as "admin" | "vendedor",
        username: session.username,
        displayName: session.nomeExibicao || session.username,
        mode: "execute",
        executeAction: action,
        baseUrl,
      });
      if (result.text) results.push(result.text);
      if (result.links?.length) links.push(...result.links);
    } catch (error) {
      results.push(
        `Falha ao executar ${action.name}: ${error instanceof Error ? error.message : String(error)}.`
      );
    }
  }

  await addAssistantMessage({
    sessaoId: session.username,
    usuario: session.username,
    content: results.join("\n"),
    promptOriginal: "Confirmação de ações",
    status: "done",
    links,
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

async function cancelAi(formData: FormData) {
  "use server";
  const at = String(formData.get("messageAt") || "");
  const session = await getSession();
  if (!session || !at) return;
  // Find and mark the pending message as done (cancelled) by matching criadoEm timestamp
  const targetDate = new Date(at);
  await prisma.aiMensagem.updateMany({
    where: {
      sessaoId: session.username,
      status: "pending",
      criadoEm: {
        gte: new Date(targetDate.getTime() - 1000),
        lte: new Date(targetDate.getTime() + 1000),
      },
    },
    data: { status: "done", actions: Prisma.DbNull },
  });
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
  // Get last 10 messages (both user and assistant) for AI context
  // We store only assistant messages with promptOriginal, so reconstruct pairs
  const rows = await prisma.aiMensagem.findMany({
    where: { sessaoId, role: "assistant" },
    orderBy: { criadoEm: "desc" }, // newest first, then reverse for chronological order
    take: 5, // last 5 pairs = 10 messages context
  });
  rows.reverse(); // put back in chronological order for the AI
  // Reconstruct as conversation pairs
  const history: { role: "user" | "assistant"; content: string }[] = [];
  for (const row of rows) {
    if (row.promptOriginal === "Confirmação de ações") continue;
    if (row.promptOriginal) {
      history.push({ role: "user", content: row.promptOriginal });
    }
    history.push({ role: "assistant", content: row.content });
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
            confirmAction={confirmAi}
            cancelAction={cancelAi}
            formId={formId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
