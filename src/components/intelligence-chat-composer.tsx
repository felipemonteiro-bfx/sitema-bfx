"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/form-select";
import { Paperclip, Send, Lightbulb, Mic } from "lucide-react";
import { ChatPromptInput } from "@/components/chat-prompt-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type IntelligenceChatComposerProps = {
  action: (formData: FormData) => void;
  providers?: { value: "openai" | "gemini"; label: string }[];
};

export function IntelligenceChatComposer({ action, providers = [] }: IntelligenceChatComposerProps) {
  const [prompt, setPrompt] = React.useState("");
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);
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
      <div className="flex items-center gap-3 rounded-full border border-border/60 bg-background/80 px-4 py-2 shadow-sm">
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
          <PopoverContent className="w-72 text-sm" side="top" align="start">
            <div className="space-y-2 text-muted-foreground">
              <div>Gere mensagens de cobrança com tom profissional.</div>
              <div>Peça resumos semanais de desempenho.</div>
              <div>Solicite planos para bater metas mensais.</div>
              <div>Compare vendedores e recomende ações.</div>
              <div className="rounded-md border bg-muted/30 p-2 text-xs">
                Dica: use perguntas com contexto e período para respostas mais precisas.
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <input ref={fileRef} type="file" className="hidden" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
          aria-label="Anexar"
          onClick={() => fileRef.current?.click()}
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <FormSelect
          name="provider"
          options={providers}
          defaultValue={providers[0]?.value ?? "openai"}
          className="h-9 min-w-[110px] rounded-full border border-border/60 bg-muted/40 text-xs"
        />

        <ChatPromptInput
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[36px] max-h-24 flex-1 resize-none border-0 bg-transparent p-0 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0"
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
          aria-label="Microfone"
        >
          <Mic className="h-4 w-4" />
        </Button>

        <Button size="icon" className="h-10 w-10 rounded-full" type="submit">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
