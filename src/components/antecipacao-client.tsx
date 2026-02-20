'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

interface Venda {
  id: number;
  dataVenda: string | Date;
  produtoNome: string | null;
  valorVenda: number | null;
  parcelas: number | null;
  empresaConveniada: string | null;
}

interface Props {
  vendasIniciais: Venda[];
  onSubmit: (formData: FormData) => Promise<void>;
  vencimentosPorEmpresa: Record<string, number>;
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

export default function AntecipacaoClient({ vendasIniciais, onSubmit, vencimentosPorEmpresa }: Props) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === vendasIniciais.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(vendasIniciais.map(v => v.id));
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
      alert("Ocorreu um erro ao processar a antecipação.");
    } finally {
      setIsProcessing(false);
    }
  };

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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={vendasIniciais.length > 0 && selectedIds.length === vendasIniciais.length}
                onCheckedChange={toggleAll}
                disabled={isProcessing}
              />
            </TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Empresa Conveniada</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Parcelas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendasIniciais.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                Sem vendas pendentes para antecipação.
              </TableCell>
            </TableRow>
          ) : (
            vendasIniciais.map((v) => (
              <TableRow
                key={v.id}
                className={`cursor-pointer transition-all duration-200 hover:bg-accent/50 hover:shadow-sm ${
                  selectedIds.includes(v.id) ? 'bg-success/10 border-l-4 border-success' : ''
                }`}
                onClick={() => !isProcessing && toggleSelect(v.id)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(v.id)}
                    onCheckedChange={() => toggleSelect(v.id)}
                    disabled={isProcessing}
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
                <TableCell className="text-right tabular-nums font-bold text-foreground">{formatBRL(v.valorVenda || 0)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  <span className="inline-flex items-center justify-center rounded-md bg-info/20 px-2 py-0.5 text-xs font-bold text-info">
                    {v.parcelas}x
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="mt-6 flex flex-col gap-4 rounded-xl border-2 border-primary/20 bg-gradient-to-br from-card to-card-elevated shadow-lg p-6 dark:shadow-[var(--shadow-lg)] transition-all">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Selecionado</span>
            <span className="text-3xl font-black text-foreground tabular-nums">{formatBRL(totalSelecionado)}</span>
            <span className="text-xs font-medium text-muted-foreground">{selectedIds.length} {selectedIds.length === 1 ? 'item selecionado' : 'itens selecionados'}</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="group relative overflow-hidden rounded-lg border-2 border-info/30 bg-gradient-to-br from-info-bg to-transparent px-4 py-3 transition-all hover:border-info/50 hover:scale-[1.02] cursor-default">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Prazo médio (D+1)</div>
              <div className="text-lg font-bold text-info tabular-nums">{prazoMedio.toFixed(1)} dias</div>
            </div>
            <div className="group relative overflow-hidden rounded-lg border-2 border-warning/30 bg-gradient-to-br from-warning-bg to-transparent px-4 py-3 transition-all hover:border-warning/50 hover:scale-[1.02] cursor-default">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Taxa total</div>
              <div className="text-lg font-bold text-warning tabular-nums">{taxaPercent.toFixed(2)}%</div>
            </div>
            <div className="group relative overflow-hidden rounded-lg border-2 border-success/30 bg-gradient-to-br from-success-bg to-transparent px-4 py-3 transition-all hover:border-success/50 hover:scale-[1.02] dark:shadow-[var(--glow-primary)] cursor-default">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Valor líquido</div>
              <div className="text-lg font-bold text-success tabular-nums">{formatBRL(valorLiquido)}</div>
            </div>
          </div>

          <Button
            disabled={selectedIds.length === 0 || isProcessing}
            variant="success"
            className="h-12 px-8 text-base font-bold shadow-lg hover:shadow-xl transition-all"
          >
            {isProcessing ? "Gerando Relatório..." : `Antecipar ${selectedIds.length} ${selectedIds.length === 1 ? 'item' : 'itens'}`}
          </Button>
        </div>
        <div className="pt-3 border-t border-border text-xs font-medium text-muted-foreground flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-info/20 text-[10px] font-bold text-info">ℹ</span>
          Taxa Smart: {TAXA_MENSAL.toFixed(2)}% a.m. Juros simples &lt; 30 dias e compostos a partir de 30 dias.
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
