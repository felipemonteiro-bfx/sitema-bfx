"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { X, Package, AlertTriangle, Plus } from "lucide-react";
import { formatBRL, cn } from "@/lib/utils";
import { CurrencyInput } from "@/components/currency-input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CadastrarProdutoRapidoDialog } from "@/components/cadastrar-produto-rapido-dialog";

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
  hasError?: boolean;
}

export function ProdutoItemForm({ item, index, onUpdate, onRemove, canRemove, hasError }: Props) {
  const [produtoQuery, setProdutoQuery] = useState(item.produtoNome);
  const [produtoSuggestions, setProdutoSuggestions] = useState<{
    id: number;
    nome: string;
    valorVenda?: number;
    custoPadrao?: number;
    qtdEstoque?: number | null;
  }[]>([]);
  const [estoqueDisponivel, setEstoqueDisponivel] = useState<number | null>(null);
  const [cadastrarOpen, setCadastrarOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const showDropdown = isSearching && produtoQuery.length >= 2;

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
    qtdEstoque?: number | null;
  }) => {
    setProdutoQuery(p.nome);
    setProdutoSuggestions([]);
    setIsSearching(false);
    setEstoqueDisponivel(p.qtdEstoque ?? null);

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
    let newItem = { ...item, [field]: value };

    // Limitar quantidade ao estoque disponível
    if (field === "quantidade" && estoqueDisponivel !== null && estoqueDisponivel > 0) {
      const qtd = Math.min(Number(value), estoqueDisponivel);
      newItem = { ...newItem, quantidade: qtd };
    }

    // Recalcular subtotal
    if (field === "quantidade" || field === "valorVenda") {
      newItem.subtotal = newItem.quantidade * newItem.valorVenda;
    }

    onUpdate(index, newItem);
  };

  const lucro = (item.valorVenda * item.quantidade) - (item.custoProduto * item.quantidade);
  const margem = item.valorVenda > 0 ? (lucro / (item.valorVenda * item.quantidade)) * 100 : 0;
  const semEstoque = estoqueDisponivel !== null && estoqueDisponivel <= 0;

  return (
    <Card
      variant="elevated"
      className={cn(
        "relative overflow-visible border-primary/20 transition-all hover:border-primary/40",
        (produtoSuggestions.length > 0 || showDropdown) && "z-10",
        hasError && "border-destructive border-2",
      )}
    >
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(index)}
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    aria-label="Remover produto"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Remover produto</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Produto Nome */}
          <div className="space-y-2 relative lg:col-span-2">
            <div className="flex items-center justify-between">
              <Label
                className={cn(
                  "text-xs font-bold uppercase tracking-wider",
                  hasError ? "text-destructive" : "text-muted-foreground",
                )}
              >
                Produto {hasError && "(obrigatório)"}
              </Label>
              {estoqueDisponivel !== null && (
                <span
                  className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded",
                    semEstoque
                      ? "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400"
                      : estoqueDisponivel <= 5
                      ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                      : "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                  )}
                >
                  {semEstoque ? "Sem estoque" : `Estoque: ${estoqueDisponivel}`}
                </span>
              )}
            </div>
            <Input
              value={produtoQuery}
              onChange={(e) => {
                setProdutoQuery(e.target.value);
                setEstoqueDisponivel(null);
                setIsSearching(true);
              }}
              placeholder="Digite o nome do produto"
              required
              className={hasError ? "border-destructive border-2" : ""}
            />
            {showDropdown && (produtoSuggestions.length > 0 || true) && (
              <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-popover border border-border rounded-lg shadow-xl max-h-56 overflow-y-auto">
                {produtoSuggestions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProdutoSelect(p)}
                    className="w-full px-3 py-2 text-left hover:bg-accent transition-colors cursor-pointer text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{p.nome}</span>
                      {p.qtdEstoque !== undefined && p.qtdEstoque !== null && (
                        <span
                          className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded ml-2 shrink-0",
                            p.qtdEstoque <= 0
                              ? "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400"
                              : p.qtdEstoque <= 5
                              ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                              : "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                          )}
                        >
                          {p.qtdEstoque <= 0 ? "Sem estoque" : `${p.qtdEstoque} un`}
                        </span>
                      )}
                    </div>
                    {p.valorVenda && (
                      <div className="text-xs text-muted-foreground">
                        {formatBRL(p.valorVenda)}
                      </div>
                    )}
                  </button>
                ))}
                {produtoSuggestions.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Nenhum produto encontrado
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setProdutoSuggestions([]);
                    setIsSearching(false);
                    setCadastrarOpen(true);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-primary/10 transition-colors cursor-pointer text-sm border-t border-border flex items-center gap-2 text-primary font-medium"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  Cadastrar &ldquo;{produtoQuery}&rdquo;
                </button>
              </div>
            )}
            <CadastrarProdutoRapidoDialog
              open={cadastrarOpen}
              onOpenChange={setCadastrarOpen}
              nomeInicial={produtoQuery}
              onCriado={(p) => handleProdutoSelect({ nome: p.nome, valorVenda: p.valorVenda, custoPadrao: p.custoPadrao, qtdEstoque: p.qtdEstoque })}
            />
          </div>

          {/* Custo */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Custo Unit.
            </Label>
            <CurrencyInput
              value={item.custoProduto}
              onChange={(v) => handleChange("custoProduto", v)}
            />
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Valor Unit.
            </Label>
            <CurrencyInput
              value={item.valorVenda}
              onChange={(v) => handleChange("valorVenda", v)}
            />
          </div>

          {/* Quantidade */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Qtd {estoqueDisponivel !== null && estoqueDisponivel > 0 && (
                <span className="text-muted-foreground font-normal">/ {estoqueDisponivel}</span>
              )}
            </Label>
            <Input
              type="number"
              min="1"
              max={estoqueDisponivel !== null && estoqueDisponivel > 0 ? estoqueDisponivel : undefined}
              value={item.quantidade}
              onChange={(e) => handleChange("quantidade", Number(e.target.value))}
              required
            />
          </div>

          {/* Resumo */}
          <div className="lg:col-span-3 flex flex-wrap items-center gap-4 pt-2 border-t border-border">
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
            {semEstoque && (
              <div className="flex items-center gap-1.5 text-xs text-red-700 dark:text-red-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Produto sem estoque disponível
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
