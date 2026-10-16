"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, RefreshCw } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { gerarTokenWebhookAsaas, lerTokenWebhookAsaas } from "@/app/(app)/configuracoes/asaas-webhook-actions";
import type { StatusWebhookAsaas } from "@/lib/webhook-asaas-token";

type Props = {
  url: string;
  /** Só os 4 últimos caracteres; o completo vem de `lerTokenWebhookAsaas` ao copiar. */
  tokenMascarado: string | null;
  status: StatusWebhookAsaas;
  /** Já formatado no servidor ("17/09/2026 às 14:05"). */
  ultimoAviso: string | null;
};

const CAMPO_LEITURA = "min-w-0 flex-1 bg-muted font-mono";

async function copiarTexto(texto: Promise<string>) {
  // Safari só aceita escrever na área de transferência dentro do clique: o ClipboardItem recebe a
  // promessa e o texto é resolvido depois. Onde não existe, espera o texto e usa writeText.
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    await navigator.clipboard.write([
      new ClipboardItem({ "text/plain": texto.then((t) => new Blob([t], { type: "text/plain" })) }),
    ]);
    return;
  }
  await navigator.clipboard.writeText(await texto);
}

/**
 * Configurações › Asaas: URL e token para cadastrar o webhook no painel do Asaas, e se os avisos
 * estão chegando. Ver docs/superpowers/specs/2026-09-16-baixa-de-parcelas.md (Telas).
 */
export function WebhookAsaasCard({ url, tokenMascarado, status, ultimoAviso }: Props) {
  const router = useRouter();
  const [gerando, startGerar] = useTransition();
  const [copiando, setCopiando] = useState(false);
  // Sem área de transferência (página fora de https) o token aparece num diálogo para copiar à mão.
  const [tokenManual, setTokenManual] = useState<string | null>(null);

  async function copiarUrl() {
    if (!navigator.clipboard) {
      toast.error("Não foi possível copiar. Selecione e copie a URL manualmente.");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copiada.");
    } catch {
      toast.error("Não foi possível copiar. Selecione e copie a URL manualmente.");
    }
  }

  async function copiarToken() {
    setCopiando(true);
    if (!navigator.clipboard) {
      try {
        const r = await lerTokenWebhookAsaas();
        if (r.success && r.token) setTokenManual(r.token);
        else toast.error(r.error || "Nenhum token gerado ainda.");
      } catch {
        toast.error("Não foi possível ler o token. Tente novamente.");
      } finally {
        setCopiando(false);
      }
      return;
    }
    let erroDoServidor: string | null = null;
    const token = lerTokenWebhookAsaas().then((r) => {
      if (!r.success || !r.token) {
        erroDoServidor = r.error || "Nenhum token gerado ainda.";
        throw new Error(erroDoServidor);
      }
      return r.token;
    });
    // Sem área de transferência a promessa não é consumida; isto evita rejeição não tratada.
    token.catch(() => {});
    try {
      await copiarTexto(token);
      toast.success("Token copiado.");
    } catch {
      toast.error(erroDoServidor ?? "Não foi possível copiar o token.");
    } finally {
      setCopiando(false);
    }
  }

  function gerarToken() {
    startGerar(async () => {
      try {
        const r = await gerarTokenWebhookAsaas();
        if (!r.success) {
          toast.error(r.error || "Não foi possível gerar o token.");
          return;
        }
        toast.success(tokenMascarado ? "Token trocado. Atualize o token no Asaas." : "Token gerado. Copie e cadastre no Asaas.");
        router.refresh();
      } catch {
        toast.error("Não foi possível gerar o token. Tente novamente.");
      }
    });
  }

  const botaoGerar = (
    <Button type="button" loading={gerando} leftIcon={<RefreshCw className="h-4 w-4" />} onClick={tokenMascarado ? undefined : gerarToken}>
      {tokenMascarado ? "Gerar novo token" : "Gerar token"}
    </Button>
  );

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <CardTitle>Baixa automática de boletos</CardTitle>
          {status === "recebendo" ? (
            <Badge variant="success">Recebendo avisos</Badge>
          ) : status === "falta_cadastrar" ? (
            <Badge variant="warning">Falta cadastrar no Asaas</Badge>
          ) : (
            <Badge variant="outline">Sem token</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground text-pretty">
          O Asaas avisa o BFX quando um boleto é pago, e a parcela recebe baixa na hora. Uma conferência diária cobre
          qualquer aviso que se perca.
          {status === "recebendo" && ultimoAviso && <> Último aviso recebido em {ultimoAviso}.</>}
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="webhook-asaas-url" className="normal-case tracking-normal text-sm font-medium">URL do webhook</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input id="webhook-asaas-url" readOnly value={url} className={CAMPO_LEITURA} onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" variant="outline" leftIcon={<Copy className="h-4 w-4" />} onClick={copiarUrl} aria-label="Copiar URL do webhook">
              Copiar
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="webhook-asaas-token" className="normal-case tracking-normal text-sm font-medium">Token de autenticação</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="webhook-asaas-token"
              readOnly
              value={tokenMascarado ?? ""}
              placeholder="Nenhum token gerado"
              className={`${CAMPO_LEITURA} placeholder:font-sans`}
            />
            {tokenMascarado && (
              <Button
                type="button"
                variant="outline"
                loading={copiando}
                leftIcon={<Copy className="h-4 w-4" />}
                onClick={copiarToken}
                aria-label="Copiar token de autenticação"
              >
                Copiar
              </Button>
            )}
            {tokenMascarado ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>{botaoGerar}</AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Gerar um novo token?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O token atual para de valer na hora. Até você colar o novo token no painel do Asaas, os avisos de
                      boleto pago serão recusados (a conferência diária continua dando as baixas).
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={gerarToken}>Gerar novo token</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              botaoGerar
            )}
          </div>
          {tokenMascarado && (
            <p className="text-xs text-muted-foreground">Gerar um novo invalida o anterior: atualize o token no Asaas em seguida.</p>
          )}
        </div>

        {status !== "recebendo" && (
          <Alert variant="warning" showIcon className="text-xs">
            <p className="text-pretty">
              Gere o token aqui antes de cadastrar no Asaas. Sem ele o BFX recusa os avisos, e depois de 15 recusas
              seguidas o Asaas pausa o envio.
            </p>
          </Alert>
        )}

        <div className="space-y-2.5">
          <h3 className="text-sm font-semibold text-foreground">Como cadastrar no Asaas</h3>
          <ol className="space-y-2.5 text-sm">
            {[
              <>No painel do Asaas, abra <strong className="font-semibold">Integrações › Webhooks</strong> e adicione um webhook.</>,
              <>Cole a URL e o token acima nos campos de URL e de token de autenticação.</>,
              <>Em eventos, marque só os de <strong className="font-semibold">cobrança</strong>: recebida, confirmada, estornada e excluída.</>,
              <>Salve. A partir daí, boleto pago dá baixa na parcela sozinho.</>,
            ].map((passo, i) => (
              <li key={i} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2">
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-muted text-xs font-bold tabular-nums"
                >
                  {i + 1}
                </span>
                <span className="leading-6">{passo}</span>
              </li>
            ))}
          </ol>
        </div>
      </CardContent>

      <AlertDialog open={tokenManual !== null} onOpenChange={(aberto) => !aberto && setTokenManual(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Copie o token</AlertDialogTitle>
            <AlertDialogDescription>
              O navegador não deixou copiar automaticamente. Selecione o token abaixo e copie.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            readOnly
            value={tokenManual ?? ""}
            aria-label="Token de autenticação completo"
            className="font-mono"
            onFocus={(e) => e.currentTarget.select()}
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
