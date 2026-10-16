"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/form-select";
import { Send, Lightbulb, Mic, Square, X } from "lucide-react";
import { ChatPromptInput } from "@/components/chat-prompt-input";

type IntelligenceChatComposerProps = {
  action: (formData: FormData) => void;
  providers?: { value: "openai" | "gemini"; label: string }[];
  formId?: string;
  showProviderSelect?: boolean;
  /** Texto que já abre no campo (ex.: vindo da busca ⌘K). Não envia sozinho. */
  initialPrompt?: string;
};

export function IntelligenceChatComposer({
  action,
  providers = [],
  formId = "intelligence-chat-form",
  showProviderSelect = true,
  initialPrompt = "",
}: IntelligenceChatComposerProps) {
  const [prompt, setPrompt] = React.useState(initialPrompt);
  const [recording, setRecording] = React.useState(false);
  const [transcribing, setTranscribing] = React.useState(false);
  const [recordingSeconds, setRecordingSeconds] = React.useState(0);
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const submitRef = React.useRef<HTMLButtonElement | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

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
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      alert("Permissão de microfone negada ou indisponível.");
    }
  };

  const stopRecording = () => {
    clearTimer();
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    mr.onstop = async () => {
      mr.stream?.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
      setTranscribing(true);
      try {
        const fd = new FormData();
        fd.append("audio", blob, "audio.webm");
        const resp = await fetch("/api/transcribe", { method: "POST", body: fd });
        const data = await resp.json();
        if (data.text) setPrompt((p) => (p ? `${p} ${data.text}` : data.text));
      } finally {
        setTranscribing(false);
      }
    };
    mr.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
    setRecordingSeconds(0);
  };

  const cancelRecording = () => {
    clearTimer();
    const mr = mediaRecorderRef.current;
    if (mr) {
      mr.onstop = () => {
        mr.stream?.getTracks().forEach((t) => t.stop());
      };
      mr.stop();
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setRecordingSeconds(0);
  };

  const hasText = prompt.trim().length > 0;

  return (
    <form
      id={formId}
      action={action}
      ref={formRef}
      onSubmit={() => setPrompt("")}
    >
      {/* exceção shadcn: gatilho `hidden` (display:none) para requestSubmit do formulário;
          não tem pegada visual, então Button não acrescentaria nada. */}
      <button ref={submitRef} type="submit" className="hidden" aria-hidden="true" />

      <div className="flex items-center gap-2 rounded-interno border border-divisoria bg-controle px-3 py-2 focus-within:border-primary">

        {/* Estado: gravando */}
        {recording ? (
          <>
            {/* Cancelar */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:text-destructive"
              onClick={cancelRecording}
              aria-label="Cancelar gravação"
              title="Cancelar gravação"
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Indicador de gravação */}
            <div className="flex flex-1 items-center gap-2 px-1">
              <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-destructive" />
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full w-(--w) rounded-full bg-destructive/60 transition-all duration-1000"
                  style={{ "--w": `${Math.min((recordingSeconds / 120) * 100, 100)}%` } as React.CSSProperties}
                />
              </div>
              <span className="shrink-0 font-mono text-xs tabular-nums text-destructive">
                {formatTime(recordingSeconds)}
              </span>
            </div>

            {/* Parar e transcrever */}
            <Button
              type="button"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={stopRecording}
              aria-label="Parar e transcrever"
              title="Parar e transcrever"
            >
              <Square className="h-4 w-4 fill-current" />
            </Button>
          </>
        ) : (
          <>
            {/* Botão de dicas */}
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
                className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-3 w-72 -translate-x-1/2 rounded-interno border border-divisoria bg-popover p-3 text-xs text-popover-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 motion-reduce:transition-none"
              >
                <div className="space-y-2 text-muted-foreground">
                  <div>Gere mensagens de cobrança com tom profissional.</div>
                  <div>Peça resumos semanais de desempenho.</div>
                  <div>Solicite planos para bater metas mensais.</div>
                  <div>Compare vendedores e recomende ações.</div>
                  <div className="rounded-controle bg-poco p-2 text-xs">
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
                className="h-10 w-full rounded-full border border-divisoria bg-poco text-xs sm:w-auto sm:min-w-27.5"
                searchable={false}
              />
            )}

            {/* Input de texto */}
            <ChatPromptInput
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-11 max-h-32 w-full flex-1 resize-none rounded-controle border border-transparent bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />

            {/* Botão direito: Send (com texto) ou Mic (vazio) */}
            {hasText ? (
              <Button
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full transition-all duration-150"
                type="submit"
                aria-label="Enviar mensagem"
              >
                <Send className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-10 w-10 shrink-0 rounded-full text-muted-foreground transition-all duration-150 hover:border-primary hover:text-primary disabled:opacity-50"
                onClick={startRecording}
                disabled={transcribing}
                aria-label={transcribing ? "Transcrevendo..." : "Gravar áudio"}
                title={transcribing ? "Transcrevendo..." : "Gravar áudio"}
              >
                <Mic className={`h-4 w-4 ${transcribing ? "animate-pulse text-primary" : ""}`} />
              </Button>
            )}
          </>
        )}
      </div>

      <div className="mt-1.5 text-xs text-muted-foreground">
        {recording
          ? "Toque no quadrado vermelho para parar e transcrever, ou no X para cancelar."
          : transcribing
          ? "Transcrevendo áudio..."
          : "Dica: Ctrl/Cmd + Enter para enviar."}
      </div>
    </form>
  );
}
