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
}

export function EditParcelasSection({ initialParcelas, numeroParcelas, valorTotal, dataVenda }: Props) {
  const [parcelas, setParcelas] = useState<Parcela[]>(initialParcelas);
  const [open, setOpen] = useState(false);
  const prevTotal = useRef(valorTotal);

  // Auto-redistribuir valores das parcelas quando o total muda
  useEffect(() => {
    if (prevTotal.current === valorTotal) return;
    prevTotal.current = valorTotal;
    setParcelas((prev) => {
      if (prev.length === 0) return prev;
      const n = prev.length;
      const base = Math.trunc((valorTotal / n) * 100) / 100;
      return prev.map((p, i) => ({
        ...p,
        valorParcela: i === n - 1
          ? Math.round((valorTotal - base * (n - 1)) * 100) / 100
          : base,
      }));
    });
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
          Datas de Vencimento ({numeroParcelas}x · {formatBRL(totalParcelas)})
          {diverge && <span className="text-warning-text text-xs">⚠️</span>}
        </Button>
      </div>

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
            disableAutoInit={initialParcelas.length > 0}
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
