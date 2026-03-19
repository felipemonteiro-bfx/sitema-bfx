"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/currency-input";
import { FormSelect } from "@/components/form-select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { Plus, Trash2 } from "lucide-react";

type Produto = { id: number; nome: string; custoPadrao: number | null };
type Fornecedor = { id: number; nome: string };

export function EstoqueEntradaForm({
  produtos,
  fornecedores,
  onEntradaAction,
  onEntradaLoteAction,
}: {
  produtos: Produto[];
  fornecedores: Fornecedor[];
  onEntradaAction: (fd: FormData) => Promise<void>;
  onEntradaLoteAction: (fd: FormData) => Promise<void>;
}) {
  const [temNota, setTemNota] = React.useState(false);
  const [modo, setModo] = React.useState<"unico" | "lote">("unico");
  const [itensLote, setItensLote] = React.useState<Array<{ produtoId: string; quantidade: string; custoUnitario: number }>>([
    { produtoId: "", quantidade: "1", custoUnitario: 0 },
  ]);

  const produtoOptions = produtos.map((p) => ({
    value: String(p.id),
    label: `${p.nome} (Custo: R$ ${(p.custoPadrao ?? 0).toFixed(2)})`,
  }));

  const fornecedorOptions = [
    { value: "", label: "Nenhum" },
    ...fornecedores.map((f) => ({ value: String(f.id), label: f.nome })),
  ];

  const addItemLote = () => {
    setItensLote([...itensLote, { produtoId: "", quantidade: "1", custoUnitario: 0 }]);
  };

  const removeItemLote = (index: number) => {
    if (itensLote.length <= 1) return;
    setItensLote(itensLote.filter((_, i) => i !== index));
  };

  const handleLoteSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const itensFormatted = itensLote
      .filter((i) => i.produtoId && Number(i.quantidade) > 0)
      .map((i) => ({
        produtoId: Number(i.produtoId),
        quantidade: Number(i.quantidade),
        custoUnitario: i.custoUnitario,
      }));
    fd.set("itens", JSON.stringify(itensFormatted));
    fd.set("temNota", temNota ? "true" : "false");
    await onEntradaLoteAction(fd);
    setItensLote([{ produtoId: "", quantidade: "1", custoUnitario: 0 }]);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setModo("unico")}
          className={cn(
            buttonVariants({ variant: modo === "unico" ? "default" : "outline", size: "sm" }),
            modo === "unico" && "bg-blue-900 hover:bg-blue-800"
          )}
        >
          Entrada Unitária
        </button>
        <button
          type="button"
          onClick={() => setModo("lote")}
          className={cn(
            buttonVariants({ variant: modo === "lote" ? "default" : "outline", size: "sm" }),
            modo === "lote" && "bg-blue-900 hover:bg-blue-800"
          )}
        >
          Entrada em Lote
        </button>
      </div>

      <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
        <Switch id="temNota" checked={temNota} onCheckedChange={setTemNota} />
        <Label htmlFor="temNota" className="text-sm font-medium cursor-pointer">
          Compra com Nota Fiscal
        </Label>
      </div>

      {modo === "unico" ? (
        <form action={onEntradaAction} className="grid gap-4">
          <input type="hidden" name="temNota" value={temNota ? "true" : "false"} />
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground">Produto</div>
              <FormSelect
                name="produtoId"
                options={produtoOptions}
                placeholder="Selecione o produto"
                searchPlaceholder="Buscar produto..."
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground">Quantidade</div>
              <Input name="quantidade" type="number" min="1" defaultValue="1" />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground">Custo Unitário</div>
              <CurrencyInput name="custoUnitario" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground">Fornecedor</div>
              <FormSelect
                name="fornecedorId"
                options={fornecedorOptions}
                placeholder="Selecione (opcional)"
                searchPlaceholder="Buscar fornecedor..."
              />
            </div>
          </div>
          {temNota && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Número da Nota Fiscal</div>
                <Input name="notaFiscal" placeholder="Ex: NF-e 001234" />
              </div>
            </div>
          )}
          <div className="space-y-1">
            <div className="text-xs font-semibold text-muted-foreground">Observação</div>
            <Input name="observacao" placeholder="Observação (opcional)" />
          </div>
          <div className="flex items-center justify-end">
            <button className={cn(buttonVariants(), "bg-emerald-700 hover:bg-emerald-600 cursor-pointer")}>
              Registrar Entrada
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleLoteSubmit} className="grid gap-4">
          <input type="hidden" name="temNota" value={temNota ? "true" : "false"} />
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground">Fornecedor</div>
              <FormSelect
                name="fornecedorId"
                options={fornecedorOptions}
                placeholder="Selecione (opcional)"
                searchPlaceholder="Buscar fornecedor..."
              />
            </div>
            {temNota && (
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Número da Nota Fiscal</div>
                <Input name="notaFiscal" placeholder="Ex: NF-e 001234" />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted-foreground">Itens</div>
            {itensLote.map((item, index) => (
              <div key={index} className="grid gap-3 md:grid-cols-[1fr_100px_150px_40px] items-end p-3 rounded-lg border border-border bg-muted/20">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Produto</div>
                  <FormSelect
                    name={`lote_produto_${index}`}
                    options={produtoOptions}
                    placeholder="Selecione"
                    searchPlaceholder="Buscar..."
                    value={item.produtoId}
                    onValueChange={(val) => {
                      const newItens = [...itensLote];
                      newItens[index].produtoId = val;
                      const p = produtos.find((p) => String(p.id) === val);
                      if (p?.custoPadrao) newItens[index].custoUnitario = p.custoPadrao;
                      setItensLote(newItens);
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Qtd</div>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantidade}
                    onChange={(e) => {
                      const newItens = [...itensLote];
                      newItens[index].quantidade = e.target.value;
                      setItensLote(newItens);
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Custo Unit.</div>
                  <CurrencyInput
                    value={item.custoUnitario}
                    onChange={(val) => {
                      const newItens = [...itensLote];
                      newItens[index].custoUnitario = val;
                      setItensLote(newItens);
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeItemLote(index)}
                  className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-10 w-10 text-destructive hover:text-destructive")}
                  disabled={itensLote.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addItemLote}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}
            >
              <Plus className="h-4 w-4" />
              Adicionar Item
            </button>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-muted-foreground">Observação</div>
            <Input name="observacao" placeholder="Observação (opcional)" />
          </div>
          <div className="flex items-center justify-end">
            <button type="submit" className={cn(buttonVariants(), "bg-emerald-700 hover:bg-emerald-600 cursor-pointer")}>
              Registrar Entrada em Lote
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
