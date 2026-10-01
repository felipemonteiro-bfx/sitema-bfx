"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, FileSpreadsheet, FileText, ListChecks, RefreshCw, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { formatarDataPura } from "@/lib/data-pura";
import { linkHistoricoEmails } from "@/lib/email-tipos";
import { podeEditar, podeReabrir, rotuloCompetencia, validarAjuste } from "@/lib/fechamento";
import type { DetalheFechamento } from "@/lib/fechamento-leitura";
import {
  adicionarAjusteFechamento,
  atualizarParcelas,
  conferirFechamentoAction,
  enviarFechamentoAction,
  reabrirFechamentoAction,
  removerAjusteFechamento,
} from "@/app/(app)/fechamento/actions";

const ddmm = (iso: string) => iso.slice(5, 10).split("-").reverse().join("/");
const dataIso = (iso: string) => formatarDataPura(`${iso.slice(0, 10)}T00:00:00.000Z`);
/** Instante (conferência, envio) no dia de Manaus, não no dia UTC. */
const dataHora = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Manaus" }).format(new Date(iso));
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Etapas do stepper; "Conciliado" é derivado e só chega na Fase 6. */
const ETAPAS = [
  { rotulo: "Em preparação", detalhe: "editando linhas e ajustes" },
  { rotulo: "Conferido", detalhe: "versão congelada" },
  { rotulo: "Enviado ao RH", detalhe: "PDF e planilha por e-mail" },
  { rotulo: "Pago", detalhe: "parcial ou total" },
  { rotulo: "Conciliado", detalhe: "Pix, parcelas e boletos" },
] as const;

const ETAPA_DO_STATUS: Record<string, number> = {
  em_preparacao: 0,
  conferido: 1,
  enviado: 2,
  pago_parcial: 3,
  pago: 3,
};

/** Resposta de action; falha de rede vira mensagem, não tela quebrada. */
async function chamar<T extends { ok: boolean }>(fn: () => Promise<T>): Promise<T | { ok: false; erro: string }> {
  try {
    return await fn();
  } catch {
    return { ok: false, erro: "Não foi possível falar com o servidor. Confira a conexão e tente de novo." };
  }
}

type Confirmacao = "enviar" | "reabrir" | null;

export default function FechamentoDetalheClient({ d }: { d: DetalheFechamento }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [ajusteAberto, setAjusteAberto] = useState(false);
  const [confirmacao, setConfirmacao] = useState<Confirmacao>(null);

  const editavel = podeEditar(d.status);
  const competencia = rotuloCompetencia(d.competencia);
  const etapa = ETAPA_DO_STATUS[d.status] ?? 0;
  const versaoAtual = d.versoes.find((v) => v.numero === d.versaoAtual) ?? null;
  const enviadas = d.versoes.filter((v) => v.enviadaEm);

  const executar = (
    fn: () => Promise<{ ok: true } | { ok: false; erro: string }>,
    sucesso: string,
    depois?: () => void
  ) =>
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

  const atualizar = () =>
    iniciar(async () => {
      const r = await chamar(() => atualizarParcelas(d.id));
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      toast.success(
        `${plural(r.reservadas, "parcela", "parcelas")} no demonstrativo` +
          (r.liberadas > 0 ? `, ${plural(r.liberadas, "saiu", "saíram")}` : "") +
          (r.bloqueadas > 0 ? `, ${plural(r.bloqueadas, "fora", "fora")} com motivo` : "") +
          "."
      );
      router.refresh();
    });

  const acoes = (
    <div className="flex flex-wrap gap-2">
      {editavel && (
        <>
          <Button variant="outline" onClick={atualizar} disabled={pendente} leftIcon={<RefreshCw className="h-4 w-4" />}>
            Atualizar parcelas
          </Button>
          <Button variant="outline" onClick={() => setAjusteAberto(true)} disabled={pendente}>
            Adicionar ajuste
          </Button>
          <Button
            onClick={() =>
              executar(() => conferirFechamentoAction(d.id), `Versão ${d.versaoAtual + 1} conferida e congelada.`)
            }
            disabled={pendente || d.linhas.length === 0 || d.desatualizado || d.reservasInvalidas > 0}
          >
            Conferir e gerar versão
          </Button>
        </>
      )}
      {podeReabrir(d.status) && (
        <Button variant="outline" onClick={() => setConfirmacao("reabrir")} disabled={pendente}>
          Reabrir para corrigir
        </Button>
      )}
      {d.status === "conferido" && (
        <Button onClick={() => setConfirmacao("enviar")} disabled={pendente}>
          Enviar ao RH
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${d.empresa.nome} · ${competencia}`}
        description="Demonstrativo mensal da empresa: parcelas do mês, ajustes e o valor do Pix."
        breadcrumbs={[{ label: "Fechamento", href: "/fechamento" }, { label: d.empresa.nome }]}
        actions={acoes}
      />

      <ol aria-label="Andamento do fechamento" className="grid grid-cols-5 gap-2 text-sm">
        {ETAPAS.map((e, i) => {
          const atual = i === etapa;
          const feita = i < etapa;
          return (
            <li key={e.rotulo} aria-current={atual ? "step" : undefined} className="flex min-w-0 flex-col gap-2">
              <span
                aria-hidden="true"
                className={`h-1 rounded-full ${atual ? "bg-primary" : feita ? "bg-primary/50" : "bg-muted"}`}
              />
              <span className={`text-xs font-semibold sm:text-sm ${atual ? "text-foreground" : "text-muted-foreground"}`}>
                {e.rotulo}
              </span>
              <span className="hidden text-xs text-muted-foreground sm:block">{e.detalhe}</span>
            </li>
          );
        })}
      </ol>

      <dl className="flex flex-wrap gap-x-9 gap-y-3 rounded-xl border bg-card px-4 py-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Competência</dt>
          <dd className="mt-0.5 font-semibold">vencimentos de {d.competencia.slice(5)}/{d.competencia.slice(0, 4)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Corte das vendas</dt>
          <dd className="mt-0.5 font-semibold">dia {d.diaCorte}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Pix vence em</dt>
          <dd className="mt-0.5 font-semibold tabular-nums">{dataIso(d.vencimentoPix)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Responsável</dt>
          <dd className="mt-0.5 font-semibold">{d.responsavel ?? "—"}</dd>
        </div>
        <div className="sm:ml-auto sm:text-right">
          <dt className="text-xs text-muted-foreground">Versão</dt>
          <dd className="mt-0.5 font-semibold">
            {d.versaoAtual === 0 ? "rascunho" : editavel ? `v${d.versaoAtual} · corrigindo` : `v${d.versaoAtual}`}
            {" · "}
            <a href={linkHistoricoEmails(d.empresa.id)} className="rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              histórico de envios
            </a>
          </dd>
        </div>
      </dl>

      {editavel && (d.desatualizado || d.reservasInvalidas > 0) && (
        <Alert variant="warning" showIcon>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>Parcelas mudaram desde a geração. Atualize antes de conferir.</span>
            <Button size="sm" variant="outline" onClick={atualizar} disabled={pendente}>
              Atualizar parcelas
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {editavel && !d.desatualizado && d.reservasInvalidas === 0 && d.novasElegiveis > 0 && (
        <Alert variant="info" showIcon>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              {plural(d.novasElegiveis, "parcela do mês ainda não entrou", "parcelas do mês ainda não entraram")} no
              demonstrativo.
            </span>
            <Button size="sm" variant="outline" onClick={atualizar} disabled={pendente}>
              Atualizar parcelas
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden">
        <section aria-labelledby="fechamento-linhas">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 pt-4">
            <h2 id="fechamento-linhas" className="text-base font-semibold">
              No demonstrativo · {plural(d.linhas.length, "parcela", "parcelas")}
            </h2>
            {d.fonteLinhas === "versao" && (
              <span className="text-xs text-muted-foreground">como na versão {d.versaoAtual}, conferida</span>
            )}
          </div>
          {d.linhas.length === 0 ? (
            <EmptyState
              size="sm"
              icon={ListChecks}
              title={`Nenhuma parcela vence em ${competencia} para esta empresa.`}
              description={
                editavel
                  ? "Use Atualizar parcelas depois de lançar ou confirmar as vendas do mês."
                  : "A versão conferida não tem parcelas."
              }
            />
          ) : (
            <div className="px-2 pb-2 pt-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-3">Colaborador</TableHead>
                    <TableHead className="hidden sm:table-cell">Parcela</TableHead>
                    <TableHead className="hidden md:table-cell">Vencimento</TableHead>
                    <TableHead className="hidden md:table-cell">Prudent</TableHead>
                    <TableHead className="pr-3 text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.linhas.map((l) => (
                    <TableRow key={l.chave}>
                      <TableCell className="pl-3">
                        {l.colaborador}
                        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground md:hidden">
                          <span className="font-semibold tabular-nums text-foreground sm:hidden">{l.identificador}</span>
                          <span className="tabular-nums">vence {ddmm(l.vencimento)}</span>
                          <SeloPrudent antecipada={l.antecipada} loteId={l.loteId} />
                        </span>
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap align-top font-semibold tabular-nums sm:table-cell md:align-middle">
                        {l.identificador}
                      </TableCell>
                      <TableCell className="hidden tabular-nums md:table-cell">{ddmm(l.vencimento)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <SeloPrudent antecipada={l.antecipada} loteId={l.loteId} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap pr-3 text-right align-top tabular-nums md:align-middle">
                        <span className="valor-sensivel">{formatBRL(l.valor)}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-12">
        <section
          aria-labelledby="fechamento-fora"
          className="flex flex-col gap-3 rounded-xl border border-warning/50 bg-warning-bg px-5 py-4 dark:bg-warning/10 lg:col-span-7"
        >
          <div className="flex items-center gap-2">
            <AlertCircle aria-hidden="true" className="h-4 w-4 text-warning-text" />
            <h2 id="fechamento-fora" className="text-base font-semibold text-warning-text">
              Fora do demonstrativo · {d.bloqueadas.length}
            </h2>
          </div>
          {d.bloqueadas.length === 0 ? (
            <p className="text-sm text-warning-text">Todas as parcelas do mês desta empresa estão no demonstrativo.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm tabular-nums">
              {d.bloqueadas.map((b) => (
                <li key={b.parcelaId} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <span className="min-w-24 font-semibold text-foreground">{b.identificador}</span>
                  <span className="order-last w-full text-warning-text sm:order-none sm:w-auto sm:flex-1">{b.rotulo}</span>
                  <span className="valor-sensivel ml-auto text-foreground">{formatBRL(b.valor)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs leading-relaxed text-warning-text">
            Nenhuma parcela é cobrada duas vezes: a que a Prudent ainda cobra da empresa não entra no Pix.
          </p>
        </section>

        <div className="flex flex-col gap-5 lg:col-span-5">
          <Card className="p-5">
            <section aria-labelledby="fechamento-total" className="flex flex-col gap-3">
              <h2 id="fechamento-total" className="text-base font-semibold">
                Valor do Pix
              </h2>
              <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm tabular-nums">
                <dt className="text-muted-foreground">Total bruto</dt>
                <dd className="text-right">
                  <span className="valor-sensivel">{formatBRL(d.totalBruto)}</span>
                </dd>
                <dt className="text-muted-foreground">
                  Ajustes justificados ({d.ajustes.length})
                </dt>
                <dd className="text-right">
                  <span className="valor-sensivel">{formatBRL(d.totalAjustes)}</span>
                </dd>
              </dl>
              {d.ajustes.length > 0 && (
                <ul className="flex flex-col gap-1.5 rounded-lg bg-muted/40 p-3 text-sm">
                  {d.ajustes.map((a, i) => (
                    <li key={a.id ?? `v${i}`} className="flex items-start gap-2">
                      <span className="flex-1">{a.justificativa}</span>
                      <span className="valor-sensivel whitespace-nowrap tabular-nums">{formatBRL(a.valor)}</span>
                      {editavel && a.id != null && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="-my-1 h-7 w-7"
                          aria-label={`Remover ajuste: ${a.justificativa}`}
                          disabled={pendente}
                          onClick={() => {
                            const ajusteId = a.id;
                            if (ajusteId != null) executar(() => removerAjusteFechamento(ajusteId), "Ajuste removido.");
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-baseline justify-between gap-3 border-t pt-3">
                <span className="font-semibold">A pagar em {ddmm(d.vencimentoPix)}</span>
                <span className="text-3xl font-bold tabular-nums text-success-text">
                  <span className="valor-sensivel">{formatBRL(d.totalFinal)}</span>
                </span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Ao enviar, o RH recebe o PDF e a planilha desta versão. O Pix copia-e-cola entra quando a cobrança pelo
                Asaas for ligada. Corrigir depois gera a versão seguinte.
              </p>
            </section>
          </Card>

          {d.versoes.length > 0 && (
            <Card className="p-5">
              <section aria-labelledby="fechamento-versoes" id="historico" className="flex flex-col gap-3">
                <h2 id="fechamento-versoes" className="text-base font-semibold">
                  Versões
                </h2>
                <ul className="flex flex-col divide-y text-sm">
                  {d.versoes.map((v) => (
                    <li key={v.numero} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 first:pt-0 last:pb-0">
                      <span className="font-semibold">v{v.numero}</span>
                      <span className="text-muted-foreground">
                        conferida {dataHora(v.criadaEm)}
                        {v.enviadaEm ? ` · enviada ${dataHora(v.enviadaEm)}` : ""}
                      </span>
                      <span className="valor-sensivel ml-auto tabular-nums">{formatBRL(v.totalFinal)}</span>
                      <span className="flex gap-1">
                        {v.pdfArquivoId != null && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a
                              href={`/api/arquivos/${v.pdfArquivoId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`PDF da versão ${v.numero}`}
                            >
                              <FileText className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {v.xlsxArquivoId != null && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={`/api/arquivos/${v.xlsxArquivoId}`} aria-label={`Planilha da versão ${v.numero}`}>
                              <FileSpreadsheet className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </Card>
          )}
        </div>
      </div>

      <DialogoAjuste
        aberto={ajusteAberto}
        fechamentoId={d.id}
        onClose={() => setAjusteAberto(false)}
      />

      <AlertDialog open={confirmacao !== null} onOpenChange={(aberto) => !aberto && setConfirmacao(null)}>
        <AlertDialogContent>
          {confirmacao === "enviar" ? (
            <AlertDialogHeader>
              <AlertDialogTitle>Enviar a versão {d.versaoAtual} ao RH?</AlertDialogTitle>
              <AlertDialogDescription>
                {d.empresa.emailRh
                  ? `Vai para ${d.empresa.emailRh}, com o PDF e a planilha. Valor final ${formatBRL(versaoAtual?.totalFinal ?? d.totalFinal)}, Pix vence em ${dataIso(d.vencimentoPix)}.`
                  : "A empresa não tem e-mail do RH cadastrado: cadastre em Cadastros › Empresas antes de enviar."}
              </AlertDialogDescription>
            </AlertDialogHeader>
          ) : (
            <AlertDialogHeader>
              <AlertDialogTitle>Reabrir para corrigir?</AlertDialogTitle>
              <AlertDialogDescription>
                {enviadas.some((v) => v.numero === d.versaoAtual)
                  ? `O RH já recebeu a versão ${d.versaoAtual}. Ela continua no histórico; depois de corrigir, confira e envie a versão ${d.versaoAtual + 1}.`
                  : `A versão ${d.versaoAtual} continua no histórico; a próxima conferência gera a versão ${d.versaoAtual + 1}.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendente}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={pendente || (confirmacao === "enviar" && !d.empresa.emailRh)}
              onClick={(ev) => {
                ev.preventDefault();
                if (confirmacao === "enviar") {
                  executar(
                    () => enviarFechamentoAction(d.id, d.versaoAtual),
                    `Demonstrativo enviado a ${d.empresa.emailRh}.`,
                    () => setConfirmacao(null)
                  );
                } else {
                  executar(() => reabrirFechamentoAction(d.id), "Fechamento reaberto.", () => setConfirmacao(null));
                }
              }}
            >
              {confirmacao === "enviar" ? "Enviar ao RH" : "Reabrir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DialogoAjuste({ aberto, fechamentoId, onClose }: { aberto: boolean; fechamentoId: number; onClose: () => void }) {
  const router = useRouter();
  const [valor, setValor] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const fechar = () => {
    setValor("");
    setJustificativa("");
    setErro(null);
    onClose();
  };

  const salvar = (ev: React.FormEvent) => {
    ev.preventDefault();
    const v = validarAjuste(valor, justificativa);
    if (!v.ok) {
      setErro(v.erro);
      return;
    }
    setErro(null);
    iniciar(async () => {
      const r = await chamar(() => adicionarAjusteFechamento(fechamentoId, valor, justificativa));
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      toast.success("Ajuste adicionado.");
      fechar();
      router.refresh();
    });
  };

  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && fechar()}>
      <DialogContent>
        <form onSubmit={salvar} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Adicionar ajuste</DialogTitle>
            <DialogDescription>
              Entra no valor do Pix com a justificativa. Use valor negativo para desconto (ex.: -50,00).
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ajuste-valor">Valor</Label>
            <Input
              id="ajuste-valor"
              inputMode="decimal"
              autoComplete="off"
              placeholder="-50,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              aria-describedby={erro ? "ajuste-erro" : undefined}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ajuste-justificativa">Justificativa</Label>
            <Textarea
              id="ajuste-justificativa"
              rows={3}
              maxLength={500}
              placeholder="Ex.: desconto combinado com o RH na parcela de outubro"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              aria-describedby={erro ? "ajuste-erro" : undefined}
            />
          </div>
          {erro && (
            <p id="ajuste-erro" role="alert" className="text-sm text-error-text">
              {erro}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={fechar} disabled={pendente}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pendente}>
              Adicionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SeloPrudent({ antecipada, loteId }: { antecipada: boolean; loteId: number | null }) {
  return antecipada ? (
    <Badge variant="info" className="whitespace-nowrap">
      {loteId != null ? `lote ${loteId} · boleto à BFX` : "boleto à BFX"}
    </Badge>
  ) : (
    <Badge variant="outline" className="whitespace-nowrap text-muted-foreground">
      fica com a BFX
    </Badge>
  );
}
