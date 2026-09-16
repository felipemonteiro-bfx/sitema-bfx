"use client";

import { useState, useCallback } from "react";
import { EditVendaItens } from "@/components/edit-venda-itens-client";
import { EditParcelasSection } from "@/components/edit-parcelas-section";
import { FormSecaoTitulo } from "@/components/form-secao-titulo";
import { Input } from "@/components/ui/input";
import { totalParaParcelas } from "@/lib/parcelas-ajuste";

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
  /** Frete e desconto atuais do form: as parcelas somam itens + frete − desconto. */
  frete: number;
  desconto: number;
  dataVenda: string;
  parcelasPagas?: number[];
}

export function EditVendaComParcelas({
  initialItens,
  initialParcelas,
  initialNumeroParcelas,
  frete,
  desconto,
  dataVenda,
  parcelasPagas,
}: Props) {
  // Começa na soma dos itens, a mesma que EditVendaItens avisa na montagem: se começasse
  // em outro valor, a primeira notificação mudaria o total e as parcelas seriam
  // redistribuídas só por abrir a edição.
  const [subtotalItens, setSubtotalItens] = useState(() =>
    initialItens.reduce((s, i) => s + i.subtotal, 0),
  );
  const [numeroParcelas, setNumeroParcelas] = useState(initialNumeroParcelas);

  const handleTotalChange = useCallback((t: number) => setSubtotalItens(t), []);

  return (
    <>
      <EditVendaItens initialItens={initialItens} onTotalChange={handleTotalChange} />

      <FormSecaoTitulo>Pagamento e parcelas</FormSecaoTitulo>

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
        valorTotal={totalParaParcelas({ subtotalItens, frete, desconto })}
        dataVenda={dataVenda}
        parcelasPagas={parcelasPagas}
      />
    </>
  );
}
