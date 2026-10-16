"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
        "relative overflow-visible",
        (produtoSuggestions.length > 0 || showDropdown) && "z-10",
        hasError && "border-destructive border-2",
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <div className="text-sm font-semibold text-foreground">
              Produto #{index + 1}
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
                    className="h-8 w-8 text-error-text hover:text-error-text"
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

        {/* TRES ZONAS, nao um grid unico. Antes, campos de entrada e blocos de
            resultado eram filhos do mesmo `md:grid-cols-2 lg:grid-cols-4` e
            disputavam coluna entre si. Medido em navegador com as classes dos
            dois layouts na caixa real da tela — `(app)/layout.tsx` com
            `max-w-[1600px] gap-6 px-3 lg:px-6`, `aside w-72`, `main` com borda e
            `px-4 lg:px-8`, mais o Card e o `CardContent p-4`:
            — em 1440px o resultado ocupava 3 das 4 colunas, entao a regua
              NASCIA 248px a direita do campo Produto e cobria 72% do card — uma
              linha que comeca no meio do nada, ao lado do Qtd, em vez de separar
              entrada de resultado. Em 1024px, 144px de deslocamento. E o Qtd
              ficava orfao numa linha de quatro colunas.
            — em 768px, o pior caso, o `lg:col-span-3` nao valia: os tres blocos
              caiam em UMA coluna, a regua cobria 49% do card (332px de 676px) e
              cada tile ficava com 102,7px — Subtotal e Lucro em 40px de altura,
              DUAS linhas, com metade do card vazia ao lado.
            A causa era conceitual: numero derivado nao e campo de formulario, e
            estava competindo por coluna com o Custo e o Valor.
            Hoje, medido no mesmo mockup: a regua cobre 100% do conteudo do card
            em 390, 768, 1024 e 1440, e nenhum valor quebra em duas linhas. */}
        <div className="space-y-3">
          {/* Zonas 1 e 2 — identificacao e precificacao, na MESMA linha a partir
              de `xl` (medido em 1280 e 1440: os quatro campos com o mesmo `top`).
              `xl` e nao `lg`, e isto e medida, nao gosto: em 1024px o card tem
              598px, e com a fusao valendo ali a coluna de moeda caia para
              102,4px — 46,4px de area de texto depois do `border-2`, do `pl-10`
              do prefixo "R$" e do `px-3`. "12.500,00" mede 67,2px: o campo
              truncava o proprio valor, sem sinal visual nenhum, e num ponto em
              que o layout antigo ainda cabia (76px). Com a fusao em `xl`, 1024px
              da 124px de texto e 1280px da 97,6px. */}
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
            {/* Produto Nome */}
            <div className="space-y-2 relative min-w-0 xl:basis-2/5">
              <Label
                htmlFor={`produto-nome-${index}`}
                className={cn(hasError && "text-error-text")}
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
                <div role="listbox" className="absolute top-full left-0 right-0 z-[100] mt-1 bg-popover border border-painel-borda rounded-interno shadow-sm max-h-56 overflow-y-auto">
                  {produtoSuggestions.map((p) => (
                    <Button
                      key={p.id}
                      type="button"
                      variant="ghost"
                      role="option"
                      aria-selected={false}
                      onClick={() => handleProdutoSelect(p)}
                      className="h-auto w-full flex-col items-stretch justify-start gap-0 whitespace-normal rounded-none px-3 py-2 text-left font-normal"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{p.nome}</span>
                      </div>
                      {p.valorVenda && (
                        <div className="text-xs text-muted-foreground valor-sensivel">
                          {formatBRL(p.valorVenda)}
                        </div>
                      )}
                    </Button>
                  ))}
                  {produtoSuggestions.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      Nenhum produto encontrado
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setProdutoSuggestions([]);
                      setIsSearching(false);
                      setCadastrarOpen(true);
                    }}
                    className="h-auto w-full justify-start gap-2 whitespace-normal rounded-none border-t border-border px-3 py-2 text-left font-medium text-primary hover:text-primary"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    Cadastrar &ldquo;{produtoQuery}&rdquo;
                  </Button>
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

            {/* Custo, Valor e Qtd sao a mesma natureza — numerico curto — e por
                isso ficam na MESMA linha a partir de 640px. Abaixo disso, o par de
                moeda divide a linha (~157px cada, folga para "R$ 12.500,00") e o
                Qtd fica embaixo em largura cheia: e o campo que mais recebe toque,
                e ganha o maior alvo em vez de sobrar meia celula vazia.
                Os tres rotulos ganharam `htmlFor`: sem ele o clique no rotulo nao
                move o foco e o campo nao tem nome para leitor de tela (os dois de
                moeda nao tinham nem `aria-label`). O `aria-label` comeca pelo
                texto visivel do rotulo — exigencia de rotulo-no-nome (WCAG
                2.5.3) — e completa com o numero do item, que e o que distingue um
                "Qtd" do "Qtd" do produto seguinte. */}
            <div className="grid grid-cols-2 gap-3 min-w-0 sm:grid-cols-3 xl:basis-3/5">
              <div className="space-y-2">
                <Label
                  htmlFor={`custo-produto-${index}`}
                >
                  Custo Unit.
                </Label>
                <CurrencyInput
                  id={`custo-produto-${index}`}
                  value={item.custoProduto}
                  onChange={(v) => handleChange("custoProduto", v)}
                  aria-label={`Custo unit. do produto ${index + 1}`}
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor={`valor-venda-${index}`}
                >
                  Valor Unit.
                </Label>
                <CurrencyInput
                  id={`valor-venda-${index}`}
                  value={item.valorVenda}
                  onChange={(v) => handleChange("valorVenda", v)}
                  aria-label={`Valor unit. do produto ${index + 1}`}
                />
              </div>

              <div className="col-span-2 space-y-2 sm:col-span-1">
                <Label
                  htmlFor={`quantidade-${index}`}
                >
                  Qtd
                </Label>
                <Input
                  id={`quantidade-${index}`}
                  type="number"
                  min="1"
                  value={item.quantidade}
                  onChange={(e) => handleChange("quantidade", Number(e.target.value))}
                  required
                  aria-label={`Qtd do produto ${index + 1}`}
                />
              </div>
            </div>
          </div>

          {/* Zona 3 — RESULTADO, em largura cheia do card: a regua atravessa o
              card inteiro, que e o que ela precisa fazer para separar entrada de
              resultado.
              `grid-cols-1 sm:grid-cols-3` e a MESMA declaracao do "Limite e
              Margem" 250px acima nesta tela, e e ela que mata o truncamento: o
              antigo `grid-cols-3` valia em TODA largura, entao em 390px cada
              bloco ficava com ~107px e o valor quebrava em duas linhas. Empilhado
              em coluna unica o bloco tem os ~322px do card inteiro, folga de
              sobra para um valor de ~90px.
              Nao vira linha rotulo/valor abaixo de sm: nenhum bloco de metrica do
              BFX troca de eixo por breakpoint — nem "Limite e Margem" e "Resumo
              Financeiro" nesta tela, nem o DRE, o historico ou o CardStats do
              dashboard. Trocar o eixo aqui criaria a TERCEIRA lingua para numero
              derivado na mesma tela — o defeito que esta correcao existe para
              tirar. */}
          <div className="pt-3 border-t border-border">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Vantage: os tres blocos de resultado sao cards neutros (poco). Cor so onde ha
                  estado real: lucro negativo em `text-error-text` e a faixa da margem num Badge,
                  como no Dashboard e no Historico (`>= 20` bom, `>= 10` atencao, abaixo ruim). */}
              <div className="rounded-interno bg-poco px-3 py-2 text-center">
                <div className="text-xs font-medium text-muted-foreground">Subtotal</div>
                <div className="text-sm font-semibold tabular-nums text-foreground valor-sensivel">{formatBRL(item.subtotal)}</div>
              </div>
              <div className="rounded-interno bg-poco px-3 py-2 text-center">
                <div className="text-xs font-medium text-muted-foreground">Lucro</div>
                <div className={cn("text-sm font-semibold tabular-nums valor-sensivel", lucro < 0 ? "text-error-text" : "text-foreground")}>{formatBRL(lucro)}</div>
              </div>
              <div className="rounded-interno bg-poco px-3 py-2 text-center">
                <div className="text-xs font-medium text-muted-foreground">Margem</div>
                <Badge
                  variant={margem >= 20 ? "success" : margem >= 10 ? "warning" : "error"}
                  className="mt-0.5 tabular-nums valor-sensivel"
                >
                  {margem.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
