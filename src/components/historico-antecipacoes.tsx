'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { History, FileSpreadsheet, ImageIcon, Check, Info, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DateInput } from '@/components/ui/date-input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/currency-input';
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
  chave?: string;
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
  /** Líquido calculado no envio (2026-09-30); nulo em lote anterior à Fase 3. */
  valorLiquidoSolicitado?: number | null;
  vendas: { id: number; clienteNome: string | null; empresa: string | null; produtos: string; valorTotal: number; parcelas: number }[];
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

/** Variante do Badge por status do lote: o estado mora no selo, não no card. */
const VARIANTE_STATUS: Record<string, 'info' | 'success' | 'outline'> = {
  [STATUS_LOTE.emAndamento]: 'info',
  [STATUS_LOTE.concluido]: 'success',
  [STATUS_LOTE.cancelado]: 'outline',
};

export default function HistoricoAntecipacoes({ batches, semLote = [], hoje }: Props) {
  const router = useRouter();
  const [concluindo, setConcluindo] = useState<Batch | null>(null);
  const [cancelando, setCancelando] = useState<Batch | null>(null);
  const [dataRetorno, setDataRetorno] = useState(hoje);
  // Retorno da Prudent (2026-09-30): opcionais; 0 no campo = não informado.
  const [valorAprovado, setValorAprovado] = useState(0);
  const [valorDepositado, setValorDepositado] = useState(0);
  const [dataDeposito, setDataDeposito] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [paginaSemLote, setPaginaSemLote] = useState(1);
  const lotesPorPagina = 5;
  const semLotePorPagina = 10;
  const totalPaginas = Math.max(1, Math.ceil(batches.length / lotesPorPagina));
  const totalPaginasSemLote = Math.max(1, Math.ceil(semLote.length / semLotePorPagina));
  const inicioPagina = (pagina - 1) * lotesPorPagina;
  const batchesPagina = batches.slice(inicioPagina, inicioPagina + lotesPorPagina);
  const inicioPaginaSemLote = (paginaSemLote - 1) * semLotePorPagina;
  const semLotePagina = semLote.slice(inicioPaginaSemLote, inicioPaginaSemLote + semLotePorPagina);

  useEffect(() => {
    setPagina((atual) => Math.min(atual, totalPaginas));
  }, [totalPaginas]);

  useEffect(() => {
    setPaginaSemLote((atual) => Math.min(atual, totalPaginasSemLote));
  }, [totalPaginasSemLote]);

  const concluir = async () => {
    if (!concluindo) return;
    setSalvando(true);
    try {
      const r = await concluirLoteAction({
        loteId: concluindo.id,
        dataRetorno,
        valorAprovado: valorAprovado > 0 ? valorAprovado : null,
        valorDepositado: valorDepositado > 0 ? valorDepositado : null,
        dataDeposito: dataDeposito || null,
      });
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      // JSX pelo mesmo motivo do registro: o toast sai num portal e leva o valor.
      toast.success(
        <span>
          Lote #{concluindo.id} concluído: {r.parcelas} parcelas,{' '}
          <span className="valor-sensivel">{formatBRL(r.valor)}</span>.
        </span>
      );
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
    <Card className="p-2 pt-5">
      <CardHeader className="p-0 px-4 pb-4">
        <CardTitle variant="secao" className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Histórico de Antecipações
        </CardTitle>
      </CardHeader>
      <CardContent variant="poco" className="p-4">
        {vazio ? (
          <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma antecipação realizada ainda.</p>
        ) : (
          <div className="space-y-3">
            {batchesPagina.map((b) => (
              <details key={b.chave ?? b.id} className="group rounded-interno bg-card">
                <summary className="flex cursor-pointer list-none flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between [&::-webkit-details-marker]:hidden">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
                    <span className="font-mono text-xs font-medium text-muted-foreground">#{b.id}</span>
                    <span className="text-xs text-muted-foreground">{formatData(b.criadaEm)}</span>
                  </div>
                  {b.periodoDescricao && (
                    <span className="text-sm font-semibold text-foreground">Período: {b.periodoDescricao}</span>
                  )}
                  <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>{b.quantidadeVendas} {b.quantidadeVendas === 1 ? 'venda' : 'vendas'}</span>
                    <span className="font-mono text-sm font-medium text-foreground valor-sensivel">{formatBRL(b.valorTotal)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Empresa: {[...new Set(b.vendas.map((v) => v.empresa || 'Sem empresa'))].join(', ') || 'não identificada'}
                  </span>
                  {b.concluidaEm && b.status === STATUS_LOTE.concluido && (
                    <span className="text-xs text-muted-foreground">
                      Retorno confirmado em {formatarDataPura(b.concluidaEm)}
                      {b.concluidaPor ? ` por ${b.concluidaPor}` : ''}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                  <Badge variant={VARIANTE_STATUS[b.status] ?? 'outline'}>
                    {ROTULO_STATUS_LOTE[b.status as keyof typeof ROTULO_STATUS_LOTE] ?? b.status}
                  </Badge>
                  {b.status === STATUS_LOTE.emAndamento && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        className="gap-1.5"
                        onClick={(e) => {
                          e.preventDefault();
                          setDataRetorno(hoje);
                          setValorAprovado(0);
                          setValorDepositado(0);
                          setDataDeposito('');
                          setConcluindo(b);
                        }}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Marcar como concluída
                      </Button>
                      <Button
                        type="button"
                        variant="outlineErro"
                        size="sm"
                        className="gap-1.5"
                        onClick={(e) => { e.preventDefault(); setCancelando(b); }}
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancelar lote
                      </Button>
                    </>
                  )}
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={(e) => { e.preventDefault(); handleExcel(b); }}>
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    Planilha
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={(e) => { e.preventDefault(); handleRelatorio(b); }}>
                    <ImageIcon className="h-3.5 w-3.5" />
                    Relatório Visual
                  </Button>
                </div>
                </summary>
                <div className="border-t border-divisoria px-4 pb-4 pt-3">
                  <div className="mb-2 text-sm font-medium text-muted-foreground">Detalhamento do lote</div>
                  <div className="space-y-2">
                    {b.vendas.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Não foi possível localizar as vendas deste lote.</p>
                    ) : b.vendas.map((v) => (
                      <div key={v.id} className="grid gap-1 rounded-controle bg-poco px-3 py-2 text-xs sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:items-center sm:gap-3">
                        <span className="font-medium text-muted-foreground">Venda #{v.id}</span>
                        <span className="min-w-0 truncate text-foreground" title={v.produtos}>{v.clienteNome || 'Cliente sem nome'} · {v.produtos}</span>
                        <span className="text-muted-foreground">{v.parcelas} {v.parcelas === 1 ? 'parcela' : 'parcelas'}</span>
                        <span className="font-medium tabular-nums text-foreground valor-sensivel">{formatBRL(v.valorTotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            ))}

            {batches.length > lotesPorPagina && (
              <nav className="flex items-center justify-between border-t border-border pt-3" aria-label="Paginação do histórico de antecipações">
                <span className="text-xs text-muted-foreground">
                  Mostrando {inicioPagina + 1}–{Math.min(inicioPagina + lotesPorPagina, batches.length)} de {batches.length} lotes
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={pagina === 1}
                    onClick={() => setPagina((atual) => Math.max(1, atual - 1))}
                    aria-label="Página anterior do histórico"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <span className="min-w-20 text-center text-xs font-semibold tabular-nums text-foreground">
                    Página {pagina} de {totalPaginas}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={pagina === totalPaginas}
                    onClick={() => setPagina((atual) => Math.min(totalPaginas, atual + 1))}
                    aria-label="Próxima página do histórico"
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </nav>
            )}

            {semLote.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
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
                  {semLotePagina.map((g) => (
                    <div key={g.data} className="flex flex-col gap-2 rounded-interno bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-foreground">{formatarDataPura(g.data)}</span>
                        <span className="text-xs text-muted-foreground">
                          {g.vendas.map((v) => v.clienteNome).filter(Boolean).slice(0, 3).join(", ")}
                          {g.vendas.length > 3 ? ` e mais ${g.vendas.length - 3}` : ""}
                        </span>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>{g.quantidadeVendas} {g.quantidadeVendas === 1 ? "venda" : "vendas"}</span>
                        <span className="text-sm font-medium tabular-nums text-foreground valor-sensivel">{formatBRL(g.valorTotal)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {semLote.length > semLotePorPagina && (
                  <nav className="mt-3 flex items-center justify-between border-t border-border pt-3" aria-label="Paginação das antecipadas sem lote">
                    <span className="text-xs text-muted-foreground">
                      Mostrando {inicioPaginaSemLote + 1}–{Math.min(inicioPaginaSemLote + semLotePorPagina, semLote.length)} de {semLote.length} grupos
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        disabled={paginaSemLote === 1}
                        onClick={() => setPaginaSemLote((atual) => Math.max(1, atual - 1))}
                        aria-label="Página anterior das antecipadas sem lote"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      <span className="min-w-20 text-center text-xs font-semibold tabular-nums text-foreground">
                        Página {paginaSemLote} de {totalPaginasSemLote}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        disabled={paginaSemLote === totalPaginasSemLote}
                        onClick={() => setPaginaSemLote((atual) => Math.min(totalPaginasSemLote, atual + 1))}
                        aria-label="Próxima página das antecipadas sem lote"
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </nav>
                )}
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
          {/* Valores do retorno (2026-09-30): opcionais, para a conciliação do depósito. */}
          {concluindo?.valorLiquidoSolicitado != null && (
            <p className="text-sm text-muted-foreground">
              Líquido solicitado no envio:{' '}
              <span className="font-semibold tabular-nums text-foreground valor-sensivel">
                {formatBRL(concluindo.valorLiquidoSolicitado)}
              </span>
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="valor-aprovado-lote">Valor aprovado pela Prudent</Label>
              <CurrencyInput id="valor-aprovado-lote" value={valorAprovado} onChange={setValorAprovado} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="valor-depositado-lote">Depósito recebido</Label>
              <CurrencyInput id="valor-depositado-lote" value={valorDepositado} onChange={setValorDepositado} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="data-deposito-lote">Data do depósito</Label>
            <DateInput id="data-deposito-lote" value={dataDeposito || dataRetorno} onChange={setDataDeposito} max={hoje} />
          </div>
          {concluindo?.valorLiquidoSolicitado != null &&
            valorDepositado > 0 &&
            Math.abs(valorDepositado - concluindo.valorLiquidoSolicitado) > 1 && (
              <p role="status" className="rounded-interno bg-warning-bg px-3 py-2 text-sm text-warning-text">
                O depósito difere do líquido solicitado em{' '}
                <span className="font-semibold tabular-nums valor-sensivel">
                  {formatBRL(Math.abs(valorDepositado - concluindo.valorLiquidoSolicitado))}
                </span>
                . Confira antes de concluir.
              </p>
            )}
          <p className="flex items-start gap-2 rounded-interno bg-poco p-4 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
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
