"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/form-select";
import { Send, Lightbulb, Mic, Square } from "lucide-react";
import { ChatPromptInput } from "@/components/chat-prompt-input";

type IntelligenceChatComposerProps = {
  action: (formData: FormData) => void;
  providers?: { value: "openai" | "gemini"; label: string }[];
  formId?: string;
  showProviderSelect?: boolean;
};

export function IntelligenceChatComposer({
  action,
  providers = [],
  formId = "intelligence-chat-form",
  showProviderSelect = true,
}: IntelligenceChatComposerProps) {
  const [prompt, setPrompt] = React.useState("");
  const [recording, setRecording] = React.useState(false);
  const [transcribing, setTranscribing] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const submitRef = React.useRef<HTMLButtonElement | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      submitRef.current?.click();
      setPrompt("");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        setTranscribing(true);
        try {
          const fd = new FormData();
          fd.append("audio", blob, "audio.webm");
          const resp = await fetch("/api/transcribe", { method: "POST", body: fd });
          const data = await resp.json();
          if (data.text) setPrompt((p) => p ? `${p} ${data.text}` : data.text);
        } finally {
          setTranscribing(false);
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch {
      alert("Permissão de microfone negada ou indisponível.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  };

  return (
    <form
      id={formId}
      action={action}
      ref={formRef}
      onSubmit={() => {
        setPrompt("");
      }}
    >
      <button ref={submitRef} type="submit" className="hidden" aria-hidden="true" />
      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/80 px-3 py-3 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex items-center group">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground"
            aria-label="Guia rápido"
            aria-describedby="guia-rapida"
          >
            <Lightbulb className="h-4 w-4" />
          </Button>
          <div
            id="guia-rapida"
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-3 w-72 -translate-x-1/2 rounded-md border bg-popover p-3 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 motion-reduce:transition-none"
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

        {showProviderSelect && (
          <FormSelect
            name="provider"
            options={providers}
            defaultValue={providers[0]?.value ?? "openai"}
            className="h-10 w-full rounded-full border border-border/60 bg-muted/40 text-xs sm:w-auto sm:min-w-[110px]"
            searchable={false}
          />
        )}

        <ChatPromptInput
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[44px] max-h-32 w-full flex-1 resize-none rounded-2xl border border-transparent bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:border-border focus-visible:bg-background focus-visible:ring-0 focus-visible:ring-offset-0"
        />

        <Button
          type="button"
          size="icon"
          variant={recording ? "destructive" : "outline"}
          className="h-10 w-10 shrink-0 rounded-full"
          onClick={recording ? stopRecording : startRecording}
          disabled={transcribing}
          aria-label={recording ? "Parar gravação" : "Gravar áudio"}
          title={recording ? "Parar e transcrever" : transcribing ? "Transcrevendo..." : "Gravar áudio"}
        >
          {recording ? <Square className="h-4 w-4" /> : <Mic className={`h-4 w-4 ${transcribing ? "animate-pulse" : ""}`} />}
        </Button>

        <Button size="icon" className="h-10 w-full rounded-full sm:w-10" type="submit">
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">
        {recording ? "Gravando... clique no botão vermelho para parar e transcrever." : transcribing ? "Transcrevendo áudio..." : "Dica: use Ctrl/Cmd + Enter para enviar."}
      </div>
    </form>
  );
}



