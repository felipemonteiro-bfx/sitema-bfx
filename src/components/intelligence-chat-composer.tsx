"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/form-select";
import { Send, Lightbulb } from "lucide-react";
import { ChatPromptInput } from "@/components/chat-prompt-input";

type IntelligenceChatComposerProps = {
  action: (formData: FormData) => void;
  providers?: { value: "openai" | "gemini"; label: string }[];
};

export function IntelligenceChatComposer({ action, providers = [] }: IntelligenceChatComposerProps) {
  const [prompt, setPrompt] = React.useState("");
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const submitRef = React.useRef<HTMLButtonElement | null>(null);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      submitRef.current?.click();
      setPrompt("");
    }
  };

  return (
    <form
      action={action}
      ref={formRef}
      onSubmit={() => {
        setPrompt("");
      }}
    >
      <button ref={submitRef} type="submit" className="hidden" aria-hidden="true" />
      <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/80 px-3 py-2 shadow-sm">
        <div className="relative flex items-center group">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
            aria-label="Guia rápido"
            aria-describedby="guia-rapida"
          >
            <Lightbulb className="h-4 w-4" />
          </Button>
          <div
            id="guia-rapida"
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-3 w-72 -translate-x-1/2 rounded-md border bg-popover p-3 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100"
          >
            <div className="space-y-2 text-muted-foreground">
              <div>Gere mensagens de cobrança com tom profissional.</div>
              <div>Peça resumos semanais de desempenho.</div>
              <div>Solicite planos para bater metas mensais.</div>
              <div>Compare vendedores e recomende ações.</div>
              <div className="rounded-md border bg-muted/30 p-2 text-[11px]">
                Dica: use perguntas com contexto e período para respostas mais precisas.
              </div>
            </div>
          </div>
        </div>

        <FormSelect
          name="provider"
          options={providers}
          defaultValue={providers[0]?.value ?? "openai"}
          className="h-9 min-w-[110px] rounded-full border border-border/60 bg-muted/40 text-xs"
          searchable={false}
        />

        <ChatPromptInput
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[40px] max-h-28 flex-1 resize-none rounded-2xl border border-transparent bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:border-border focus-visible:bg-background focus-visible:ring-0 focus-visible:ring-offset-0"
        />

        <Button size="icon" className="h-10 w-10 rounded-full" type="submit">
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">
        Dica: use Ctrl/Cmd + Enter para enviar.
      </div>
    </form>
  );
}



