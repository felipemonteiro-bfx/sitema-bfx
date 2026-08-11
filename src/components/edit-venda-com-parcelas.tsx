"use client";

import { useState, useCallback } from "react";
import { EditVendaItens } from "@/components/edit-venda-itens-client";
import { EditParcelasSection } from "@/components/edit-parcelas-section";
import { Input } from "@/components/ui/input";

interface ProdutoItem {
  produtoNome: string;
  custoProduto: number;
  valorVenda: number;
  quantidade: number;
  subtotal: number;
}

interface Parcela {
  numeroParcela: number;
  dataVencimento: string;
  valorParcela: number;
}

interface Props {
  initialItens: ProdutoItem[];
  initialParcelas: Parcela[];
  initialNumeroParcelas: number;
  initialTotal: number;
  dataVenda: string;
  parcelasPagas?: number[];
}

export function EditVendaComParcelas({
  initialItens,
  initialParcelas,
  initialNumeroParcelas,
  initialTotal,
  dataVenda,
  parcelasPagas,
}: Props) {
  const [total, setTotal] = useState(initialTotal);
  const [numeroParcelas, setNumeroParcelas] = useState(initialNumeroParcelas);

  const handleTotalChange = useCallback((t: number) => setTotal(t), []);

  return (
    <>
      <EditVendaItens initialItens={initialItens} onTotalChange={handleTotalChange} />

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Parcelas</label>
        <Input
          name="parcelas"
          type="number"
          min={1}
          value={numeroParcelas}
          onChange={(e) => setNumeroParcelas(Math.max(1, Number(e.target.value) || 1))}
        />
      </div>

      <EditParcelasSection
        initialParcelas={initialParcelas}
        numeroParcelas={numeroParcelas}
        valorTotal={total}
        dataVenda={dataVenda}
        parcelasPagas={parcelasPagas}
      />
    </>
  );
}
