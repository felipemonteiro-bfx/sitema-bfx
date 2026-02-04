"use client";

import * as React from "react";
import type { FormEvent } from "react";
import { IntelligenceChatComposer } from "@/components/intelligence-chat-composer";

type Message = {
  prompt: string;
  response: string;
  provider: string;
  at: string;
};

type IntelligenceChatClientProps = {
  history: Message[];
  action: (formData: FormData) => Promise<void> | void;
  providers: { value: "openai" | "gemini"; label: string }[];
};

export function IntelligenceChatClient({ history, action, providers }: IntelligenceChatClientProps) {
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

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col-reverse gap-4 overflow-auto rounded-lg border bg-background p-3 sm:gap-6 sm:p-4">
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
                <div className="max-w-full rounded-2xl border bg-primary/10 px-4 py-3 text-sm text-foreground sm:max-w-[75%]">
                  <div className="text-xs font-semibold text-muted-foreground">Você</div>
                  <div>{m.prompt}</div>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-full rounded-2xl border bg-muted/50 px-4 py-3 text-sm text-foreground sm:max-w-[75%]">
                  <div className="text-xs font-semibold text-muted-foreground">
                    Assistente
                  </div>
                  <div>{m.response}</div>
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
