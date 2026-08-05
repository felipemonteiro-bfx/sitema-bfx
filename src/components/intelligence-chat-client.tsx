"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { IntelligenceChatComposer } from "@/components/intelligence-chat-composer";

function parseMarkdownTable(block: string): { headers: string[]; rows: string[][] } | null {
  const lines = block.trim().split("\n").filter((l) => l.trim());
  if (lines.length < 3) return null;
  const parseRow = (line: string) =>
    line.split("|").slice(1, -1).map((c) => c.trim());
  const isSeparator = (line: string) => /^\|[-:| ]+\|$/.test(line.trim());
  const [headerLine, sepLine, ...dataLines] = lines;
  if (!isSeparator(sepLine)) return null;
  return { headers: parseRow(headerLine), rows: dataLines.map(parseRow) };
}

function MarkdownTable({ block }: { block: string }) {
  const table = parseMarkdownTable(block);
  if (!table) return <pre className="text-xs text-muted-foreground">{block}</pre>;
  return (
    <div className="my-2 overflow-x-auto rounded-lg border">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b bg-muted/60">
            {table.headers.map((h, i) => (
              <th key={i} className="px-3 py-1.5 text-left font-semibold text-foreground whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? "bg-background" : "bg-muted/20"}>
              {row.map((cell, ci) => (
                // `text-muted-foreground` media 4.43:1 sobre a linha zebrada no
                // tema claro, abaixo do minimo de 4.5. Celula de dado e conteudo
                // primario: vai de `foreground`, e a distincao com o cabecalho
                // continua sendo o `font-semibold` (achado 7).
                <td key={ci} className="px-3 py-1.5 text-foreground border-t whitespace-nowrap">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TABLE_BLOCK_RE = /((?:^\|.+\|\s*$\n?){3,})/gm;

function splitTextAndTables(text: string): { type: "text" | "table"; content: string }[] {
  const segments = text.split(TABLE_BLOCK_RE);
  return segments
    .filter((s) => s.length > 0)
    .map((s) => ({
      type: /^\|/.test(s.trimStart()) ? "table" : "text",
      content: s,
    }));
}

const MD_COMPONENTS = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-1 leading-relaxed">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  h1: ({ children }: { children?: React.ReactNode }) => <h1 className="text-base font-bold mt-2 mb-1">{children}</h1>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-sm font-bold mt-2 mb-1">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-sm font-semibold mt-1 mb-0.5">{children}</h3>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-5 space-y-0.5 my-1">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-5 space-y-0.5 my-1">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li className="leading-relaxed">{children}</li>,
  code: ({ children }: { children?: React.ReactNode }) => <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{children}</code>,
  hr: () => <hr className="my-2 border-border" />,
};

const TOOL_CALL_ABRE = "<tool_call>";
const TOOL_CALL_FECHA = "</tool_call>";
const FUNCTION_ABRE = "<function";
const FUNCTION_FECHA = "</function>";

/**
 * Remove um bloco `abre … fecha` inteiro, incluindo o conteudo. Bloco sem
 * fechamento derruba o resto do texto de proposito: o que vem depois de uma
 * abertura pendurada e continuacao do markup, nao resposta.
 */
function removerBloco(texto: string, abre: string, fecha: string): string {
  return texto
    .split(abre)
    .map((parte, i) => {
      if (i === 0) return parte;
      const depois = parte.split(fecha);
      return depois.length > 1 ? depois.slice(1).join(fecha) : "";
    })
    .join("");
}

/**
 * Remove o markup interno de chamada de ferramenta que alguns provedores emitem
 * no corpo do texto em vez do canal proprio — `<tool_call>…</tool_call>` e
 * `<function=…>…</function>`. Isso vazava cru para o usuario (achado 8 da fase
 * 17); o caso visto em producao foi `<tool_call> <function=resumo_financeiro>`.
 *
 * Filtro de RENDERIZACAO: o conteudo ja persistido em `ai_mensagens` nao e
 * tocado. Texto de erro do provedor tambem nao — e diagnostico legitimo, ainda
 * que feio.
 *
 * Nota de seguranca (CLAUDE.md): so `.split()`/`.join()`, nenhuma execucao de
 * regex com estado.
 */
export function stripToolMarkup(text: string): string {
  const semToolCall = removerBloco(text, TOOL_CALL_ABRE, TOOL_CALL_FECHA);
  const semFunction = removerBloco(semToolCall, FUNCTION_ABRE, FUNCTION_FECHA);
  // Fechamento orfao (abertura ja consumida em outro bloco) nao casa com
  // `<function` e sobreviveria ao passo anterior.
  return semFunction.split(FUNCTION_FECHA).join("").trim();
}

function MarkdownContent({ text }: { text: string }) {
  const limpo = stripToolMarkup(text);
  if (!limpo) {
    return (
      <p className="text-xs italic text-muted-foreground">
        A resposta veio só com uma chamada interna de ferramenta, sem texto para exibir.
      </p>
    );
  }
  const parts = splitTextAndTables(limpo);
  return (
    <>
      {parts.map((part, i) =>
        part.type === "table" ? (
          <MarkdownTable key={i} block={part.content} />
        ) : (
          <ReactMarkdown key={i} components={MD_COMPONENTS}>
            {part.content}
          </ReactMarkdown>
        )
      )}
    </>
  );
}

type Message = {
  prompt: string;
  response: string;
  /** Provedor que gerou a resposta. `null` = desconhecido (linha anterior a coluna). */
  provider: string | null;
  at: string;
  actions?: { name: string; params: Record<string, unknown> }[];
  status?: "pending" | "done";
  links?: { label: string; url: string }[];
};

type IntelligenceChatClientProps = {
  history: Message[];
  action: (formData: FormData) => Promise<void> | void;
  formId?: string;
  /** Provedor configurado agora — usado so no balao otimista da mensagem em voo. */
  currentProvider: string;
};

export function IntelligenceChatClient({
  history,
  action,
  formId,
  currentProvider,
}: IntelligenceChatClientProps) {
  const router = useRouter();
  const [optimisticHistory, addOptimistic] = React.useOptimistic(
    history,
    (state: Message[], next: Message) => [next, ...state]
  );

  const handleSubmit = async (formData: FormData) => {
    const prompt = String(formData.get("prompt") || "").trim();
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
        provider: currentProvider,
        at: new Date().toISOString(),
      });
    }
    await action(formData);
    router.refresh();
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
                {m.provider && (
                  <span className="rounded-full border bg-card px-2 py-0.5 uppercase tracking-wide">
                    {m.provider}
                  </span>
                )}
                <span>{new Date(m.at).toLocaleString("pt-BR")}</span>
              </div>
              {/* max-w-full no mobile: com 92% sobravam 210px de leitura em
                  390px, 54% da tela (achado 6). O limite de 75% volta no sm.
                  Os rotulos saem de `muted-foreground` — mediam 3.65:1 sobre o
                  tint da bolha do usuario e 4.45:1 na do assistente (achado 9). */}
              <div className="flex justify-end">
                <div className="w-full max-w-full rounded-2xl border bg-primary/10 px-3 py-2 text-sm text-foreground sm:max-w-[75%] sm:px-4 sm:py-3">
                  <div className="text-xs font-semibold text-foreground">Você</div>
                  <div className="break-words">{m.prompt}</div>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="w-full max-w-full rounded-2xl border bg-muted/50 px-3 py-2 text-sm text-foreground sm:max-w-[75%] sm:px-4 sm:py-3">
                  <div className="text-xs font-semibold text-foreground">Assistente</div>
                  <div className="space-y-1 break-words text-sm">
                    <MarkdownContent text={m.response} />
                  </div>
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
