"use client";

import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import { DateInput } from "@/components/ui/date-input";
import { dataParaHidden, parseDataISO } from "@/lib/data-input";
import { sincronizarParcelasAuto } from "@/lib/parcelas-ajuste";
import type { RegraVencimento } from "@/lib/regra-empresa";

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
  dataVenda?: string; // YYYY-MM-DD — usada para calcular o vencimento pela regra (corte/dia)
  disableAutoInit?: boolean; // Em modo de edição com parcelas existentes, evita reinicializar
  regra?: RegraVencimento; // Regra da empresa do cliente; sem ela, corte 20 / dia 10
}

export function ParcelasVencimentoForm({ numeroParcelas, valorTotal, parcelas, onChange, dataVenda, disableAutoInit = false, regra }: Props) {
  // Sincronizacao automatica da lista. A REGRA VIVE EM `sincronizarParcelasAuto`,
  // modulo puro e testado — aqui fica so o efeito colateral.
  //
  // A versao anterior comparava `parcelas[0].valorParcela` com o valor dividido para
  // decidir se a lista estava desatualizada. Ajustar o valor da 1a parcela tornava
  // essa condicao verdadeira e regenerava tudo, descartando a edicao e reescrevendo
  // as datas de vencimento ja escolhidas — o bug relatado em 2026-08-27.
  const totalAnterior = useRef<number | null>(null);
  useEffect(() => {
    if (disableAutoInit) return;
    const { parcelas: proximas, valorTotalObservado } = sincronizarParcelasAuto({
      parcelas,
      numeroParcelas,
      valorTotal,
      valorTotalAnterior: totalAnterior.current,
      // `ajustarParcelas` recusa gerar do zero sem data da venda, para nao depender do
      // relogio de quem chama. No formulario o fallback e hoje, data local do browser —
      // e vale tambem para data corrompida, que faria o effect lancar.
      dataVenda: parseDataISO(dataVenda) ? dataVenda : dataParaHidden(new Date()),
      regra,
    });
    // Nunca `= valorTotal` direto: quando a sincronizacao pula sem olhar o total, o
    // anterior tem que continuar valendo, senao a mudanca de total e engolida.
    totalAnterior.current = valorTotalObservado;
    if (proximas) onChange(proximas);
  }, [numeroParcelas, valorTotal, parcelas, onChange, dataVenda, disableAutoInit, regra]);

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
          <Calendar className="h-4 w-4 text-info-text" />
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
                <div className="text-sm font-bold text-foreground valor-sensivel">
                  {formatBRL(parcela.valorParcela)}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Vencimento</Label>
                <DateInput
                  value={parcela.dataVencimento}
                  onChange={(v) => handleDataChange(index, v)}
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
            <span className="font-bold text-lg text-foreground valor-sensivel">
              {formatBRL(parcelas.reduce((sum, p) => sum + p.valorParcela, 0))}
            </span>
          </div>
          {Math.abs(parcelas.reduce((sum, p) => sum + p.valorParcela, 0) - valorTotal) > 0.01 && (
            <div className="mt-2 p-2 rounded-lg bg-warning-bg border border-warning/30 text-xs text-warning-text">
              {/* Sem máscara: o aviso existe para o usuário acertar os valores que está
                  digitando — escondido, ele não diz por quanto divergiu. */}
              ⚠️ Atenção: A soma das parcelas ({formatBRL(parcelas.reduce((sum, p) => sum + p.valorParcela, 0))})
              difere do valor total ({formatBRL(valorTotal)})
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
