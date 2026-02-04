"use client";

import * as React from "react";
import type { FormEvent } from "react";
import { IntelligenceChatComposer } from "@/components/intelligence-chat-composer";

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
  providers: { value: "openai" | "gemini"; label: string }[];
};

export function IntelligenceChatClient({
  history,
  action,
  confirmAction,
  providers,
}: IntelligenceChatClientProps) {
  const [optimisticHistory, addOptimistic] = React.useOptimistic(
    history,
    (state: Message[], next: Message) => [next, ...state]
  );

  const handleSubmit = async (formData: FormData) => {
    const prompt = String(formData.get("prompt") || "").trim();
    const provider = String(formData.get("provider") || "openai");
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

  return (
    <>
      <div className="flex-1 flex flex-col-reverse gap-6 overflow-auto rounded-lg border bg-background p-4">
        {optimisticHistory.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Sem mensagens ainda. Faça uma pergunta para começar.
          </div>
        ) : (
          optimisticHistory.map((m, i) => (
            <div key={`${m.at}-${i}`} className="space-y-3">
              <div className="flex justify-center text-[11px] text-muted-foreground">
                <span className="rounded-full bg-muted px-2 py-0.5 uppercase tracking-wide">
                  {m.provider}
                </span>
                <span className="ml-2">{new Date(m.at).toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex justify-end">
                <div className="max-w-[75%] rounded-2xl border bg-primary/10 px-4 py-3 text-sm text-foreground">
                  <div className="text-xs font-semibold text-muted-foreground">Você</div>
                  <div>{m.prompt}</div>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[75%] rounded-2xl border bg-muted/50 px-4 py-3 text-sm text-foreground">
                  <div className="text-xs font-semibold text-muted-foreground">
                    Assistente
                  </div>
                  <div className="whitespace-pre-wrap">{m.response}</div>
                  {m.links && m.links.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {m.links.map((link, idx) => (
                        <a
                          key={`${link.url}-${idx}`}
                          href={link.url}
                          className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-foreground hover:bg-muted"
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                  )}
                  {m.status === "pending" && m.actions && m.actions.length > 0 && (
                    <div className="mt-3 space-y-2 rounded-lg border bg-background/60 p-3">
                      <div className="text-xs font-semibold text-muted-foreground">
                        Ações sugeridas pela IA (confirmação necessária)
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {m.actions.map((a, idx) => (
                          <li key={`${a.name}-${idx}`}>
                            {a.name} — {JSON.stringify(a.params)}
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        className="mt-2 inline-flex items-center rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                        onClick={() => handleConfirm(m.actions)}
                      >
                        Confirmar ações
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-auto">
        <IntelligenceChatComposer action={handleSubmit} providers={providers} />
      </div>
    </>
  );
}
