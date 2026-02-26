"use client";

import { useState } from "react";
import { ParcelasVencimentoForm } from "@/components/parcelas-vencimento-form";

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

/**
 * Wrapper client-side para edição de parcelas dentro de um <form> com server action.
 * Mantém estado das parcelas e escreve um <input type="hidden"> com o JSON serializado,
 * que é incluído automaticamente no FormData quando o form é submetido.
 */
export function EditParcelasSection({ initialParcelas, numeroParcelas, valorTotal, dataVenda }: Props) {
  const [parcelas, setParcelas] = useState<Parcela[]>(initialParcelas);

  if (numeroParcelas <= 1) return null;

  return (
    <div className="md:col-span-3">
      <input
        type="hidden"
        name="parcelasVencimento"
        value={JSON.stringify(parcelas)}
        readOnly
      />
      <ParcelasVencimentoForm
        numeroParcelas={numeroParcelas}
        valorTotal={valorTotal}
        parcelas={parcelas}
        onChange={setParcelas}
        dataVenda={dataVenda}
        disableAutoInit={initialParcelas.length > 0}
      />
    </div>
  );
}
