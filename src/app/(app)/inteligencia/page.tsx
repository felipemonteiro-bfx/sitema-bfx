import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { runAiWithActions } from "@/lib/ai";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { IntelligenceChatClient } from "@/components/intelligence-chat-client";

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
  });
  prismaMessageStore.add({ prompt, response: response.text, provider });
  revalidatePath("/inteligencia");
}

const prismaMessageStore = {
  data: [] as { prompt: string; response: string; provider: string; at: string }[],
  add(msg: { prompt: string; response: string; provider: string }) {
    this.data.unshift({ ...msg, at: new Date().toISOString() });
  },
};

export default async function Page() {
  const cfg = await prisma.config.findFirst();
  const providers = [
    ...(cfg?.openaiKey ? [{ value: "openai" as const, label: "OpenAI" }] : []),
    ...(cfg?.geminiKey ? [{ value: "gemini" as const, label: "Gemini" }] : []),
  ];
  const resolvedProviders =
    providers.length > 0 ? providers : [{ value: "openai" as const, label: "OpenAI" }];
  const history = prismaMessageStore.data.slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">BFX Intelligence (IA)</h1>
          <p className="text-sm text-muted-foreground">
            Assistente virtual para estratégias, cobranças e dúvidas do time.
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Conversas</CardTitle>
          </CardHeader>
          <CardContent className="flex h-[70vh] flex-col gap-4">
            <IntelligenceChatClient
              history={history}
              action={askAi}
              providers={resolvedProviders}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
