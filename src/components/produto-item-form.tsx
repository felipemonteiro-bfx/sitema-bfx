"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { X, Package } from "lucide-react";
import { formatBRL } from "@/lib/utils";

interface ProdutoItem {
  id: string; // ID temporário para o frontend
  produtoNome: string;
  custoProduto: number;
  valorVenda: number;
  quantidade: number;
  subtotal: number;
}

interface Props {
  item: ProdutoItem;
  index: number;
  onUpdate: (index: number, item: ProdutoItem) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

export function ProdutoItemForm({ item, index, onUpdate, onRemove, canRemove }: Props) {
  const [produtoQuery, setProdutoQuery] = useState(item.produtoNome);
  const [produtoSuggestions, setProdutoSuggestions] = useState<{
    id: number;
    nome: string;
    valorVenda?: number;
    custoPadrao?: number;
  }[]>([]);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Autocomplete de produtos
  useEffect(() => {
    if (produtoQuery.length < 2) {
      setProdutoSuggestions([]);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/vendas/autocomplete/produtos?q=${encodeURIComponent(produtoQuery)}`
        );
        const data = await res.json();
        setProdutoSuggestions(data || []);
      } catch (error) {
        console.error("Erro ao buscar produtos:", error);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [produtoQuery]);

  const handleProdutoSelect = (p: {
    nome: string;
    valorVenda?: number;
    custoPadrao?: number;
  }) => {
    setProdutoQuery(p.nome);
    setProdutoSuggestions([]);

    const newItem: ProdutoItem = {
      ...item,
      produtoNome: p.nome,
      custoProduto: p.custoPadrao || item.custoProduto,
      valorVenda: p.valorVenda || item.valorVenda,
      subtotal: (p.valorVenda || item.valorVenda) * item.quantidade,
    };
    onUpdate(index, newItem);
  };

  const handleChange = (field: keyof ProdutoItem, value: number | string) => {
    const newItem = { ...item, [field]: value };

    // Recalcular subtotal
    if (field === "quantidade" || field === "valorVenda") {
      newItem.subtotal = newItem.quantidade * newItem.valorVenda;
    }

    onUpdate(index, newItem);
  };

  const lucro = (item.valorVenda * item.quantidade) - (item.custoProduto * item.quantidade);
  const margem = item.valorVenda > 0 ? (lucro / (item.valorVenda * item.quantidade)) * 100 : 0;

  return (
    <Card variant="elevated" className="relative overflow-visible border-primary/20 transition-all hover:border-primary/40">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Produto #{index + 1}
              </div>
            </div>
          </div>
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemove(index)}
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Produto Nome */}
          <div className="space-y-2 relative lg:col-span-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Produto
            </Label>
            <Input
              value={produtoQuery}
              onChange={(e) => setProdutoQuery(e.target.value)}
              placeholder="Digite o nome do produto"
              required
            />
            {produtoSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {produtoSuggestions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProdutoSelect(p)}
                    className="w-full px-3 py-2 text-left hover:bg-accent transition-colors cursor-pointer text-sm"
                  >
                    <div className="font-medium">{p.nome}</div>
                    {p.valorVenda && (
                      <div className="text-xs text-muted-foreground">
                        {formatBRL(p.valorVenda)}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custo */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Custo Unit.
            </Label>
            <Input
              type="number"
              step="0.01"
              value={item.custoProduto}
              onChange={(e) => handleChange("custoProduto", Number(e.target.value))}
              required
            />
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Valor Unit.
            </Label>
            <Input
              type="number"
              step="0.01"
              value={item.valorVenda}
              onChange={(e) => handleChange("valorVenda", Number(e.target.value))}
              required
            />
          </div>

          {/* Quantidade */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Qtd
            </Label>
            <Input
              type="number"
              min="1"
              value={item.quantidade}
              onChange={(e) => handleChange("quantidade", Number(e.target.value))}
              required
            />
          </div>

          {/* Resumo */}
          <div className="lg:col-span-3 flex items-center gap-4 pt-2 border-t border-border">
            <div className="text-sm">
              <span className="text-muted-foreground">Subtotal: </span>
              <span className="font-bold text-foreground">{formatBRL(item.subtotal)}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Lucro: </span>
              <span className="font-bold text-success">{formatBRL(lucro)}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Margem: </span>
              <span className="font-bold text-info">{margem.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
