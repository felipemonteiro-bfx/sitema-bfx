"use client";

import * as React from "react";
import { IntelligenceChatComposer } from "@/components/intelligence-chat-composer";

function actionLabel(name: string): string {
  const labels: Record<string, string> = {
    criar_venda: "Criar venda",
    criar_cliente: "Criar cliente",
    criar_produto: "Cadastrar produto",
    registrar_entrada_estoque: "Registrar entrada de estoque",
    criar_despesa: "Criar despesa",
    criar_empresa: "Criar empresa",
    criar_usuario: "Criar usuário",
    criar_fornecedor: "Criar fornecedor",
    atualizar_venda: "Atualizar venda",
    atualizar_produto: "Atualizar produto",
    atualizar_usuario: "Atualizar usuário",
    atualizar_despesa: "Atualizar despesa",
  };
  return labels[name] ?? name.replace(/_/g, " ");
}

type Message = {
  prompt: string;
  response: string;
  provider: string;
  at: string;
  actions?: { name: string; params: Record<string, unknown> }[];
  status?: "pending" | "done";
  links?: { label: string; url: string }[];
};

type IntelligenceChatClientProps = {
  history: Message[];
  action: (formData: FormData) => Promise<void> | void;
  confirmAction: (formData: FormData) => Promise<void> | void;
  cancelAction?: (formData: FormData) => Promise<void> | void;
  formId?: string;
};

export function IntelligenceChatClient({
  history,
  action,
  confirmAction,
  cancelAction,
  formId,
}: IntelligenceChatClientProps) {
  const [optimisticHistory, addOptimistic] = React.useOptimistic(
    history,
    (state: Message[], next: Message) => [next, ...state]
  );

  const handleSubmit = async (formData: FormData) => {
    const prompt = String(formData.get("prompt") || "").trim();
    const provider = "gemini";
    const attachment = formData.get("attachment");
    const file =
      attachment &&
      typeof attachment !== "string" &&
      attachment instanceof File &&
      attachment.size > 0 &&
      attachment.name
        ? (attachment as File)
        : null;
    const displayPrompt = file
      ? `${prompt || "Arquivo anexado"}\n(Arquivo: ${file.name})`
      : prompt;
    if (displayPrompt.trim()) {
      addOptimistic({
        prompt: displayPrompt,
        response: "Enviando...",
        provider,
        at: new Date().toISOString(),
      });
    }
    await action(formData);
  };

  const handleConfirm = async (actions: Message["actions"]) => {
    if (!actions || actions.length === 0) return;
    const data = new FormData();
    data.set("actions", JSON.stringify(actions));
    await confirmAction(data);
  };

  const handleCancel = async (msg: Message) => {
    if (!cancelAction) return;
    const data = new FormData();
    data.set("messageAt", msg.at);
    await cancelAction(data);
  };

  return (
    <>
      <div className="flex flex-1 flex-col-reverse gap-6 overflow-auto rounded-lg border bg-background p-3 sm:p-4">
        {optimisticHistory.length === 0 ? (
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>Sem mensagens ainda. Faça uma pergunta para começar.</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/40 p-3">
                Pergunte por cobranças prontas ou sugestões de abordagem.
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                Solicite um resumo de metas ou desempenho semanal.
              </div>
            </div>
          </div>
        ) : (
          optimisticHistory.map((m, i) => (
            <div key={`${m.at}-${i}`} className="space-y-3">
              <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground sm:text-xs">
                <span className="rounded-full bg-muted px-2 py-0.5 uppercase tracking-wide">
                  {m.provider}
                </span>
                <span>{new Date(m.at).toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex justify-end">
                <div className="w-full max-w-[92%] rounded-2xl border bg-primary/10 px-3 py-2 text-sm text-foreground sm:max-w-[75%] sm:px-4 sm:py-3">
                  <div className="text-xs font-semibold text-muted-foreground">Você</div>
                  <div className="break-words">{m.prompt}</div>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="w-full max-w-[92%] rounded-2xl border bg-muted/50 px-3 py-2 text-sm text-foreground sm:max-w-[75%] sm:px-4 sm:py-3">
                  <div className="text-xs font-semibold text-muted-foreground">Assistente</div>
                  <div className="whitespace-pre-wrap break-words">{m.response}</div>
                  {m.links && m.links.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {m.links.map((link, idx) => (
                        <a
                          key={`${link.url}-${idx}`}
                          href={link.url}
                          className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-foreground transition-colors duration-150 hover:bg-muted motion-reduce:transition-none"
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                  )}
                  {m.status === "pending" && m.actions && m.actions.length > 0 && (
                    <div className="mt-3 space-y-3 rounded-lg border-2 border-warning/40 bg-warning/5 p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          Confirmar ação
                        </span>
                        <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-medium text-warning-foreground border border-warning/30">
                          {m.actions.length} {m.actions.length === 1 ? "operação" : "operações"}
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {m.actions.map((a, idx) => (
                          <li key={`${a.name}-${idx}`} className="rounded-md bg-background/80 border p-2 text-xs">
                            <div className="font-semibold text-foreground">{actionLabel(a.name)}</div>
                            <div className="mt-1 text-muted-foreground">
                              {Object.entries(a.params)
                                .filter(([, v]) => v !== undefined && v !== null && v !== "")
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(" · ")}
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center rounded-full bg-success px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-success/90"
                          onClick={() => handleConfirm(m.actions)}
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center rounded-full border px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                          onClick={() => handleCancel(m)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-auto">
        <IntelligenceChatComposer
          action={handleSubmit}
          formId={formId}
          showProviderSelect={false}
        />
      </div>
    </>
  );
}
