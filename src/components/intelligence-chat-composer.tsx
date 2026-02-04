"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/form-select";
import { Send, Lightbulb } from "lucide-react";
import { ChatPromptInput } from "@/components/chat-prompt-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
      <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-background/80 px-3 py-2 shadow-sm sm:flex-row sm:items-center sm:gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
              aria-label="Guia rápido"
            >
              <Lightbulb className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="center" className="w-72">
            <div className="space-y-2 text-muted-foreground">
              <div>Gere mensagens de cobrança com tom profissional.</div>
              <div>Peça resumos semanais de desempenho.</div>
              <div>Solicite planos para bater metas mensais.</div>
              <div>Compare vendedores e recomende ações.</div>
              <div className="rounded-md border bg-muted/30 p-2 text-[11px]">
                Dica: use perguntas com contexto e período para respostas mais precisas.
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <FormSelect
          name="provider"
          options={providers}
          defaultValue={providers[0]?.value ?? "openai"}
          className="h-9 w-full rounded-full border border-border/60 bg-muted/40 text-xs sm:w-auto sm:min-w-[110px]"
        />

        <ChatPromptInput
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[44px] max-h-28 w-full flex-1 resize-none rounded-2xl border border-transparent bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:border-border focus-visible:bg-background focus-visible:ring-0 focus-visible:ring-offset-0"
        />

        <Button
          size="icon"
          className="h-10 w-full rounded-full sm:w-10"
          type="submit"
          aria-label="Enviar"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">
        Dica: use Ctrl/Cmd + Enter para enviar.
      </div>
    </form>
  );
}



