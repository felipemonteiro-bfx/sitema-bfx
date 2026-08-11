"use client";

import { useState, useRef, useEffect } from "react";
import { ParcelasVencimentoForm } from "@/components/parcelas-vencimento-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import { ajustarParcelas, redistribuirValores } from "@/lib/parcelas-ajuste";

interface Parcela {
  numeroParcela: number;
  dataVencimento: string; // YYYY-MM-DD
  valorParcela: number;
}

interface Props {
  initialParcelas: Parcela[];
  numeroParcelas: number;
  valorTotal: number;
  dataVenda: string; // YYYY-MM-DD
  parcelasPagas?: number[]; // numeroParcela das linhas ja marcadas como pagas no banco
}

export function EditParcelasSection({ initialParcelas, numeroParcelas, valorTotal, dataVenda, parcelasPagas = [] }: Props) {
  const [parcelas, setParcelas] = useState<Parcela[]>(initialParcelas);
  const [open, setOpen] = useState(false);
  const [minimoPorPagas, setMinimoPorPagas] = useState<number | null>(null);
  const prevTotal = useRef(valorTotal);
  const prevNumeroParcelas = useRef(numeroParcelas);
  const bootstrapped = useRef(false);

  // Bootstrap de montagem: venda antiga sem linhas em parcelas_vencimento. Com
  // disableAutoInit sempre ligado abaixo, a auto-init do form filho fica desligada —
  // sem isto a venda ficaria sem nenhuma data.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    if (parcelas.length === 0 && numeroParcelas > 1) {
      const { parcelas: novas, minimoPorPagas: minimo } = ajustarParcelas({
        parcelas: [],
        numeroParcelas,
        valorTotal,
        dataVenda,
        parcelasPagas,
      });
      setParcelas(novas);
      setMinimoPorPagas(minimo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Correcao central do bug: reajustar a lista sempre que o campo Parcelas muda,
  // preservando as datas ja combinadas com o cliente e nunca descartando uma parcela
  // ja paga. Mesmo padrao do prevTotal abaixo.
  useEffect(() => {
    if (prevNumeroParcelas.current === numeroParcelas) return;
    prevNumeroParcelas.current = numeroParcelas;
    const { parcelas: ajustadas, minimoPorPagas: minimo } = ajustarParcelas({
      parcelas,
      numeroParcelas,
      valorTotal,
      dataVenda,
      parcelasPagas,
    });
    setParcelas(ajustadas);
    setMinimoPorPagas(minimo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numeroParcelas]);

  // Auto-redistribuir valores das parcelas quando o total muda. A regra de
  // arredondamento agora vive so em `redistribuirValores` (D-01).
  useEffect(() => {
    if (prevTotal.current === valorTotal) return;
    prevTotal.current = valorTotal;
    setParcelas((prev) => redistribuirValores(prev, valorTotal));
  }, [valorTotal]);

  if (numeroParcelas <= 1) return null;

  const totalParcelas = parcelas.reduce((s, p) => s + p.valorParcela, 0);
  const diverge = Math.abs(totalParcelas - valorTotal) > 0.01;

  return (
    <div className="md:col-span-3">
      <input
        type="hidden"
        name="parcelasVencimento"
        value={JSON.stringify(parcelas)}
        readOnly
      />

      <div className="flex items-center gap-3 flex-wrap">
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => setOpen(true)}
        >
          <Calendar className="h-4 w-4" />
          Datas de Vencimento ({parcelas.length}x · {formatBRL(totalParcelas)})
          {diverge && <span className="text-warning-text text-xs">⚠️</span>}
        </Button>
        <span className="text-xs text-muted-foreground">
          Total das parcelas: {formatBRL(totalParcelas)}
        </span>
      </div>

      {diverge && (
        <div className="mt-2 p-2 rounded-lg bg-warning-bg border border-warning/30 text-xs text-warning-text">
          ⚠️ A soma das parcelas ({formatBRL(totalParcelas)}) difere do total da venda
          ({formatBRL(valorTotal)}).
        </div>
      )}

      {minimoPorPagas !== null && (
        <div className="mt-2 p-2 rounded-lg bg-warning-bg border border-warning/30 text-xs text-warning-text">
          ⚠️ Esta venda ja tem parcelas pagas ate a {minimoPorPagas}ª — a lista nao pode
          ficar menor que isso.
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Datas de Vencimento das Parcelas
            </DialogTitle>
          </DialogHeader>

          <ParcelasVencimentoForm
            numeroParcelas={numeroParcelas}
            valorTotal={valorTotal}
            parcelas={parcelas}
            onChange={setParcelas}
            dataVenda={dataVenda}
            disableAutoInit
          />

          <DialogFooter>
            <Button type="button" onClick={() => setOpen(false)}>
              Confirmar datas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
