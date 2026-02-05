import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readOnlyActions, runAiWithActions } from "@/lib/ai";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { IntelligenceChatClient } from "@/components/intelligence-chat-client";
import { FormSelect } from "@/components/form-select";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const provider = String(formData.get("provider") || "openai") as "openai" | "gemini";
  if (!prompt && file) {
    prompt = `Arquivo anexado: ${file.name}`;
  } else if (file && file.name) {
    prompt = `${prompt}\n\nArquivo anexado: ${file.name}`;
  }
  if (!prompt) return;
  const session = await getSession();
  if (!session) return;
  const response = await runAiWithActions(prompt, provider, {
    role: session.role as "admin" | "vendedor",
    username: session.username,
    displayName: session.nomeExibicao || session.username,
    mode: "plan",
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
      process.env.NEXT_PUBLIC_APP_URL || (host ? `${proto}://${host}` : "http://localhost:3000");

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

    prismaMessageStore.add({
      prompt,
      response: results.join("\n") || response.text,
      provider,
      status: "done",
      links,
    });
    revalidatePath("/inteligencia");
    return;
  }

  prismaMessageStore.add({
    prompt,
    response: response.text,
    provider,
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
    process.env.NEXT_PUBLIC_APP_URL || (host ? `${proto}://${host}` : "http://localhost:3000");

  const results: string[] = [];
  const links: { label: string; url: string }[] = [];
  for (const action of actions) {
    try {
      const result = await runAiWithActions("", "openai", {
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

  prismaMessageStore.add({
    prompt: "Confirmação de ações",
    response: results.join("\n"),
    provider: "openai",
    status: "done",
    links,
  });
  revalidatePath("/inteligencia");
}

async function clearAi() {
  "use server";
  prismaMessageStore.data = [];
  revalidatePath("/inteligencia");
}

const prismaMessageStore = {
  data: [] as {
    prompt: string;
    response: string;
    provider: string;
    at: string;
    actions?: { name: string; params: Record<string, unknown> }[];
    status?: "pending" | "done";
    links?: { label: string; url: string }[];
  }[],
  add(msg: {
    prompt: string;
    response: string;
    provider: string;
    actions?: { name: string; params: Record<string, unknown> }[];
    status?: "pending" | "done";
    links?: { label: string; url: string }[];
  }) {
    this.data.unshift({ ...msg, at: new Date().toISOString() });
  },
};

export default async function Page() {
  const formId = "intelligence-chat-form";
  const cfg = await prisma.config.findFirst();
  const providers = [
    ...(cfg?.openaiKey ? [{ value: "openai" as const, label: "OpenAI" }] : []),
    ...(cfg?.geminiKey ? [{ value: "gemini" as const, label: "Gemini" }] : []),
  ];
  const resolvedProviders =
    providers.length > 0 ? providers : [{ value: "openai" as const, label: "OpenAI" }];
  const history = prismaMessageStore.data.slice(0, 20);

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
            <div className="flex items-center gap-2">
              <FormSelect
                name="provider"
                options={resolvedProviders}
                defaultValue={resolvedProviders[0]?.value ?? "openai"}
                className="h-9 w-full rounded-full border border-border/60 bg-muted/40 text-xs sm:w-auto sm:min-w-[140px]"
                searchable={false}
                formId={formId}
              />
              <form action={clearAi}>
                <button
                  type="submit"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full text-xs cursor-pointer")}
                >
                  Limpar conversa
                </button>
              </form>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex h-[60vh] min-h-[420px] flex-col gap-4 sm:h-[68vh] lg:h-[72vh]">
          <IntelligenceChatClient
            history={history}
            action={askAi}
            confirmAction={confirmAi}
            providers={resolvedProviders}
            formId={formId}
          />
        </CardContent>
      </Card>
    </div>
  );
}