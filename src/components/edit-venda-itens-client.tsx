"use client";

import { useState, useEffect } from "react";
import { ProdutoItemForm } from "@/components/produto-item-form";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/utils";
import { Plus } from "lucide-react";

interface ProdutoItem {
  id: string;
  produtoNome: string;
  custoProduto: number;
  valorVenda: number;
  quantidade: number;
  subtotal: number;
}

type InitialItem = Omit<ProdutoItem, "id">;

interface Props {
  initialItens: InitialItem[];
  onTotalChange?: (total: number) => void;
}

function createEmptyItem(): ProdutoItem {
  return {
    id: Math.random().toString(36).slice(2),
    produtoNome: "",
    custoProduto: 0,
    valorVenda: 0,
    quantidade: 1,
    subtotal: 0,
  };
}

export function EditVendaItens({ initialItens, onTotalChange }: Props) {
  const [itens, setItens] = useState<ProdutoItem[]>(() =>
    initialItens.map((item) => ({
      ...item,
      id: Math.random().toString(36).slice(2),
    }))
  );

  const totalSubtotal = itens.reduce((s, i) => s + i.subtotal, 0);

  useEffect(() => {
    onTotalChange?.(totalSubtotal);
  }, [totalSubtotal, onTotalChange]);

  const handleUpdate = (index: number, item: ProdutoItem) => {
    setItens((prev) => prev.map((it, i) => (i === index ? item : it)));
  };

  const handleRemove = (index: number) => {
    setItens((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    setItens((prev) => [...prev, createEmptyItem()]);
  };

  const itensForSubmit = itens
    .filter((item) => item.produtoNome.trim() !== "")
    .map(({ produtoNome, custoProduto, valorVenda, quantidade, subtotal }) => ({
      produtoNome,
      custoProduto,
      valorVenda,
      quantidade,
      subtotal,
    }));

  return (
    <div className="md:col-span-3 space-y-3">
      <div className="space-y-3">
        {itens.map((item, index) => (
          <ProdutoItemForm
            key={item.id}
            item={item}
            index={index}
            onUpdate={handleUpdate}
            onRemove={handleRemove}
            canRemove={itens.length > 1}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Adicionar produto
        </Button>
        {itens.length > 1 && (
          <div className="text-sm font-medium">
            <span className="text-muted-foreground">Total produtos: </span>
            <span className="valor-sensivel">{formatBRL(totalSubtotal)}</span>
          </div>
        )}
      </div>

      <input
        type="hidden"
        name="itensJson"
        value={JSON.stringify(itensForSubmit)}
      />
    </div>
  );
}
