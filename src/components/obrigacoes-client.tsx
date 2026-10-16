"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, MoreHorizontal, ReceiptText } from "lucide-react";
import { QueryTabs } from "@/components/query-tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/ui/date-input";
import { CurrencyInput } from "@/components/currency-input";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatBRL } from "@/lib/utils";
import { decodificarLinhaDigitavel } from "@/lib/linha-digitavel";
import { divergencia } from "@/lib/boleto-prudent";
import { arquivoGrandeDemais } from "@/lib/arquivo-limite";
import type { AbaBoleto, TomSituacao } from "@/lib/obrigacoes-agenda";
import {
  anexarDocumentoBoleto,
  cancelarBoleto,
  estornarPagamentoBoleto,
  registrarPagamentoBoleto,
  substituirBoleto,
} from "@/app/(app)/obrigacoes/actions";

export type LinhaBoleto = {
  id: number;
  loteId: number;
  empresa: string;
  /** Vencimento que vale para pagar (o do documento, quando lido), "YYYY-MM-DD". */
  vence: string;
  vencimentoContratual: string;
  parcelas: number;
  esperado: number;
  noBoleto: number | null;
  diverge: boolean;
  divergenciaJustificativa: string | null;
  linhaDigitavel: string | null;
  pdfArquivoId: number | null;
  direcionamento: string;
  status: string;
  substituiId: number | null;
  aba: AbaBoleto;
  situacao: { rotulo: string; tom: TomSituacao };
  saldo: number;
  pagamentos: {
    id: number;
    data: string;
    principal: number;
    encargos: number;
    comprovanteArquivoId: number | null;
    autenticacao: string | null;
    estornado: boolean;
  }[];
};

const VARIANTE: Record<TomSituacao, "warning" | "error" | "info" | "success" | "outline"> = {
  warning: "warning",
  neutro: "outline",
  error: "error",
  info: "info",
  success: "success",
  muted: "outline",
};

const ddmm = (s: string) => s.slice(5).split("-").reverse().join("/");
const dataPura = (s: string) => new Date(`${s}T00:00:00.000Z`);
const vivo = (l: LinhaBoleto) => l.status !== "substituido" && l.status !== "cancelado";
const daBfx = (l: LinhaBoleto) => l.direcionamento === "bfx";

/** Falha de rede ou corpo recusado pelo Next (arquivo grande demais) não chega como `erro`. */
const ERRO_ENVIO = "Não foi possível enviar. Confira a conexão e o tamanho do arquivo (até 10 MB).";

/** Confere o tamanho antes de enviar e chama a action; erro de rede vira toast, não tela quebrada. */
async function enviarComArquivo(
  fd: FormData,
  action: (fd: FormData) => Promise<{ ok: true } | { ok: false; erro: string }>
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const grande = arquivoGrandeDemais(fd);
  if (grande) return { ok: false, erro: grande };
  try {
    return await action(fd);
  } catch {
    return { ok: false, erro: ERRO_ENVIO };
  }
}

type Dialogo =
  | { tipo: "anexar"; linha: LinhaBoleto }
  | { tipo: "substituir"; linha: LinhaBoleto }
  | { tipo: "pagar"; linha: LinhaBoleto }
  | { tipo: "estornar"; linha: LinhaBoleto; pagamentoId: number }
  | { tipo: "cancelar"; linha: LinhaBoleto }
  | null;

export default function ObrigacoesClient({ linhas, hoje }: { linhas: LinhaBoleto[]; hoje: string }) {
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const contagem = useMemo(() => {
    const c = { a_pagar: 0, sem_boleto: 0, pagos: 0 };
    for (const l of linhas) if (l.aba !== "historico") c[l.aba]++;
    return c;
  }, [linhas]);

  const tabela = (filtro: (l: LinhaBoleto) => boolean, vazio: string) => {
    const lista = linhas.filter(filtro);
    if (linhas.length === 0) {
      return (
        <EmptyState
          size="sm"
          icon={ReceiptText}
          title="Nenhum boleto da Prudent ainda"
          description="Eles aparecem aqui quando um lote é concluído."
        />
      );
    }
    if (lista.length === 0) return <p className="px-4 py-8 text-center text-sm text-muted-foreground">{vazio}</p>;
    return <TabelaBoletos linhas={lista} onAcao={setDialogo} />;
  };

  return (
    <Card className="overflow-hidden p-2 pt-5">
      <section aria-labelledby="obrigacoes-boletos">
        <div className="flex flex-wrap items-center gap-3 px-4 pb-4">
          <h2 id="obrigacoes-boletos" className="text-lg font-semibold text-foreground">
            Boletos Prudent
          </h2>
        </div>
        <div className="px-0 pb-0">
          <QueryTabs
            param="aba"
            defaultTab="a_pagar"
            tabs={[
              {
                value: "a_pagar",
                label: `A pagar ${contagem.a_pagar}`,
                content: tabela((l) => l.aba === "a_pagar", "Nenhum boleto a pagar."),
              },
              {
                value: "sem_boleto",
                label: `Sem boleto ${contagem.sem_boleto}`,
                content: tabela((l) => l.aba === "sem_boleto", "Todo boleto esperado já tem documento."),
              },
              {
                value: "pagos",
                label: "Pagos",
                content: tabela((l) => l.aba === "pagos", "Nenhum boleto pago ainda."),
              },
              { value: "todos", label: "Todos", content: tabela(() => true, "") },
            ]}
          />
        </div>
      </section>

      {dialogo && (dialogo.tipo === "anexar" || dialogo.tipo === "substituir") && (
        <DialogoDocumento
          key={`${dialogo.tipo}-${dialogo.linha.id}`}
          linha={dialogo.linha}
          substituir={dialogo.tipo === "substituir"}
          onClose={() => setDialogo(null)}
        />
      )}
      {dialogo?.tipo === "pagar" && (
        <DialogoPagamento key={dialogo.linha.id} linha={dialogo.linha} hoje={hoje} onClose={() => setDialogo(null)} />
      )}
      {dialogo?.tipo === "estornar" && (
        <DialogoEstorno linha={dialogo.linha} pagamentoId={dialogo.pagamentoId} onClose={() => setDialogo(null)} />
      )}
      {dialogo?.tipo === "cancelar" && (
        <DialogoCancelar key={dialogo.linha.id} linha={dialogo.linha} onClose={() => setDialogo(null)} />
      )}
    </Card>
  );
}

function TabelaBoletos({ linhas, onAcao }: { linhas: LinhaBoleto[]; onAcao: (d: Dialogo) => void }) {
  return (
    <div className="overflow-x-auto rounded-interno bg-poco">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Vence</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Lote</TableHead>
            <TableHead className="text-right">Parcelas</TableHead>
            <TableHead className="text-right">Esperado</TableHead>
            <TableHead className="text-right">No boleto</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead className="pr-4 text-right">
              <span className="sr-only">Ação</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((l) => (
            <LinhaTabela key={l.id} linha={l} onAcao={onAcao} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function LinhaTabela({ linha: l, onAcao }: { linha: LinhaBoleto; onAcao: (d: Dialogo) => void }) {
  const pagamentosVivos = l.pagamentos.filter((p) => !p.estornado);
  const comprovante = pagamentosVivos.find((p) => p.comprovanteArquivoId)?.comprovanteArquivoId ?? null;
  const podeAnexar = vivo(l) && l.status === "aguardando_documento";
  const podePagar = vivo(l) && daBfx(l) && (l.status === "a_pagar" || l.status === "pago_parcial");
  const podeSubstituir = vivo(l) && l.status !== "aguardando_documento" && pagamentosVivos.length === 0;
  // Cancelar: qualquer boleto vivo sem pagamento vivo (inclusive o que a empresa paga — lote
  // concluído por engano). A trava do fechamento conferido é do servidor.
  const podeCancelar = vivo(l) && pagamentosVivos.length === 0;
  const temMenu = (daBfx(l) && (l.pdfArquivoId != null || podeSubstituir || pagamentosVivos.length > 0)) || podeCancelar;

  return (
    <TableRow apagada={!vivo(l)}>
      <TableCell peso="forte" mono className="pl-4">{ddmm(l.vence)}</TableCell>
      <TableCell>{l.empresa}</TableCell>
      <TableCell mono>#{l.loteId}</TableCell>
      <TableCell numeric>{l.parcelas}</TableCell>
      <TableCell numeric>
        <span className="valor-sensivel">{formatBRL(l.esperado)}</span>
      </TableCell>
      <TableCell numeric peso={l.diverge ? "forte" : undefined} tom={l.diverge ? "erro" : undefined}>
        {l.noBoleto != null ? (
          <span className="valor-sensivel" title={l.divergenciaJustificativa ?? undefined}>
            {formatBRL(l.noBoleto)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <Badge
          variant={VARIANTE[l.situacao.tom]}
          className={`whitespace-nowrap ${l.situacao.tom === "muted" ? "text-muted-foreground" : ""}`}
        >
          {l.situacao.rotulo}
        </Badge>
        {l.substituiId != null && (
          <span className="ml-2 text-xs text-muted-foreground">substitui #{l.substituiId}</span>
        )}
      </TableCell>
      <TableCell className="pr-4">
        <div className="flex items-center justify-end gap-2">
          {daBfx(l) && podeAnexar && (
            <Button variant="outline" size="sm" onClick={() => onAcao({ tipo: "anexar", linha: l })}>
              Anexar boleto
            </Button>
          )}
          {podePagar && (
            <Button size="sm" onClick={() => onAcao({ tipo: "pagar", linha: l })}>
              Registrar pagamento
            </Button>
          )}
          {daBfx(l) && l.status === "pago" && comprovante != null && (
            <Button variant="link" size="sm" asChild>
              <a href={`/api/arquivos/${comprovante}`} target="_blank" rel="noopener noreferrer">
                comprovante
              </a>
            </Button>
          )}
          {temMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`Mais ações do boleto #${l.id}`}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {l.pdfArquivoId != null && (
                  <DropdownMenuItem asChild>
                    <a href={`/api/arquivos/${l.pdfArquivoId}`} target="_blank" rel="noopener noreferrer">
                      <FileText className="mr-2 h-4 w-4" />
                      Ver PDF do boleto
                    </a>
                  </DropdownMenuItem>
                )}
                {podeSubstituir && (
                  <DropdownMenuItem onSelect={() => onAcao({ tipo: "substituir", linha: l })}>
                    Substituir boleto
                  </DropdownMenuItem>
                )}
                {pagamentosVivos.length > 0 && <DropdownMenuSeparator />}
                {pagamentosVivos.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onSelect={() => onAcao({ tipo: "estornar", linha: l, pagamentoId: p.id })}
                  >
                    Estornar pagamento de {ddmm(p.data)}
                  </DropdownMenuItem>
                ))}
                {podeCancelar && (
                  <>
                    {(l.pdfArquivoId != null || podeSubstituir) && daBfx(l) && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      className="text-error-text focus:text-error-text"
                      onSelect={() => onAcao({ tipo: "cancelar", linha: l })}
                    >
                      Cancelar boleto
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

/** Mostra o que a linha digitável diz antes de salvar, e a divergência contra o esperado. */
function useLeituraDaLinha(linhaTxt: string, esperado: { valor: number; vencimento: string }) {
  return useMemo(() => {
    const digitos = linhaTxt.replace(/\D/g, "");
    if (!digitos) return { estado: "vazia" as const };
    const r = decodificarLinhaDigitavel(digitos, dataPura(esperado.vencimento));
    if (!r.ok) return { estado: "erro" as const, erro: r.erro };
    const venc = r.vencimento ? r.vencimento.toISOString().slice(0, 10) : null;
    const div = divergencia(
      { valorEsperado: esperado.valor, vencimento: dataPura(esperado.vencimento) },
      { valor: r.valor, vencimento: r.vencimento }
    );
    return { estado: "ok" as const, valor: r.valor, vencimento: venc, div, completa: r.valor != null && venc != null };
  }, [linhaTxt, esperado.valor, esperado.vencimento]);
}

function DialogoDocumento({ linha, substituir, onClose }: { linha: LinhaBoleto; substituir: boolean; onClose: () => void }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [linhaTxt, setLinhaTxt] = useState("");
  const [valorManual, setValorManual] = useState(0);
  const [vencimentoManual, setVencimentoManual] = useState("");
  const leitura = useLeituraDaLinha(linhaTxt, { valor: linha.esperado, vencimento: linha.vencimentoContratual });

  const precisaManual = leitura.estado !== "ok" || !leitura.completa;
  const valorFinal = leitura.estado === "ok" && leitura.valor != null ? leitura.valor : valorManual || null;
  const vencFinal = leitura.estado === "ok" && leitura.vencimento ? leitura.vencimento : vencimentoManual || null;
  const div = divergencia(
    { valorEsperado: linha.esperado, vencimento: dataPura(linha.vencimentoContratual) },
    { valor: valorFinal, vencimento: vencFinal ? dataPura(vencFinal) : null }
  );
  const diverge = div.valor || div.vencimento;

  const enviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("boletoId", String(linha.id));
    iniciar(async () => {
      const r = await enviarComArquivo(fd, substituir ? substituirBoleto : anexarDocumentoBoleto);
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      toast.success(substituir ? `Boleto #${linha.id} substituído.` : `Boleto #${linha.id} anexado.`);
      onClose();
      router.refresh();
    });
  };

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !pendente && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{substituir ? "Substituir boleto" : "Anexar boleto"}</DialogTitle>
          <DialogDescription>
            {linha.empresa} · lote #{linha.loteId} · esperado{" "}
            <span className="valor-sensivel">{formatBRL(linha.esperado)}</span> em {ddmm(linha.vencimentoContratual)}
            {substituir ? ". O boleto atual fica no histórico como substituído." : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="boleto-pdf">PDF do boleto</Label>
            <Input id="boleto-pdf" type="file" name="pdf" accept="application/pdf,.pdf" className="h-10 px-2 pt-1.5" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="boleto-linha">Linha digitável ou código de barras</Label>
            <Input
              id="boleto-linha"
              name="linhaDigitavel"
              inputMode="numeric"
              autoComplete="off"
              value={linhaTxt}
              onChange={(e) => setLinhaTxt(e.target.value)}
              aria-describedby="boleto-linha-leitura"
            />
            <p id="boleto-linha-leitura" className="text-sm" aria-live="polite">
              {leitura.estado === "erro" && <span className="text-error-text">{leitura.erro}</span>}
              {leitura.estado === "ok" && (
                <span className="text-muted-foreground">
                  {leitura.valor != null ? (
                    <span className={div.valor ? "font-semibold text-error-text" : "text-foreground"}>
                      <span className="valor-sensivel">{formatBRL(leitura.valor)}</span>
                    </span>
                  ) : (
                    "sem valor na linha"
                  )}
                  {" · "}
                  {leitura.vencimento ? (
                    <span className={div.vencimento ? "font-semibold text-error-text" : "text-foreground"}>
                      vence {ddmm(leitura.vencimento)}
                    </span>
                  ) : (
                    "sem vencimento na linha"
                  )}
                </span>
              )}
            </p>
          </div>

          {precisaManual && (
            <div className="grid gap-4 sm:grid-cols-2">
              <p className="text-sm text-muted-foreground sm:col-span-2">
                {leitura.estado === "vazia"
                  ? "Sem a linha, informe o valor e o vencimento que estão no boleto."
                  : "Informe à mão o que a linha não trouxe, conferindo no PDF."}
              </p>
              <div className="space-y-2">
                <Label htmlFor="boleto-valor">Valor do boleto</Label>
                <CurrencyInput id="boleto-valor" name="valorManual" value={valorManual} onChange={setValorManual} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="boleto-vencimento">Vencimento</Label>
                <DateInput
                  id="boleto-vencimento"
                  name="vencimentoManual"
                  value={vencimentoManual}
                  onChange={setVencimentoManual}
                />
              </div>
            </div>
          )}

          {diverge && (
            <div className="space-y-2">
              <Label htmlFor="boleto-justificativa">
                Justificativa da diferença ({[div.valor && "valor", div.vencimento && "vencimento"].filter(Boolean).join(" e ")})
              </Label>
              <Textarea
                id="boleto-justificativa"
                name="justificativa"
                required
                minLength={5}
                rows={2}
                placeholder="Ex.: a Prudent incluiu juros de reemissão"
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pendente}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pendente}>
              {pendente ? "Salvando…" : substituir ? "Substituir" : "Anexar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DialogoPagamento({ linha, hoje, onClose }: { linha: LinhaBoleto; hoje: string; onClose: () => void }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [data, setData] = useState(hoje);
  const [principal, setPrincipal] = useState(linha.saldo);
  const [encargos, setEncargos] = useState(0);

  const enviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("boletoId", String(linha.id));
    iniciar(async () => {
      const r = await enviarComArquivo(fd, registrarPagamentoBoleto);
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      toast.success(`Pagamento do boleto #${linha.id} registrado.`);
      onClose();
      router.refresh();
    });
  };

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !pendente && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar pagamento</DialogTitle>
          <DialogDescription>
            {linha.empresa} · lote #{linha.loteId} · falta pagar{" "}
            <span className="valor-sensivel">{formatBRL(linha.saldo)}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pagamento-data">Data do pagamento</Label>
              <DateInput id="pagamento-data" name="dataPagamento" value={data} onChange={setData} max={hoje} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pagamento-principal">Principal</Label>
              <CurrencyInput id="pagamento-principal" name="valorPrincipal" value={principal} onChange={setPrincipal} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pagamento-encargos">Juros, multa ou diferença</Label>
              <CurrencyInput id="pagamento-encargos" name="valorEncargos" value={encargos} onChange={setEncargos} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pagamento-autenticacao">Autenticação</Label>
              <Input id="pagamento-autenticacao" name="autenticacao" maxLength={200} autoComplete="off" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pagamento-comprovante">Comprovante (PDF, PNG ou JPG)</Label>
            <Input
              id="pagamento-comprovante"
              type="file"
              name="comprovante"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              className="h-10 px-2 pt-1.5"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pendente}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pendente || principal <= 0}>
              {pendente ? "Registrando…" : "Registrar pagamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DialogoEstorno({ linha, pagamentoId, onClose }: { linha: LinhaBoleto; pagamentoId: number; onClose: () => void }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const pagamento = linha.pagamentos.find((p) => p.id === pagamentoId);

  const confirmar = (e: React.MouseEvent) => {
    e.preventDefault();
    iniciar(async () => {
      let r: Awaited<ReturnType<typeof estornarPagamentoBoleto>>;
      try {
        r = await estornarPagamentoBoleto(pagamentoId);
      } catch {
        r = { ok: false, erro: "Não foi possível estornar. Confira a conexão e tente de novo." };
      }
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      toast.success("Pagamento estornado.");
      onClose();
      router.refresh();
    });
  };

  return (
    <AlertDialog open onOpenChange={(aberto) => !aberto && !pendente && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Estornar este pagamento?</AlertDialogTitle>
          <AlertDialogDescription>
            {pagamento ? (
              <>
                Pagamento de <span className="valor-sensivel">{formatBRL(pagamento.principal)}</span> em{" "}
                {ddmm(pagamento.data)}, boleto #{linha.id}.{" "}
              </>
            ) : null}
            O registro fica no histórico como estornado e o boleto volta a ter saldo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pendente}>Voltar</AlertDialogCancel>
          <AlertDialogAction onClick={confirmar} disabled={pendente}>
            {pendente ? "Estornando…" : "Estornar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DialogoCancelar({ linha, onClose }: { linha: LinhaBoleto; onClose: () => void }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [motivo, setMotivo] = useState("");
  const motivoOk = motivo.trim().length >= 5;

  const confirmar = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!motivoOk) return;
    iniciar(async () => {
      let r: Awaited<ReturnType<typeof cancelarBoleto>>;
      try {
        r = await cancelarBoleto(linha.id, motivo);
      } catch {
        r = { ok: false, erro: "Não foi possível cancelar. Confira a conexão e tente de novo." };
      }
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      toast.success(`Boleto #${linha.id} cancelado.`);
      onClose();
      router.refresh();
    });
  };

  return (
    <AlertDialog open onOpenChange={(aberto) => !aberto && !pendente && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar o boleto #{linha.id}?</AlertDialogTitle>
          <AlertDialogDescription>
            Use quando a Prudent cancelou o boleto ou o lote #{linha.loteId} foi concluído por engano. O boleto fica no
            histórico como cancelado e as {linha.parcelas} parcelas ficam sem boleto. Depois disso, a antecipação delas pode
            ser desfeita pela baixa da parcela, na ficha da venda.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor={`motivo-cancelar-${linha.id}`}>Motivo</Label>
          <Textarea
            id={`motivo-cancelar-${linha.id}`}
            value={motivo}
            onChange={(ev) => setMotivo(ev.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Ex.: lote concluído por engano; a Prudent não antecipou."
          />
          <p className="text-xs text-muted-foreground">Pelo menos 5 caracteres. Fica no registro de auditoria.</p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pendente}>Voltar</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmar}
            disabled={pendente || !motivoOk}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {pendente ? "Cancelando…" : "Cancelar boleto"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
