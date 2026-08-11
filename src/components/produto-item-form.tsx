"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { X, Package, Plus } from "lucide-react";
import { formatBRL, cn } from "@/lib/utils";
import { CurrencyInput } from "@/components/currency-input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CadastrarProdutoRapidoDialog } from "@/components/cadastrar-produto-rapido-dialog";
import { aplicarTetoQuantidade } from "@/lib/estoque-venda-policy";

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
  fornecedores?: { id: number; nome: string }[];
  categoriasExistentes?: string[];
}

export function ProdutoItemForm({ item, index, onUpdate, onRemove, canRemove, hasError, fornecedores = [], categoriasExistentes = [] }: Props) {
  const [produtoQuery, setProdutoQuery] = useState(item.produtoNome);
  const [produtoSuggestions, setProdutoSuggestions] = useState<{
    id: number;
    nome: string;
    valorVenda?: number;
    custoPadrao?: number;
    qtdEstoque?: number | null;
  }[]>([]);
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

    const newItem: ProdutoItem = {
      ...item,
      produtoNome: p.nome,
      custoProduto: p.custoPadrao || item.custoProduto,
      valorVenda: p.valorVenda || item.valorVenda,
      subtotal: (p.valorVenda || item.valorVenda) * item.quantidade,
    };
    onUpdate(index, newItem);
  };

  const handleChange = useCallback((field: keyof ProdutoItem, value: number | string) => {
    let newItem = { ...item, [field]: value };

    // UXP-02, D-03: sem teto de quantidade baseado em estoque disponivel.
    if (field === "quantidade") {
      newItem = { ...newItem, quantidade: aplicarTetoQuantidade(Number(value)) };
    }

    // Recalcular subtotal
    if (field === "quantidade" || field === "valorVenda") {
      newItem.subtotal = newItem.quantidade * newItem.valorVenda;
    }

    onUpdate(index, newItem);
  }, [item, onUpdate, index]);

  const { lucro, margem } = useMemo(() => {
    const l = (item.valorVenda - item.custoProduto) * item.quantidade;
    const m = item.valorVenda > 0 ? ((item.valorVenda - item.custoProduto) / item.valorVenda) * 100 : 0;
    return { lucro: l, margem: m };
  }, [item.valorVenda, item.custoProduto, item.quantidade]);

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
                    className="h-8 w-8 text-error-text hover:text-error-text hover:bg-destructive/10"
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
            <Label
              htmlFor={`produto-nome-${index}`}
              className={cn(
                "text-xs font-bold uppercase tracking-wider",
                hasError ? "text-error-text" : "text-muted-foreground",
              )}
            >
              Produto <span className="text-error-text">*</span> {hasError && "(obrigatório)"}
            </Label>
            <Input
              id={`produto-nome-${index}`}
              value={produtoQuery}
              onChange={(e) => {
                const nome = e.target.value;
                setProdutoQuery(nome);
                setIsSearching(true);
                // Propaga o nome digitado para o item do pai — sem isso, um produto
                // digitado mas nao selecionado no dropdown fica com produtoNome vazio
                // e e descartado no envio ("some e nao contabiliza").
                onUpdate(index, { ...item, produtoNome: nome });
              }}
              placeholder="Digite o nome do produto"
              required
              aria-required="true"
              className={hasError ? "border-destructive border-2" : ""}
            />
            {showDropdown && produtoSuggestions.length > 0 && (
              <div role="listbox" className="absolute top-full left-0 right-0 z-[100] mt-1 bg-popover border border-border rounded-lg shadow-xl max-h-56 overflow-y-auto">
                {produtoSuggestions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => handleProdutoSelect(p)}
                    className="w-full px-3 py-2 text-left hover:bg-accent transition-colors cursor-pointer text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{p.nome}</span>
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
              fornecedores={fornecedores}
              categoriasExistentes={categoriasExistentes}
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
              Qtd
            </Label>
            <Input
              type="number"
              min="1"
              value={item.quantidade}
              onChange={(e) => handleChange("quantidade", Number(e.target.value))}
              required
              aria-label={`Quantidade do produto ${index + 1}`}
            />
          </div>

          {/* Resumo */}
          <div className="lg:col-span-3 pt-3 border-t border-border space-y-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted/30 px-3 py-2 text-center">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Subtotal</div>
                <div className="text-sm font-bold text-foreground">{formatBRL(item.subtotal)}</div>
              </div>
              {/* Tint OPACO (`bg-<sem>-bg`), nao o composto `bg-<sem>/5`: este
                  Card fica dentro do card elevado de /venda-rapida, e o
                  composto some 5% da matiz nessa superficie ja mais escura. Os
                  quatro textos daqui reprovavam por isso — rotulo a 4.39 e 4.32,
                  valor a 4.47 e 4.43. Mesma decisao dos tiles do "Resumo
                  Financeiro", logo abaixo nesta mesma tela. */}
              <div className="rounded-lg bg-success-bg px-3 py-2 text-center">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Lucro</div>
                <div className="text-sm font-bold text-success-text">{formatBRL(lucro)}</div>
              </div>
              <div className="rounded-lg bg-info-bg px-3 py-2 text-center">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Margem</div>
                <div className="text-sm font-bold text-info-text">{margem.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
