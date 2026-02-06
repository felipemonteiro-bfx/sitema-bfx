"use client";

import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import { DateInput } from "@/components/ui/date-input";

interface Parcela {
  numeroParcela: number;
  dataVencimento: string; // ISO date string
  valorParcela: number;
}

interface Props {
  numeroParcelas: number;
  valorTotal: number;
  parcelas: Parcela[];
  onChange: (parcelas: Parcela[]) => void;
}

export function ParcelasVencimentoForm({ numeroParcelas, valorTotal, parcelas, onChange }: Props) {
  // Inicializar parcelas automaticamente
  useEffect(() => {
    if (numeroParcelas > 0 && (parcelas.length !== numeroParcelas || parcelas[0]?.valorParcela !== valorTotal / numeroParcelas)) {
      const hoje = new Date();
      const novasParcelas: Parcela[] = Array.from({ length: numeroParcelas }).map((_, i) => {
        const dataVencimento = new Date(hoje);
        dataVencimento.setMonth(dataVencimento.getMonth() + i + 1);
        dataVencimento.setDate(10); // Padrão: dia 10 de cada mês

        return {
          numeroParcela: i + 1,
          dataVencimento: dataVencimento.toISOString().split('T')[0],
          valorParcela: valorTotal / numeroParcelas,
        };
      });
      onChange(novasParcelas);
    }
  }, [numeroParcelas, valorTotal]);

  const handleDataChange = (index: number, newData: string) => {
    const novasParcelas = [...parcelas];
    novasParcelas[index] = {
      ...novasParcelas[index],
      dataVencimento: newData,
    };
    onChange(novasParcelas);
  };

  const handleValorChange = (index: number, newValor: number) => {
    const novasParcelas = [...parcelas];
    novasParcelas[index] = {
      ...novasParcelas[index],
      valorParcela: newValor,
    };
    onChange(novasParcelas);
  };

  if (numeroParcelas <= 1) return null;

  return (
    <Card variant="elevated" className="border-info/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4 text-info" />
          Datas de Vencimento das Parcelas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {parcelas.map((parcela, index) => (
            <div
              key={parcela.numeroParcela}
              className="p-3 rounded-lg border border-border bg-muted/30 space-y-2 transition-all hover:border-info/40 hover:bg-muted/50"
            >
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {parcela.numeroParcela}ª Parcela
                </Label>
                <div className="text-sm font-bold text-foreground">
                  {formatBRL(parcela.valorParcela)}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Vencimento</Label>
                <DateInput
                  value={parcela.dataVencimento}
                  onChange={(e) => handleDataChange(index, e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Valor (ajustar se necessário)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={parcela.valorParcela}
                  onChange={(e) => handleValorChange(index, Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total das Parcelas:</span>
            <span className="font-bold text-lg text-foreground">
              {formatBRL(parcelas.reduce((sum, p) => sum + p.valorParcela, 0))}
            </span>
          </div>
          {Math.abs(parcelas.reduce((sum, p) => sum + p.valorParcela, 0) - valorTotal) > 0.01 && (
            <div className="mt-2 p-2 rounded-lg bg-warning-bg border border-warning/30 text-xs text-warning">
              ⚠️ Atenção: A soma das parcelas ({formatBRL(parcelas.reduce((sum, p) => sum + p.valorParcela, 0))})
              difere do valor total ({formatBRL(valorTotal)})
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
