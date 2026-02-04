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

export default function AntecipacaoClient({ vendasIniciais, onSubmit }: Props) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

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

  const totalSelecionado = vendasIniciais
    .filter(v => selectedIds.includes(v.id))
    .reduce((sum, v) => sum + (v.valorVenda || 0), 0);

  const formatDateBR = (value: string | Date) => {
    const d = typeof value === 'string' ? new Date(value) : value;
    return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(d);
  };

  return (
    <form action={async (formData) => {
      // Garantir que os IDs selecionados via estado sejam passados no formulário
      selectedIds.forEach(id => formData.append('id', id.toString()));
      await onSubmit(formData);
      setSelectedIds([]);
    }}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox 
                checked={vendasIniciais.length > 0 && selectedIds.length === vendasIniciais.length}
                onCheckedChange={toggleAll}
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
              <TableRow key={v.id} className="cursor-pointer hover:bg-slate-50" onClick={() => toggleSelect(v.id)}>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    checked={selectedIds.includes(v.id)}
                    onCheckedChange={() => toggleSelect(v.id)}
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
      
      <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Selecionado</span>
          <span className="text-2xl font-bold text-blue-900">{formatBRL(totalSelecionado)}</span>
          <span className="text-xs text-muted-foreground">{selectedIds.length} itens selecionados</span>
        </div>
        <Button disabled={selectedIds.length === 0} className="bg-blue-900 hover:bg-blue-800 h-12 px-8">
          Antecipar {selectedIds.length} selecionados
        </Button>
      </div>
    </form>
  );
}
