'use client';

import { useState, useRef } from 'react';
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { DateInput } from "@/components/ui/date-input";
import { Loader2, CheckCircle2, Trash2, Sparkles } from "lucide-react";
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
  const [suggesting, setSuggesting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ";", // Comum no Excel brasileiro
      complete: (results) => {
        const mapped = (results.data as Record<string, string | undefined>[]).map((row) => ({
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
        toast.error("Erro ao ler arquivo CSV.");
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

  const sugerirComIA = async () => {
    if (data.length === 0) return;
    setSuggesting(true);
    try {
      const res = await fetch("/api/importacao/sugerir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const { data: suggested } = await res.json();
        if (Array.isArray(suggested) && suggested.length > 0) {
          setData(suggested.map((r: RowData & { id?: string }) => ({
            ...r,
            id: r.id ?? Math.random().toString(36).substr(2, 9),
          })));
          toast.success("IA aplicou sugestões. Revise os dados antes de confirmar.");
        }
      } else {
        toast.error("Não foi possível processar com IA. Verifique a chave Gemini em Configurações.");
      }
    } catch {
      toast.error("Erro de conexão ao processar com IA.");
    } finally {
      setSuggesting(false);
    }
  };

  const finalizeImport = async () => {
    if (data.length === 0) return;
    
    // Validação básica
    const invalid = data.some(row => !row.cliente || !row.produto || isNaN(Number(row.valor)));
    if (invalid) {
      toast.warning("Existem campos obrigatórios vazios ou valores numéricos inválidos na tabela. Por favor, corrija antes de subir.");
      return;
    }

    setConfirmOpen(true);
  };

  const handleConfirmImport = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/importacao/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        toast.success("Importação concluída com sucesso!");
        setData([]);
        window.location.reload();
      } else {
        toast.error("Erro ao salvar dados no servidor.");
      }
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar importação de {data.length} vendas?</AlertDialogTitle>
          <AlertDialogDescription>
            Os dados serão salvos permanentemente no sistema. Certifique-se de que as informações estão corretas antes de confirmar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmImport}>
            Importar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Selecionar Arquivo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={loading || saving}
              className="sr-only"
              aria-label="Selecionar arquivo CSV"
            />
            <Button
              type="button"
              variant="outline"
              disabled={loading || saving}
              onClick={() => fileInputRef.current?.click()}
            >
              Escolher arquivo
            </Button>
            <span className="text-sm text-muted-foreground">
              {fileName ? fileName : "Nenhum arquivo escolhido"}
            </span>
            {loading && <Loader2 className="h-5 w-5 animate-spin text-info-text" />}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">O sistema aceita ponto e vírgula (;) como separador padrão do Excel.</p>
        </CardContent>
      </Card>

      {data.length > 0 && (
        <Card className="border-info bg-info-bg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-primary">2. Validar e Editar Dados</CardTitle>
              <p className="text-sm text-muted-foreground italic">Edite as células abaixo se necessário antes de confirmar.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={sugerirComIA}
                disabled={suggesting || saving}
                className="border-warning text-warning-text hover:bg-warning-bg"
                leftIcon={suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              >
                Sugerir com IA
              </Button>
              <Button onClick={finalizeImport} disabled={saving} className="bg-primary hover:bg-primary/90" leftIcon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}>
                Subir {data.length} Vendas
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="rounded-md border bg-white w-full">
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
                          onChange={(v) => updateCell(row.id, 'dataVenda', v)}
                          className="w-full border-none bg-transparent text-xs focus:ring-1 focus:ring-info rounded p-1"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <input 
                          value={row.vendedor} 
                          onChange={(e) => updateCell(row.id, 'vendedor', e.target.value)}
                          className="w-full border-none bg-transparent text-xs focus:ring-1 focus:ring-info rounded p-1"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <input 
                          value={row.cliente} 
                          placeholder="OBRIGATÓRIO"
                          onChange={(e) => updateCell(row.id, 'cliente', e.target.value)}
                          className={`w-full border-none bg-transparent text-xs focus:ring-1 focus:ring-info rounded p-1 ${!row.cliente ? 'bg-error-bg text-destructive' : ''}`}
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <input 
                          value={row.produto} 
                          placeholder="OBRIGATÓRIO"
                          onChange={(e) => updateCell(row.id, 'produto', e.target.value)}
                          className={`w-full border-none bg-transparent text-xs focus:ring-1 focus:ring-info rounded p-1 ${!row.produto ? 'bg-error-bg text-destructive' : ''}`}
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <input 
                          type="number" 
                          value={row.valor} 
                          onChange={(e) => updateCell(row.id, 'valor', e.target.value)}
                          className="w-full border-none bg-transparent text-xs text-right focus:ring-1 focus:ring-info rounded p-1 font-semibold"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <input 
                          type="number" 
                          value={row.parcelas} 
                          onChange={(e) => updateCell(row.id, 'parcelas', e.target.value)}
                          className="w-full border-none bg-transparent text-xs text-right focus:ring-1 focus:ring-info rounded p-1"
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remover linha"
                          onClick={() => removeRow(row.id)}
                          className="h-6 w-6 text-error-text shadow-none hover:bg-transparent hover:text-destructive hover:shadow-none"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
    </>
  );
}
