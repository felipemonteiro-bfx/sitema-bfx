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
}

interface Props {
  vendasIniciais: Venda[];
  onSubmit: (formData: FormData) => Promise<void>;
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

export default function AntecipacaoClient({ vendasIniciais, onSubmit }: Props) {
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
            <TableHead>Produto</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Parcelas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendasIniciais.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                Sem vendas pendentes para antecipação.
              </TableCell>
            </TableRow>
          ) : (
            vendasIniciais.map((v) => (
              <TableRow key={v.id} className="cursor-pointer hover:bg-slate-50" onClick={() => !isProcessing && toggleSelect(v.id)}>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(v.id)}
                    onCheckedChange={() => toggleSelect(v.id)}
                    disabled={isProcessing}
                  />
                </TableCell>
                <TableCell>{formatDateBR(v.dataVenda)}</TableCell>
                <TableCell className="font-medium">{v.produtoNome}</TableCell>
                <TableCell className="text-right tabular-nums">{formatBRL(v.valorVenda || 0)}</TableCell>
                <TableCell className="text-right tabular-nums">{v.parcelas}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="mt-6 flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Selecionado</span>
            <span className="text-2xl font-bold text-blue-900">{formatBRL(totalSelecionado)}</span>
            <span className="text-xs text-muted-foreground">{selectedIds.length} itens selecionados</span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
              <div className="text-[11px] uppercase text-muted-foreground">Prazo médio (D+1)</div>
              <div className="text-sm font-semibold text-slate-900">{prazoMedio.toFixed(1)} dias</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
              <div className="text-[11px] uppercase text-muted-foreground">Taxa total</div>
              <div className="text-sm font-semibold text-slate-900">{taxaPercent.toFixed(2)}%</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
              <div className="text-[11px] uppercase text-muted-foreground">Valor líquido</div>
              <div className="text-sm font-semibold text-emerald-700">{formatBRL(valorLiquido)}</div>
            </div>
          </div>

          <Button disabled={selectedIds.length === 0 || isProcessing} className="h-12 px-8 bg-blue-900 hover:bg-blue-800">
            {isProcessing ? "Gerando Relatório..." : `Antecipar ${selectedIds.length} itens`}
          </Button>
        </div>
        <div className="text-[11px] text-muted-foreground">
          Taxa Smart: {TAXA_MENSAL.toFixed(2)}% a.m. Juros simples &lt; 30 dias e compostos a partir de 30 dias.
        </div>
      </div>
    </form>
  );
}
