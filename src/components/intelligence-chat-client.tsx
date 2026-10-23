"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { IntelligenceChatComposer } from "@/components/intelligence-chat-composer";
import { stripToolMarkup } from "@/lib/strip-tool-markup";
import { colunasNumericas } from "@/lib/markdown-tabela";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

  // A tabela chega como markdown, sem schema: a coluna numerica e descoberta
  // pelo conteudo. Antes toda celula ia a esquerda, entao comparar "R$ 1.450,00"
  // com "R$ 890,00" na vertical obrigava a ler digito a digito — o resto do
  // sistema alinha numero a direita com `tabular-nums` (auditoria 2026-08-11).
  const numericas = colunasNumericas(table.rows, table.headers.length);

  // Poço do Vantage: a tabela vive num degrau rebaixado da bolha, com o `Table` da ui
  // (cabeçalho muted em frase normal, linhas separadas pela divisória).
  return (
    <div className="my-2 rounded-interno bg-poco">
      <Table>
        <TableHeader>
          <TableRow>
            {table.headers.map((h, i) => (
              <TableHead
                key={i}
                className={cn("h-9 whitespace-nowrap px-3", numericas.has(i) ? "text-right" : "text-left")}
              >
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.rows.map((row, ri) => (
            <TableRow semHover key={ri}>
              {row.map((cell, ci) => (
                // `text-muted-foreground` media 4.43:1 sobre a linha zebrada no
                // tema claro, abaixo do minimo de 4.5. Celula de dado e conteudo
                // primario: vai de `foreground`, e a distincao com o cabecalho
                // continua sendo o tom do cabecalho (achado 7).
                <TableCell
                  key={ci}
                  tamanho="xs"
                  tom="foreground"
                  numeric={numericas.has(ci)}
                  peso={numericas.has(ci) ? "medio" : undefined}
                  className="whitespace-nowrap px-3 py-2"
                >
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
  hr: () => <Separator className="my-2" />,
};

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
  /** Pergunta que abre preenchida no campo (`?pergunta=`); o envio segue manual. */
  initialPrompt?: string;
};

export function IntelligenceChatClient({
  history,
  action,
  formId,
  currentProvider,
  initialPrompt,
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
      <div className="flex flex-1 flex-col-reverse gap-6 overflow-auto rounded-interno bg-poco p-3 sm:p-4">
        {optimisticHistory.length === 0 ? (
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>Sem mensagens ainda. Faça uma pergunta para começar.</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-interno bg-card-elevated p-4">
                Pergunte por cobranças prontas ou sugestões de abordagem.
              </div>
              <div className="rounded-interno bg-card-elevated p-4">
                Solicite um resumo de metas ou desempenho semanal.
              </div>
            </div>
          </div>
        ) : (
          optimisticHistory.map((m, i) => (
            <div key={`${m.at}-${i}`} className="space-y-3">
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                {/* A pilula so aparece quando o provedor e conhecido. Mantem o
                    preenchimento `bg-muted` (sobre `--card` um `bg-card` daria
                    1.00:1 e o chip sumiria); o que muda e o texto, que sai de
                    `muted-foreground` (4.35:1) para `foreground` — mesma
                    correcao dos rotulos das bolhas (achado 9). */}
                {m.provider && (
                  <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-foreground">
                    {m.provider}
                  </span>
                )}
                <span>{new Date(m.at).toLocaleString("pt-BR")}</span>
              </div>
              {/* Largura no mobile: com 92% sobravam 210px de leitura em 390px,
                  54% da tela (achado 6). Vai a 96% — nao a 100%: as duas bolhas
                  contrastam entre si em so 1.20:1 (tint da marca vs
                  superficie neutra), entao o deslocamento lateral do `justify-*` e
                  parte de como se ve quem falou. Em 100% ele vira no-op e sobra
                  so o rotulo. O canto inferior assimetrico reforca a origem sem
                  custar largura. O limite de 75% volta no sm.
                  Os rotulos saem de `muted-foreground` — mediam 3.65:1 sobre o
                  tint da bolha do usuario e 4.45:1 na do assistente (achado 9). */}
              <div className="flex justify-end">
                <div className="w-full max-w-[96%] rounded-interno rounded-br-sm bg-marca-tint px-3 py-2 text-sm text-foreground sm:max-w-[75%] sm:px-4 sm:py-3">
                  <div className="text-xs font-semibold text-foreground">Você</div>
                  <div className="break-words">{m.prompt}</div>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="w-full max-w-[96%] rounded-interno rounded-bl-sm border border-divisoria bg-popover px-3 py-2 text-sm text-foreground sm:max-w-[75%] sm:px-4 sm:py-3">
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
                          className="inline-flex items-center gap-2 rounded-full border border-divisoria bg-card px-3 py-1 text-xs font-medium text-foreground transition-colors duration-150 hover:bg-controle motion-reduce:transition-none"
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
          initialPrompt={initialPrompt}
        />
      </div>
    </>
  );
}
