'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Loader2, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import Papa from "papaparse";

interface RowData {
  id: string;
  dataVenda: string;
  vendedor: string;
  cliente: string;
  produto: string;
  custo: string;
  valor: string;
  frete: string;
  envio: string;
  parcelas: string;
  antecipada: boolean;
}

export default function ImportacaoClient() {
  const [data, setData] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ";", // Comum no Excel brasileiro
      complete: (results) => {
        const mapped = (results.data as any[]).map((row, index) => ({
          id: Math.random().toString(36).substr(2, 9),
          dataVenda: row["Data (AAAA-MM-DD)"] || row["Data"] || new Date().toISOString().slice(0, 10),
          vendedor: row["Vendedor"] || "",
          cliente: row["Cliente"] || "",
          produto: row["Produto"] || "",
          custo: row["Custo Produto"] || row["Custo"] || "0",
          valor: row["Valor Venda"] || row["Valor"] || "0",
          frete: row["Frete Cobrado"] || row["Frete"] || "0",
          envio: row["Custo Envio"] || row["Envio"] || "0",
          parcelas: row["Parcelas"] || "1",
          antecipada: String(row["Antecipada (S/N)"]).toUpperCase().startsWith("S")
        }));
        setData(mapped);
        setLoading(false);
      },
      error: () => {
        alert("Erro ao ler arquivo CSV.");
        setLoading(false);
      }
    });
  };

  const updateCell = (id: string, field: keyof RowData, value: string | boolean) => {
    setData(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const removeRow = (id: string) => {
    setData(prev => prev.filter(row => row.id !== id));
  };

  const finalizeImport = async () => {
    if (data.length === 0) return;
    
    // Validação básica
    const invalid = data.some(row => !row.cliente || !row.produto || isNaN(Number(row.valor)));
    if (invalid) {
      alert("Existem campos obrigatórios vazios ou valores numéricos inválidos na tabela. Por favor, corrija antes de subir.");
      return;
    }

    if (!confirm(`Confirmar a importação de ${data.length} vendas?`)) return;

    setSaving(true);
    try {
      const res = await fetch('/api/importacao/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        alert("Importação concluída com sucesso!");
        setData([]);
        window.location.reload();
      } else {
        alert("Erro ao salvar dados no servidor.");
      }
    } catch (error) {
      alert("Erro de conexão.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Selecionar Arquivo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input 
              type="file" 
              accept=".csv" 
              onChange={handleFileUpload} 
              disabled={loading || saving}
              className="max-w-xs cursor-pointer"
            />
            {loading && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">O sistema aceita ponto e vírgula (;) como separador padrão do Excel.</p>
        </CardContent>
      </Card>

      {data.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-primary">2. Validar e Editar Dados</CardTitle>
              <p className="text-sm text-muted-foreground italic">Edite as células abaixo se necessário antes de confirmar.</p>
            </div>
            <Button onClick={finalizeImport} disabled={saving} className="bg-primary hover:bg-primary/90">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Subir {data.length} Vendas
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border bg-white overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="w-32">Data</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="min-w-[150px]">Cliente</TableHead>
                    <TableHead className="min-w-[150px]">Produto</TableHead>
                    <TableHead className="w-24 text-right">Valor</TableHead>
                    <TableHead className="w-20 text-right">Parc.</TableHead>
                    <TableHead className="w-16">Nota?</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="p-1">
                        <DateInput
                          value={row.dataVenda}
                          onChange={(e) => updateCell(row.id, 'dataVenda', e.target.value)}
                          className="w-full border-none bg-transparent text-xs focus:ring-1 focus:ring-blue-500 rounded p-1"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <input 
                          value={row.vendedor} 
                          onChange={(e) => updateCell(row.id, 'vendedor', e.target.value)}
                          className="w-full border-none bg-transparent text-xs focus:ring-1 focus:ring-blue-500 rounded p-1"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <input 
                          value={row.cliente} 
                          placeholder="OBRIGATÓRIO"
                          onChange={(e) => updateCell(row.id, 'cliente', e.target.value)}
                          className={`w-full border-none bg-transparent text-xs focus:ring-1 focus:ring-blue-500 rounded p-1 ${!row.cliente ? 'bg-red-50 text-destructive' : ''}`}
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <input 
                          value={row.produto} 
                          placeholder="OBRIGATÓRIO"
                          onChange={(e) => updateCell(row.id, 'produto', e.target.value)}
                          className={`w-full border-none bg-transparent text-xs focus:ring-1 focus:ring-blue-500 rounded p-1 ${!row.produto ? 'bg-red-50 text-destructive' : ''}`}
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <input 
                          type="number" 
                          value={row.valor} 
                          onChange={(e) => updateCell(row.id, 'valor', e.target.value)}
                          className="w-full border-none bg-transparent text-xs text-right focus:ring-1 focus:ring-blue-500 rounded p-1 font-semibold"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <input 
                          type="number" 
                          value={row.parcelas} 
                          onChange={(e) => updateCell(row.id, 'parcelas', e.target.value)}
                          className="w-full border-none bg-transparent text-xs text-right focus:ring-1 focus:ring-blue-500 rounded p-1"
                        />
                      </TableCell>
                      <TableCell className="p-1 text-center">
                        <input 
                          type="checkbox" 
                          checked={row.antecipada} 
                          onChange={(e) => updateCell(row.id, 'antecipada', e.target.checked)}
                          className="h-3 w-3 rounded"
                        />
                      </TableCell>
                      <TableCell className="p-1 text-center">
                        <button onClick={() => removeRow(row.id)} className="text-red-400 hover:text-destructive p-1">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
