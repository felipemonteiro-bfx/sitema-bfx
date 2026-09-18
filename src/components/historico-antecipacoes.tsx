'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { History, FileSpreadsheet, ImageIcon, Check, Loader2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DateInput } from '@/components/ui/date-input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatBRL } from '@/lib/utils';
import { formatarDataPura } from '@/lib/data-pura';
import { ROTULO_STATUS_LOTE, STATUS_LOTE } from '@/lib/lote-antecipacao';
import { cancelarLoteAction, concluirLoteAction } from '@/app/(app)/prudent/actions';

interface Batch {
  id: number;
  criadaEm: Date | string;
  vendaIds: string;
  valorTotal: number;
  quantidadeVendas: number;
  periodoDescricao: string | null;
  periodoInicio: Date | string | null;
  periodoFim: Date | string | null;
  /** Ciclo do lote (2026-09-17). */
  status: string;
  origem: string;
  concluidaEm: Date | string | null;
  concluidaPor: string | null;
}

interface GrupoSemLote {
  data: string;
  quantidadeVendas: number;
  valorTotal: number;
  vendas: { id: number; clienteNome: string | null; empresa: string | null; produtos: string; valorTotal: number; parcelas: number }[];
}

interface Props {
  batches: Batch[];
  /**
   * Antecipacoes que existem sem lote: venda com `antecipada = 1` que nao veio
   * da fila da Prudent (importacao ou marcacao manual). Sem isto o card dizia
   * "Nenhuma antecipacao realizada ainda" ao lado de 26 vendas marcadas como
   * "Antecipado" — verdadeiro sobre lotes, enganoso para quem le.
   */
  semLote?: GrupoSemLote[];
  /** Dia civil de Manaus, para a data do retorno já vir preenchida. */
  hoje: string;
}

/** Cor do selo por status, nos tokens do design system. */
const ESTILO_STATUS: Record<string, string> = {
  [STATUS_LOTE.emAndamento]: 'bg-info-bg text-info-text',
  [STATUS_LOTE.concluido]: 'bg-success-bg text-success-text',
  [STATUS_LOTE.cancelado]: 'bg-muted text-muted-foreground',
};

export default function HistoricoAntecipacoes({ batches, semLote = [], hoje }: Props) {
  const router = useRouter();
  const [concluindo, setConcluindo] = useState<Batch | null>(null);
  const [cancelando, setCancelando] = useState<Batch | null>(null);
  const [dataRetorno, setDataRetorno] = useState(hoje);
  const [salvando, setSalvando] = useState(false);

  const concluir = async () => {
    if (!concluindo) return;
    setSalvando(true);
    try {
      const r = await concluirLoteAction({ loteId: concluindo.id, dataRetorno });
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      toast.success(`Lote #${concluindo.id} concluído: ${r.parcelas} parcelas, ${formatBRL(r.valor)}.`);
      setConcluindo(null);
      router.refresh();
    } catch {
      toast.error('Não foi possível concluir o lote.');
    } finally {
      setSalvando(false);
    }
  };

  const cancelar = async () => {
    if (!cancelando) return;
    setSalvando(true);
    try {
      const r = await cancelarLoteAction({ loteId: cancelando.id });
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      toast.success(`Lote #${cancelando.id} cancelado: ${r.parcelas} parcelas voltaram para a fila.`);
      setCancelando(null);
      router.refresh();
    } catch {
      toast.error('Não foi possível cancelar o lote.');
    } finally {
      setSalvando(false);
    }
  };
  const vazio = batches.length === 0 && semLote.length === 0;
  const totalSemLote = semLote.reduce((s, g) => s + g.quantidadeVendas, 0);
  const formatData = (d: Date | string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  /**
   * Reemitir o relatorio de um lote JA gravado precisa do recorte oposto ao da fila:
   * as parcelas do lote estao com `antecipada = true`. Sem `incluirAntecipadas` as
   * rotas devolveriam planilha sem nenhuma aba e PDF zerado.
   */
  const paramsDoLote = (b: Batch) => {
    const params = new URLSearchParams({
      ids: JSON.parse(b.vendaIds).join(','),
      incluirAntecipadas: '1',
    });
    const mesAno = (d: Date | string | null) => {
      if (!d) return null;
      const data = new Date(d);
      if (Number.isNaN(data.getTime())) return null;
      return `${String(data.getUTCMonth() + 1).padStart(2, '0')}/${data.getUTCFullYear()}`;
    };
    const inicio = mesAno(b.periodoInicio);
    const fim = mesAno(b.periodoFim);
    if (inicio && fim) {
      params.set('mesInicio', inicio);
      params.set('mesFim', fim);
    }
    return params.toString();
  };

  const handleExcel = (b: Batch) => {
    window.location.assign(`/api/relatorios/antecipacao-xlsx?${paramsDoLote(b)}`);
  };

  const handleRelatorio = (b: Batch) => {
    window.open(`/api/relatorios/antecipacao-imagem?${paramsDoLote(b)}`, '_blank');
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <History className="h-5 w-5 text-primary" />
          </div>
          Histórico de Antecipações
        </CardTitle>
      </CardHeader>
      <CardContent>
        {vazio ? (
          <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma antecipação realizada ainda.</p>
        ) : (
          <div className="space-y-3">
            {batches.map((b) => (
              <div key={b.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">#{b.id}</span>
                    <span className="text-xs text-muted-foreground">{formatData(b.criadaEm)}</span>
                  </div>
                  {b.periodoDescricao && (
                    <span className="text-sm font-semibold text-foreground">Período: {b.periodoDescricao}</span>
                  )}
                  <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>{b.quantidadeVendas} {b.quantidadeVendas === 1 ? 'venda' : 'vendas'}</span>
                    <span className="font-bold text-success-text text-sm">{formatBRL(b.valorTotal)}</span>
                  </div>
                  {b.concluidaEm && b.status === STATUS_LOTE.concluido && (
                    <span className="text-xs text-muted-foreground">
                      Retorno confirmado em {formatarDataPura(b.concluidaEm)}
                      {b.concluidaPor ? ` por ${b.concluidaPor}` : ''}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${ESTILO_STATUS[b.status] ?? 'bg-muted text-muted-foreground'}`}>
                    {ROTULO_STATUS_LOTE[b.status as keyof typeof ROTULO_STATUS_LOTE] ?? b.status}
                  </span>
                  {b.status === STATUS_LOTE.emAndamento && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => {
                          setDataRetorno(hoje);
                          setConcluindo(b);
                        }}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Marcar como concluída
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs border-error text-error-text"
                        onClick={() => setCancelando(b)}
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancelar lote
                      </Button>
                    </>
                  )}
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleExcel(b)}>
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    Planilha
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleRelatorio(b)}>
                    <ImageIcon className="h-3.5 w-3.5" />
                    Relatório Visual
                  </Button>
                </div>
              </div>
            ))}

            {semLote.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Antecipadas sem lote
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {totalSemLote} {totalSemLote === 1 ? "venda" : "vendas"}
                  </span>
                </div>
                {/* Estas vendas estao com `antecipada = 1` mas nao vieram da fila
                    da Prudent, entao nao existe lote para reemitir relatorio —
                    por isso este bloco nao tem os botoes de Planilha e Relatorio. */}
                <p className="text-xs text-muted-foreground mb-2">
                  Marcadas como antecipadas fora da fila (importação ou ajuste manual). Não têm lote, então não geram relatório.
                </p>
                <div className="space-y-2">
                  {semLote.map((g) => (
                    <div key={g.data} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-foreground">{formatarDataPura(g.data)}</span>
                        <span className="text-xs text-muted-foreground">
                          {g.vendas.map((v) => v.clienteNome).filter(Boolean).slice(0, 3).join(", ")}
                          {g.vendas.length > 3 ? ` e mais ${g.vendas.length - 3}` : ""}
                        </span>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>{g.quantidadeVendas} {g.quantidadeVendas === 1 ? "venda" : "vendas"}</span>
                        <span className="font-bold text-success-text text-sm tabular-nums">{formatBRL(g.valorTotal)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={concluindo !== null} onOpenChange={(aberto) => !aberto && setConcluindo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Concluir a antecipação do lote #{concluindo?.id}</DialogTitle>
            <DialogDescription>
              As parcelas do lote passam a contar como antecipadas e quitadas pela Prudent. A folha continua descontando
              delas até o vencimento.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="data-retorno-lote">Data do retorno</Label>
            <DateInput id="data-retorno-lote" value={dataRetorno} onChange={setDataRetorno} max={hoje} />
          </div>
          <p className="rounded-lg bg-info-bg px-3 py-2 text-sm text-info-text">
            Recebeu só uma parte? Conclua o lote e depois desfaça a baixa das parcelas que não vieram, na ficha da venda.
          </p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setConcluindo(null)} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="button" className="gap-2" onClick={concluir} disabled={salvando || !dataRetorno}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" />}
              Confirmar conclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelando !== null} onOpenChange={(aberto) => !aberto && setCancelando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar o lote #{cancelando?.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              As {cancelando?.quantidadeVendas ?? 0} vendas voltam para a fila e podem entrar em outro lote. O lote fica
              no histórico como cancelado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={salvando}>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={cancelar} disabled={salvando}>
              Cancelar lote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
