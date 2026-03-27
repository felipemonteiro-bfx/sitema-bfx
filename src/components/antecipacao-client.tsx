'use client';

import { useState } from 'react';
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { FileSpreadsheet, ImageIcon, Loader2 } from "lucide-react";

interface ParcelaDetalhe {
  numeroParcela: number;
  dataVencimento: string;
  valorParcela: number;
}

interface Venda {
  id: number;
  dataVenda: string | Date;
  produtoNome: string | null;
  valorVenda: number | null;
  parcelas: number | null;
  empresaConveniada: string | null;
  clienteNome?: string | null;
  clienteCpf?: string | null;
  clienteCnpj?: string | null;
  status: 'pendente' | 'em_andamento' | 'antecipado';
  parcelas_detalhes?: ParcelaDetalhe[];
}

interface Props {
  vendasIniciais: Venda[];
  onSubmit: (formData: FormData) => Promise<void>;
  vencimentosPorEmpresa: Record<string, number>;
  empresasDisponiveis: string[];
}

const TAXA_MENSAL = 3.99;

function calcularPrazoMedioDias(vendas: Venda[]) {
  const totalValor = vendas.reduce((sum, v) => sum + (v.valorVenda || 0), 0);
  if (totalValor <= 0) return 0;

  const weighted = vendas.reduce((sum, v) => {
    const parcelas = v.parcelas || 1;
    const valor = v.valorVenda || 0;
    const mediaParcelas = (30 * (parcelas + 1)) / 2;
    const prazoComD1 = mediaParcelas + 1;
    return sum + valor * prazoComD1;
  }, 0);

  return weighted / totalValor;
}

function calcularTaxaPercent(prazoMedio: number) {
  if (prazoMedio <= 0) return 0;
  if (prazoMedio < 30) {
    return prazoMedio * (TAXA_MENSAL / 30);
  }
  return (Math.pow(1 + TAXA_MENSAL / 100, prazoMedio / 30) - 1) * 100;
}

function StatusBadge({ status }: { status: Venda['status'] }) {
  if (status === 'antecipado') {
    return (
      <Badge className="bg-green-600 text-white border-0 font-semibold text-xs">
        Antecipado
      </Badge>
    );
  }
  if (status === 'em_andamento') {
    return (
      <Badge className="bg-blue-600 text-white border-0 font-semibold text-xs">
        Em andamento
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-500 text-white border-0 font-semibold text-xs">
      Pendente
    </Badge>
  );
}

function parseMesAno(str: string): { mes: number; ano: number } | null {
  const parts = str.split('/');
  if (parts.length !== 2) return null;
  const mes = parseInt(parts[0], 10);
  const ano = parseInt(parts[1], 10);
  if (isNaN(mes) || isNaN(ano) || mes < 1 || mes > 12) return null;
  return { mes, ano };
}

export default function AntecipacaoClient({ vendasIniciais, onSubmit, vencimentosPorEmpresa, empresasDisponiveis }: Props) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>("todas");
  const [filtroStatus, setFiltroStatus] = useState<string>("todas");
  const hoje = new Date();
  const mesAtualStr = `${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
  const [periodoInicio, setPeriodoInicio] = useState<string>(mesAtualStr);
  const [periodoFim, setPeriodoFim] = useState<string>(mesAtualStr);

  const periodoInicioP = parseMesAno(periodoInicio);
  const periodoFimP = parseMesAno(periodoFim);

  // Filtrar vendas baseado nos filtros ativos
  const vendasFiltradas = vendasIniciais.filter((v) => {
    const passaEmpresa = filtroEmpresa === "todas" || v.empresaConveniada === filtroEmpresa;
    const passaStatus = filtroStatus === "todas" || v.status === filtroStatus;

    // Filtro de periodo: se periodo definido, venda precisa ter parcela no range
    let passaPeriodo = true;
    if (periodoInicioP && periodoFimP && v.parcelas_detalhes && v.parcelas_detalhes.length > 0) {
      const inicioRef = new Date(periodoInicioP.ano, periodoInicioP.mes - 1, 1);
      const fimRef = new Date(periodoFimP.ano, periodoFimP.mes, 0); // ultimo dia do mes fim
      passaPeriodo = v.parcelas_detalhes.some((p) => {
        const d = new Date(p.dataVencimento);
        return d >= inicioRef && d <= fimRef;
      });
    }

    return passaEmpresa && passaStatus && passaPeriodo;
  });

  const toggleSelect = (id: number, isAntecipado: boolean) => {
    if (isAntecipado) return;
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    const selectableIds = vendasFiltradas.filter(v => v.status !== 'antecipado').map(v => v.id);
    const allSelected = selectableIds.every(id => selectedIds.includes(id));
    if (allSelected && selectableIds.length > 0) {
      setSelectedIds(prev => prev.filter(id => !selectableIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...selectableIds])]);
    }
  };

  const handleAction = async (formData: FormData) => {
    if (selectedIds.length === 0) return;

    setIsProcessing(true);
    try {
      // 1. Gerar e baixar o relatório para a financeira
      const idsParam = selectedIds.join(',');
      window.location.href = `/api/relatorios/antecipacao?ids=${idsParam}`;

      // Pequeno delay para garantir que o download inicie
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 2. Executar a antecipação no banco
      selectedIds.forEach(id => formData.append('id', id.toString()));
      await onSubmit(formData);
      setSelectedIds([]);
    } catch (error) {
      console.error("Erro na antecipação:", error);
      toast.error("Ocorreu um erro ao processar a antecipação.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGerarPlanilha = () => {
    if (selectedIds.length === 0) return;
    const idsParam = selectedIds.join(',');
    window.location.href = `/api/relatorios/antecipacao-xlsx?ids=${idsParam}`;
  };

  const handleGerarRelatorioVisual = () => {
    if (selectedIds.length === 0) return;
    const idsParam = selectedIds.join(',');
    window.open(`/api/relatorios/antecipacao-imagem?ids=${idsParam}`, '_blank');
  };

  const selectableInFiltered = vendasFiltradas.filter(v => v.status !== 'antecipado');
  const allFilteredSelected = selectableInFiltered.length > 0 && selectableInFiltered.every(v => selectedIds.includes(v.id));

  const selectedVendas = vendasIniciais.filter(v => selectedIds.includes(v.id));
  const totalSelecionado = selectedVendas.reduce((sum, v) => sum + (v.valorVenda || 0), 0);
  const prazoMedio = calcularPrazoMedioDias(selectedVendas);
  const taxaPercent = calcularTaxaPercent(prazoMedio);
  const valorTaxa = totalSelecionado * (taxaPercent / 100);
  const valorLiquido = totalSelecionado - valorTaxa;

  const formatDateBR = (value: string | Date) => {
    const d = typeof value === 'string' ? new Date(value) : value;
    return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(d);
  };

  return (
    <form action={handleAction}>
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Empresa</label>
          <select
            value={filtroEmpresa}
            onChange={(e) => setFiltroEmpresa(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring min-w-[180px]"
          >
            <option value="todas">Todas as empresas</option>
            {empresasDisponiveis.map((empresa) => (
              <option key={empresa} value={empresa}>{empresa}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</label>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring min-w-[160px]"
          >
            <option value="todas">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="em_andamento">Em andamento</option>
            <option value="antecipado">Antecipado</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">De mês/ano</label>
          <input
            type="text"
            value={periodoInicio}
            onChange={(e) => setPeriodoInicio(e.target.value)}
            placeholder="03/2025"
            maxLength={7}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm w-28 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Até mês/ano</label>
          <input
            type="text"
            value={periodoFim}
            onChange={(e) => setPeriodoFim(e.target.value)}
            placeholder="04/2025"
            maxLength={7}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm w-28 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        {(filtroEmpresa !== "todas" || filtroStatus !== "todas") && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground opacity-0">.</label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 text-muted-foreground hover:text-foreground"
              onClick={() => { setFiltroEmpresa("todas"); setFiltroStatus("todas"); }}
            >
              Limpar filtros
            </Button>
          </div>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allFilteredSelected}
                onCheckedChange={toggleAll}
                disabled={isProcessing || selectableInFiltered.length === 0}
              />
            </TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Empresa Conveniada</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Parcelas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendasFiltradas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                Nenhuma venda encontrada com os filtros aplicados.
              </TableCell>
            </TableRow>
          ) : (
            vendasFiltradas.map((v) => {
              const isAntecipado = v.status === 'antecipado';
              const isSelected = selectedIds.includes(v.id);
              return (
                <TableRow
                  key={v.id}
                  className={`transition-all duration-200 ${
                    isAntecipado
                      ? 'bg-green-50 dark:bg-green-950/30 opacity-70 cursor-default'
                      : v.status === 'em_andamento'
                      ? 'bg-blue-50 dark:bg-blue-950/30 cursor-pointer hover:bg-blue-100/70'
                      : isSelected
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 cursor-pointer'
                      : 'cursor-pointer hover:bg-accent/50'
                  }`}
                  onClick={() => !isProcessing && toggleSelect(v.id, isAntecipado)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(v.id, isAntecipado)}
                      disabled={isProcessing || isAntecipado}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{formatDateBR(v.dataVenda)}</TableCell>
                  <TableCell className="text-foreground">
                    {v.empresaConveniada ? (
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {v.empresaConveniada}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">{v.produtoNome}</TableCell>
                  <TableCell>
                    <StatusBadge status={v.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-bold text-foreground">{formatBRL(v.valorVenda || 0)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className="inline-flex items-center justify-center rounded-md bg-info/20 px-2 py-0.5 text-xs font-bold text-info">
                      {v.parcelas}x
                    </span>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <div className="mt-6 rounded-xl border-2 border-primary/20 bg-card shadow-lg overflow-hidden transition-all">
        {/* Linha 1: Total + Métricas */}
        <div className="p-4 sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          {/* Total selecionado */}
          <div className="flex-shrink-0 min-w-[140px]">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Selecionado</div>
            <div className="text-3xl sm:text-4xl font-black text-foreground tabular-nums leading-none mt-0.5">
              {formatBRL(totalSelecionado)}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {selectedIds.length} {selectedIds.length === 1 ? 'item selecionado' : 'itens selecionados'}
            </div>
          </div>

          {/* Separador vertical (só desktop) */}
          <div className="hidden sm:block w-px self-stretch bg-border" />

          {/* 3 métricas em grid compacto */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 flex-1">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 px-3 py-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-500 dark:text-blue-400">Prazo médio</div>
              <div className="text-xl font-black text-blue-700 dark:text-blue-300 tabular-nums leading-tight">
                {prazoMedio.toFixed(1)}<span className="text-xs font-semibold ml-0.5">d</span>
              </div>
              <div className="text-[9px] text-blue-400/80 font-medium mt-0.5">D+1</div>
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-3 py-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-500 dark:text-amber-400">Taxa total</div>
              <div className="text-xl font-black text-amber-700 dark:text-amber-300 tabular-nums leading-tight">
                {taxaPercent.toFixed(2)}<span className="text-xs font-semibold ml-0.5">%</span>
              </div>
              <div className="text-[9px] text-amber-400/80 font-medium mt-0.5">Smart</div>
            </div>
            <div className="rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800/60 px-3 py-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400">Líquido</div>
              <div className="text-base sm:text-lg font-black text-green-700 dark:text-green-300 tabular-nums leading-tight truncate">
                {formatBRL(valorLiquido)}
              </div>
              <div className="text-[9px] text-green-500/80 font-medium mt-0.5">estimado</div>
            </div>
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Linha 2: Ações */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {/* Secundárias */}
          <div className="flex gap-2 sm:flex-shrink-0">
            <Button
              type="button"
              disabled={selectedIds.length === 0 || isProcessing}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none h-10 px-4 text-sm font-semibold gap-2 cursor-pointer"
              onClick={handleGerarPlanilha}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Planilha
            </Button>
            <Button
              type="button"
              disabled={selectedIds.length === 0 || isProcessing}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none h-10 px-4 text-sm font-semibold gap-2 cursor-pointer"
              onClick={handleGerarRelatorioVisual}
            >
              <ImageIcon className="h-4 w-4" />
              Relatório Visual
            </Button>
          </div>

          {/* CTA principal */}
          <Button
            disabled={selectedIds.length === 0 || isProcessing}
            className="w-full sm:w-auto sm:ml-auto h-11 sm:h-12 px-6 sm:px-8 text-sm sm:text-base font-bold bg-green-600 hover:bg-green-700 active:bg-green-800 text-white shadow-md hover:shadow-green-500/30 transition-all gap-2 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              `Antecipar ${selectedIds.length} ${selectedIds.length === 1 ? 'item' : 'itens'}`
            )}
          </Button>
        </div>

        {/* Rodapé informativo */}
        <div className="px-4 sm:px-6 pb-3 flex items-center gap-2 text-[11px] text-muted-foreground border-t border-border/50 pt-2.5">
          <span className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-[9px] font-bold text-blue-600 dark:text-blue-400">i</span>
          Taxa Smart: {TAXA_MENSAL.toFixed(2)}% a.m. · Juros simples &lt; 30 dias · Compostos a partir de 30 dias.
        </div>
      </div>

      {Object.keys(vencimentosPorEmpresa).length > 0 && (
        <div className="mt-6 rounded-xl border-2 border-warning/20 bg-gradient-to-br from-card to-card-elevated shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
              <svg className="h-5 w-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-foreground">Valores a Vencer no Mês por Empresa</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(vencimentosPorEmpresa)
              .sort((a, b) => b[1] - a[1])
              .map(([empresa, valor]) => (
                <div
                  key={empresa}
                  className="group relative overflow-hidden rounded-lg border border-border bg-card px-4 py-3 transition-all hover:border-warning/50 hover:shadow-md"
                >
                  <div className="text-xs font-medium text-muted-foreground truncate">{empresa}</div>
                  <div className="text-lg font-bold text-warning tabular-nums">{formatBRL(valor)}</div>
                </div>
              ))}
          </div>
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total a vencer no mês</span>
            <span className="text-xl font-bold text-warning tabular-nums">
              {formatBRL(Object.values(vencimentosPorEmpresa).reduce((sum, v) => sum + v, 0))}
            </span>
          </div>
        </div>
      )}
    </form>
  );
}
