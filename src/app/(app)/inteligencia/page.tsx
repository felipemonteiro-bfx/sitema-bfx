import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
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
    if (p === "litellm" || p === "openai" || p === "gemini") return p;
  } catch { /* ignore */ }
  const envProvider = process.env.AI_PROVIDER;
  if (envProvider === "litellm" || envProvider === "openai" || envProvider === "gemini") return envProvider;
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
    userId: session.id,
    history,
    baseUrl,
  });

  await addAssistantMessage({
    sessaoId: usuario,
    usuario,
    usuarioId: session.id,
    content: response.text,
    promptOriginal: prompt,
    status: "done",
    links: response.links,
    provider,
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
  usuarioId?: number;
  content: string;
  promptOriginal: string;
  actions?: { name: string; params: Record<string, unknown> }[];
  status?: "pending" | "done";
  links?: { label: string; url: string }[];
  provider: "gemini" | "openai" | "litellm";
}) {
  await prisma.aiMensagem.create({
    data: {
      sessaoId: msg.sessaoId,
      usuario: msg.usuario,
      usuarioId: msg.usuarioId ?? null,
      role: "assistant",
      content: msg.content,
      contextResumo: buildContextSummary(msg.content),
      promptOriginal: msg.promptOriginal,
      actions: msg.actions ? (msg.actions as any) : undefined,
      status: msg.status ?? "done",
      links: msg.links ? (msg.links as any) : undefined,
      // Persistido junto com a resposta: `config.aiProvider` pode mudar depois,
      // e o rotulo do historico tem de dizer com o que ESTA linha foi gerada.
      provider: msg.provider,
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
  // Provedor configurado agora — vale para a mensagem que o usuario esta prestes
  // a enviar (balao otimista), nao para o historico ja gravado.
  const providerAtual = await getAiProvider();
  const history = dbRows.map((m) => ({
    prompt: m.promptOriginal ?? "",
    response: m.content,
    // Linhas anteriores a coluna `provider` ficam nulas. Nulo e "desconhecido"
    // e a pilula some — nao vira um nome de provedor inventado.
    provider: m.provider ?? null,
    at: m.criadoEm.toISOString(),
    actions: m.actions as any,
    status: m.status as "pending" | "done",
    links: m.links as any,
  }));

  // O <main> do layout ja aplica px-4/lg:px-8 — repetir aqui dobrava o recuo
  // lateral so nesta tela. A largura de leitura (max-w-6xl) fica.
  //
  // O titulo era um `CardTitle` (div, 30px/600) e a pagina nao tinha heading
  // nenhum: `main h1` vinha vazio, contra as outras 20 rotas com h1 24px/700 e
  // breadcrumb. Passa a usar `PageHeader` como todo mundo (achado 4). O padding
  // do card cai para `p-4` no mobile: em 390px sobravam 210px de leitura, 54%
  // da tela (achado 6).
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-6">
      <PageHeader
        title="BFX Intelligence (IA)"
        description="Assistente virtual para estratégias, cobranças e dúvidas do time."
        breadcrumbs={[{ label: "BFX Intelligence" }]}
        actions={
          <form action={clearAi}>
            <button
              type="submit"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full text-xs cursor-pointer")}
            >
              Limpar conversa
            </button>
          </form>
        }
      />

      <Card className="h-full">
        <CardContent className="flex h-[60vh] min-h-[420px] flex-col gap-4 p-4 sm:p-6 sm:h-[68vh] lg:h-[72vh]">
          <IntelligenceChatClient
            history={history}
            action={askAi}
            formId={formId}
            currentProvider={providerAtual}
          />
        </CardContent>
      </Card>
    </div>
  );
}
