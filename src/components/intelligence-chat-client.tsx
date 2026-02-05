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
      <div className="flex flex-1 flex-col-reverse gap-6 overflow-auto rounded-lg border bg-background p-3 sm:p-4">
        {optimisticHistory.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Sem mensagens ainda. Faça uma pergunta para começar.
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
                  <div className="text-xs font-semibold text-muted-foreground">
                    Assistente
                  </div>
                  <div className="whitespace-pre-wrap break-words">{m.response}</div>
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
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {m.actions.map((a, idx) => (
                          <li key={`${a.name}-${idx}`}>
                            <span className="font-medium">{a.name}</span>
                            <span className="break-words"> — {JSON.stringify(a.params)}</span>
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
