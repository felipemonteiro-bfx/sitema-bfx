"use client";

// Pix do fechamento na tela (Fase 6): a cobrança ativa (QR, copia-e-cola, vencimento, link do
// Asaas), recebido/saldo/excedente, a lista de recebimentos com Confirmar/Estornar e o recebimento
// manual em dois passos. E a conciliação boletos Prudent × demonstrativo.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, ExternalLink, FileText, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatBRL } from "@/lib/utils";
import { formatarDataPura, hojeDataPura } from "@/lib/data-pura";
import { arquivoGrandeDemais } from "@/lib/arquivo-limite";
import { validarRecebimentoManual } from "@/lib/recebimento-fechamento";
import type { ConciliacaoDetalhe, PixDetalhe, RecebimentoDetalhe } from "@/lib/fechamento-leitura";
import {
  confirmarRecebimentoAction,
  estornarRecebimentoAction,
  registrarRecebimentoManualAction,
} from "@/app/(app)/fechamento/actions";

const dataIso = (iso: string) => formatarDataPura(`${iso.slice(0, 10)}T00:00:00.000Z`);
const ERRO_REDE = "Não foi possível falar com o servidor. Confira a conexão e tente de novo.";

const STATUS_RECEBIMENTO: Record<string, { rotulo: string; variante: "warning" | "success" | "outline" }> = {
  pendente: { rotulo: "a confirmar", variante: "warning" },
  confirmado: { rotulo: "confirmado", variante: "success" },
  estornado: { rotulo: "estornado", variante: "outline" },
};

async function chamar(fn: () => Promise<{ ok: true } | { ok: false; erro: string }>) {
  try {
    return await fn();
  } catch {
    return { ok: false as const, erro: ERRO_REDE };
  }
}

/** Bloco do Pix dentro do cartão "Valor do Pix". */
export function PixDoFechamento({ fechamentoId, pix }: { fechamentoId: number; pix: PixDetalhe }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [registrar, setRegistrar] = useState(false);
  const [estornar, setEstornar] = useState<RecebimentoDetalhe | null>(null);

  const executar = (fn: () => Promise<{ ok: true } | { ok: false; erro: string }>, sucesso: string, depois?: () => void) =>
    iniciar(async () => {
      const r = await chamar(fn);
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      toast.success(sucesso);
      depois?.();
      router.refresh();
    });

  const temAlgo = pix.cobranca || pix.recebimentos.length > 0 || pix.podeRegistrar;
  if (!temAlgo) return null;

  return (
    <div className="flex flex-col gap-4 border-t pt-4">
      {pix.cobranca && <CobrancaAtiva cobranca={pix.cobranca} />}

      {(pix.recebimentos.length > 0 || pix.podeRegistrar) && (
        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm tabular-nums">
          <dt className="text-muted-foreground">Recebido (confirmado)</dt>
          <dd className="text-right">
            <span className="valor-sensivel">{formatBRL(pix.recebido)}</span>
          </dd>
          <dt className="text-muted-foreground">Falta receber</dt>
          <dd className="text-right font-semibold">
            <span className="valor-sensivel">{formatBRL(pix.saldo)}</span>
          </dd>
          {pix.excedente > 0 && (
            <>
              <dt className="text-warning-text">Crédito a resolver</dt>
              <dd className="text-right font-semibold text-warning-text">
                <span className="valor-sensivel">{formatBRL(pix.excedente)}</span>
              </dd>
            </>
          )}
        </dl>
      )}

      {pix.recebimentos.length > 0 && (
        <section aria-labelledby="fechamento-recebimentos" className="flex flex-col gap-2">
          <h3 id="fechamento-recebimentos" className="text-sm font-semibold">
            Recebimentos
          </h3>
          <ul className="flex flex-col divide-y text-sm">
            {pix.recebimentos.map((r) => {
              const st = STATUS_RECEBIMENTO[r.status] ?? { rotulo: r.status, variante: "outline" as const };
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2 first:pt-0 last:pb-0">
                  <span className="tabular-nums text-muted-foreground">{dataIso(r.data)}</span>
                  <span>{r.origem === "asaas" ? "Pix do Asaas" : "Manual"}</span>
                  <Badge variant={st.variante} className="whitespace-nowrap">
                    {st.rotulo}
                  </Badge>
                  <span
                    className={`valor-sensivel ml-auto tabular-nums ${r.status === "estornado" ? "text-muted-foreground line-through" : "font-semibold"}`}
                  >
                    {formatBRL(r.valor)}
                  </span>
                  {(r.comprovanteArquivoId != null || r.origem === "manual") && r.status !== "estornado" && (
                    <span className="flex w-full flex-wrap justify-end gap-1">
                      {r.comprovanteArquivoId != null && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`/api/arquivos/${r.comprovanteArquivoId}`} target="_blank" rel="noopener noreferrer">
                            <FileText className="h-4 w-4" aria-hidden="true" />
                            Comprovante
                          </a>
                        </Button>
                      )}
                      {r.origem === "manual" && r.status === "pendente" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pendente}
                          onClick={() => executar(() => confirmarRecebimentoAction(r.id), "Recebimento confirmado.")}
                        >
                          Confirmar
                        </Button>
                      )}
                      {r.origem === "manual" && (
                        <Button size="sm" variant="ghost" disabled={pendente} onClick={() => setEstornar(r)}>
                          Estornar
                        </Button>
                      )}
                    </span>
                  )}
                  {r.origem === "manual" && r.status === "confirmado" && r.confirmadoPor && (
                    <span className="w-full text-xs text-muted-foreground">
                      registrado por {r.registradoPor ?? "—"}, confirmado por {r.confirmadoPor}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {pix.podeRegistrar && (
        <Button variant="outline" className="self-start" onClick={() => setRegistrar(true)} disabled={pendente}>
          Registrar recebimento manual
        </Button>
      )}

      <DialogoRecebimento aberto={registrar} fechamentoId={fechamentoId} onClose={() => setRegistrar(false)} />

      <AlertDialog open={estornar !== null} onOpenChange={(a) => !a && setEstornar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estornar este recebimento?</AlertDialogTitle>
            <AlertDialogDescription>
              {!estornar
                ? ""
                : estornar.status === "pendente"
                  ? `O registro de ${formatBRL(estornar.valor)} de ${dataIso(estornar.data)} é descartado; ele ainda não contava no saldo.`
                  : `${formatBRL(estornar.valor)} de ${dataIso(estornar.data)} deixa de contar no fechamento. Se ele tinha quitado o fechamento, as parcelas voltam a ficar em aberto.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendente}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={pendente}
              onClick={(ev) => {
                ev.preventDefault();
                const alvo = estornar;
                if (alvo) executar(() => estornarRecebimentoAction(alvo.id), "Recebimento estornado.", () => setEstornar(null));
              }}
            >
              Estornar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CobrancaAtiva({ cobranca }: { cobranca: NonNullable<PixDetalhe["cobranca"]> }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    if (!cobranca.copiaECola) return;
    try {
      await navigator.clipboard.writeText(cobranca.copiaECola);
      setCopiado(true);
      toast.success("Pix copia e cola copiado.");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("Não foi possível copiar. Selecione o código e copie à mão.");
    }
  };
  return (
    <section aria-labelledby="fechamento-cobranca" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="fechamento-cobranca" className="text-sm font-semibold">
          Cobrança Pix ativa
        </h3>
        <a
          href={cobranca.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Ver no Asaas
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
      <div className="flex gap-4">
        {cobranca.qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- data URL do QR, sem otimização a fazer
          <img
            src={cobranca.qrDataUrl}
            alt={`QR Code do Pix de ${formatBRL(cobranca.valor)}`}
            width={112}
            height={112}
            className="h-28 w-28 shrink-0 rounded-md border bg-background p-1"
          />
        )}
        <dl className="grid min-w-0 flex-1 grid-cols-[auto_1fr] content-start gap-x-3 gap-y-1 text-sm tabular-nums">
          <dt className="text-muted-foreground">Valor</dt>
          <dd className="text-right font-semibold">
            <span className="valor-sensivel">{formatBRL(cobranca.valor)}</span>
          </dd>
          <dt className="text-muted-foreground">Vence</dt>
          <dd className="text-right">{dataIso(cobranca.vencimento)}</dd>
          <dt className="text-muted-foreground">Identificação</dt>
          <dd className="truncate text-right" title={cobranca.identificacao}>
            {cobranca.identificacao}
          </dd>
        </dl>
      </div>
      {cobranca.copiaECola ? (
        <div className="flex gap-2">
          <Input
            readOnly
            value={cobranca.copiaECola}
            aria-label="Pix copia e cola"
            className="font-mono text-xs"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button variant="outline" onClick={copiar} leftIcon={copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}>
            {copiado ? "Copiado" : "Copiar"}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">O QR Code ainda não foi gerado; ele vem no próximo envio desta versão.</p>
      )}
    </section>
  );
}

function DialogoRecebimento({ aberto, fechamentoId, onClose }: { aberto: boolean; fechamentoId: number; onClose: () => void }) {
  const router = useRouter();
  const hoje = hojeDataPura();
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hoje);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const fechar = () => {
    setValor("");
    setData(hoje);
    setErro(null);
    onClose();
  };

  const salvar = (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const v = validarRecebimentoManual({ valor, data });
    if (!v.ok) {
      setErro(v.erro);
      return;
    }
    const fd = new FormData(ev.currentTarget);
    fd.set("fechamentoId", String(fechamentoId));
    fd.set("valor", valor);
    fd.set("data", data);
    const grande = arquivoGrandeDemais(fd);
    if (grande) {
      setErro(grande);
      return;
    }
    setErro(null);
    iniciar(async () => {
      let r: { ok: true } | { ok: false; erro: string };
      try {
        r = await registrarRecebimentoManualAction(fd);
      } catch {
        r = { ok: false, erro: "Não foi possível enviar. Confira a conexão e o tamanho do arquivo (até 10 MB)." };
      }
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      toast.success("Recebimento registrado. Falta confirmar.");
      fechar();
      router.refresh();
    });
  };

  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && fechar()}>
      <DialogContent>
        <form onSubmit={salvar} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Registrar recebimento manual</DialogTitle>
            <DialogDescription>Fica pendente até alguém confirmar que o dinheiro está na conta.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="recebimento-valor">Valor recebido</Label>
            <Input
              id="recebimento-valor"
              inputMode="decimal"
              autoComplete="off"
              placeholder="1.500,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              aria-describedby={erro ? "recebimento-erro" : undefined}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="recebimento-data">Data do recebimento</Label>
            <DateInput id="recebimento-data" value={data} onChange={setData} max={hoje} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="recebimento-comprovante">Comprovante (opcional)</Label>
            <Input
              id="recebimento-comprovante"
              type="file"
              name="comprovante"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              className="h-10 px-2 pt-1.5"
            />
            <p className="text-xs text-muted-foreground">PDF, PNG ou JPG, até 10 MB. Anexar não confirma o recebimento.</p>
          </div>
          {erro && (
            <p id="recebimento-erro" role="alert" className="text-sm text-error-text">
              {erro}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={fechar} disabled={pendente}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pendente}>
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Seção "Conciliação com os boletos Prudent". */
export function ConciliacaoFechamento({ c }: { c: ConciliacaoDetalhe }) {
  return (
    <Card className="p-5">
      <section aria-labelledby="fechamento-conciliacao" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Scale className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h2 id="fechamento-conciliacao" className="text-base font-semibold">
            Conciliação com os boletos Prudent
          </h2>
          {c.concluido ? (
            <Badge variant="success" className="ml-auto">
              Concluído
            </Badge>
          ) : c.conciliado ? (
            <Badge variant="info" className="ml-auto">
              Conciliado
            </Badge>
          ) : null}
        </div>
        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm tabular-nums">
          <dt className="text-muted-foreground">Parcelas antecipadas no demonstrativo</dt>
          <dd className="text-right">
            <span className="valor-sensivel">{formatBRL(c.somaLinhasAntecipadas)}</span>
          </dd>
          <dt className="text-muted-foreground">Boletos Prudent que a BFX paga</dt>
          <dd className="text-right">
            <span className="valor-sensivel">{formatBRL(c.somaBoletos)}</span>
          </dd>
          <dt className="font-semibold">Diferença</dt>
          <dd className={`text-right font-semibold ${Math.abs(c.diferenca) > 0.01 ? "text-error-text" : ""}`}>
            <span className="valor-sensivel">{formatBRL(c.diferenca)}</span>
          </dd>
        </dl>
        {c.divergencias.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma divergência entre os boletos e o demonstrativo.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 rounded-lg border border-error/50 bg-error-bg p-3 text-sm text-error-text dark:bg-error/10">
            {c.divergencias.map((d) => (
              <li key={d.chave}>{d.texto}</li>
            ))}
          </ul>
        )}
        <p className="text-xs leading-relaxed text-muted-foreground">
          Conciliado: o Pix pago e todos os boletos dessas parcelas pagos. Concluído: conciliado e sem divergência.
        </p>
      </section>
    </Card>
  );
}
